import { useState, useEffect } from 'react';
import { Tag, Search, Filter, Download, Plus, Eye, Edit, Trash, Calendar, Clock, DollarSign, Users, BarChart, CheckCircle, XCircle, Percent, Gift, Award, Target, ArrowRight, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: 'offer' | 'survey' | 'study';
  reward_amount: number;
  expires_at: string;
  status: 'active' | 'expired' | 'cancelled';
  partner_id: string | null;
  terms_conditions: string | null;
  created_at: string;
  target_audience?: 'all' | 'new_members' | 'existing_members' | 'specific_group';
  redemption_limit?: number;
  redemptions_used?: number;
  service_id?: string | null;
}

interface PromotionClaim {
  id: string;
  profile_id: string;
  promotion_id: string;
  claimed_at: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  user_name?: string;
  user_email?: string;
}

interface Service {
  id: string;
  name: string;
  category: string;
}

interface PromotionStats {
  total_claims: number;
  approved_claims: number;
  rejected_claims: number;
  conversion_rate: number;
  revenue_impact: number;
}

interface TargetGroup {
  id: string;
  name: string;
  description: string;
  member_count: number;
}

export default function PromotionManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | 'claims' | 'stats'>('view');
  const [promotionClaims, setPromotionClaims] = useState<PromotionClaim[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [targetGroups, setTargetGroups] = useState<TargetGroup[]>([]);
  const [promotionStats, setPromotionStats] = useState<PromotionStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'quarter' | 'all'>('month');

  useEffect(() => {
    loadPromotions();
    loadServices();
    loadTargetGroups();
  }, []);

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select(`
          *,
          partner:partners(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPromotions(data || []);
    } catch (error) {
      console.error('Error loading promotions:', error);
      toast.error('Failed to load promotions');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, category')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const loadTargetGroups = async () => {
    // In a real app, this would fetch from a target_groups table
    // For this demo, we'll use mock data
    setTargetGroups([
      {
        id: '1',
        name: 'New Members',
        description: 'Members who joined in the last 30 days',
        member_count: 124
      },
      {
        id: '2',
        name: 'High-Value Members',
        description: 'Members with premium subscriptions',
        member_count: 87
      },
      {
        id: '3',
        name: 'Wellness Enthusiasts',
        description: 'Members interested in wellness services',
        member_count: 215
      },
      {
        id: '4',
        name: 'Inactive Members',
        description: 'Members with no activity in 60+ days',
        member_count: 156
      }
    ]);
  };

  const loadPromotionClaims = async (promotionId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotion_claims')
        .select(`
          *,
          profile:profiles(full_name, email)
        `)
        .eq('promotion_id', promotionId)
        .order('claimed_at', { ascending: false });
      
      if (error) throw error;
      
      // Transform data to include user info
      const transformedData = data?.map(claim => ({
        ...claim,
        user_name: claim.profile?.full_name || 'Unknown',
        user_email: claim.profile?.email || 'Unknown'
      })) || [];
      
      setPromotionClaims(transformedData);
    } catch (error) {
      console.error('Error loading promotion claims:', error);
      toast.error('Failed to load promotion claims');
    } finally {
      setLoading(false);
    }
  };

  const loadPromotionStats = async (promotionId: string) => {
    try {
      setLoading(true);
      
      // Get claims data
      const { data: claimsData, error: claimsError } = await supabase
        .from('promotion_claims')
        .select('status')
        .eq('promotion_id', promotionId);
      
      if (claimsError) throw claimsError;
      
      const totalClaims = claimsData?.length || 0;
      const approvedClaims = claimsData?.filter(c => c.status === 'approved' || c.status === 'completed').length || 0;
      const rejectedClaims = claimsData?.filter(c => c.status === 'rejected').length || 0;
      const conversionRate = totalClaims > 0 ? (approvedClaims / totalClaims) * 100 : 0;
      
      // For revenue impact, we'll use a placeholder calculation
      // In a real app, this would be calculated from actual transaction data
      const selectedPromoReward = selectedPromotion?.reward_amount || 0;
      const revenueImpact = approvedClaims * (selectedPromoReward * 2.5); // Assuming each claim generates 2.5x the reward in revenue
      
      setPromotionStats({
        total_claims: totalClaims,
        approved_claims: approvedClaims,
        rejected_claims: rejectedClaims,
        conversion_rate: conversionRate,
        revenue_impact: revenueImpact
      });
    } catch (error) {
      console.error('Error loading promotion stats:', error);
      toast.error('Failed to load promotion statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setModalMode('delete');
    setShowModal(true);
  };

  const handleViewClaims = async (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    await loadPromotionClaims(promotion.id);
    setModalMode('claims');
    setShowModal(true);
  };

  const handleViewStats = async (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    await loadPromotionStats(promotion.id);
    setModalMode('stats');
    setShowModal(true);
  };

  const handleAddPromotion = () => {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // Default expiry 30 days from now
    
    setSelectedPromotion({
      id: '',
      title: '',
      description: '',
      type: 'offer',
      reward_amount: 0,
      expires_at: expiryDate.toISOString(),
      status: 'active',
      partner_id: null,
      terms_conditions: null,
      created_at: new Date().toISOString(),
      target_audience: 'all',
      redemption_limit: 0,
      redemptions_used: 0,
      service_id: null
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSavePromotion = async () => {
    if (!selectedPromotion) return;

    try {
      setLoading(true);
      
      if (selectedPromotion.id) {
        // Update existing promotion
        const { error } = await supabase
          .from('promotions')
          .update({
            title: selectedPromotion.title,
            description: selectedPromotion.description,
            type: selectedPromotion.type,
            reward_amount: selectedPromotion.reward_amount,
            expires_at: selectedPromotion.expires_at,
            status: selectedPromotion.status,
            partner_id: selectedPromotion.partner_id,
            terms_conditions: selectedPromotion.terms_conditions,
            service_id: selectedPromotion.service_id
          })
          .eq('id', selectedPromotion.id);
        
        if (error) throw error;
        toast.success('Promotion updated successfully');
      } else {
        // Create new promotion
        const { error } = await supabase
          .from('promotions')
          .insert([{
            title: selectedPromotion.title,
            description: selectedPromotion.description,
            type: selectedPromotion.type,
            reward_amount: selectedPromotion.reward_amount,
            expires_at: selectedPromotion.expires_at,
            status: selectedPromotion.status,
            partner_id: selectedPromotion.partner_id,
            terms_conditions: selectedPromotion.terms_conditions,
            service_id: selectedPromotion.service_id
          }]);
        
        if (error) throw error;
        toast.success('Promotion created successfully');
      }
      
      setShowModal(false);
      loadPromotions();
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast.error('Failed to save promotion');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPromotion) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('promotions')
        .update({ status: 'cancelled' })
        .eq('id', selectedPromotion.id);
      
      if (error) throw error;
      
      toast.success('Promotion cancelled successfully');
      setShowModal(false);
      loadPromotions();
    } catch (error) {
      console.error('Error cancelling promotion:', error);
      toast.error('Failed to cancel promotion');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateClaimStatus = async (claimId: string, newStatus: 'approved' | 'rejected' | 'completed') => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('promotion_claims')
        .update({ status: newStatus })
        .eq('id', claimId);
      
      if (error) throw error;
      
      toast.success(`Claim ${newStatus} successfully`);
      
      // Update local state
      setPromotionClaims(promotionClaims.map(claim => 
        claim.id === claimId ? { ...claim, status: newStatus } : claim
      ));
    } catch (error) {
      console.error('Error updating claim status:', error);
      toast.error('Failed to update claim status');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilter = (filters: Record<string, string>) => {
    setTypeFilter(filters.type || '');
    setStatusFilter(filters.status || '');
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'offer':
        return 'bg-green-100 text-green-800';
      case 'survey':
        return 'bg-blue-100 text-blue-800';
      case 'study':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'expired':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getClaimStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPromotions = promotions.filter(promotion => {
    const matchesSearch = 
      promotion.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      promotion.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !typeFilter || promotion.type === typeFilter;
    const matchesStatus = !statusFilter || promotion.status === statusFilter;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const columns = [
    {
      key: 'title',
      header: 'Promotion',
      render: (value: string, row: Promotion) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
            {row.type === 'offer' ? (
              <Tag className="h-5 w-5 text-navy-600" />
            ) : row.type === 'survey' ? (
              <Award className="h-5 w-5 text-navy-600" />
            ) : (
              <Gift className="h-5 w-5 text-navy-600" />
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-navy-900">{value}</div>
            <div className="text-sm text-navy-500 truncate max-w-xs">{row.description.substring(0, 50)}{row.description.length > 50 ? '...' : ''}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'reward_amount',
      header: 'Reward',
      render: (value: number) => (
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
          <span className="font-medium">{value.toFixed(2)}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'expires_at',
      header: 'Expires',
      render: (value: string) => {
        const expiryDate = new Date(value);
        const now = new Date();
        const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-700">{new Date(value).toLocaleDateString()}</span>
            {daysLeft > 0 && (
              <span className="text-xs text-gray-500">{daysLeft} days left</span>
            )}
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'partner',
      header: 'Partner',
      render: (value: any) => (
        <span className="text-sm text-gray-700">{value?.name || 'N/A'}</span>
      ),
      sortable: false
    }
  ];

  const filterOptions = [
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'offer', label: 'Offer' },
        { value: 'survey', label: 'Survey' },
        { value: 'study', label: 'Study' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'expired', label: 'Expired' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  ];

  // Calculate promotion performance metrics
  const activePromotions = promotions.filter(p => p.status === 'active').length;
  const totalClaims = promotions.reduce((sum, p) => sum + (p.redemptions_used || 0), 0);
  const averageReward = promotions.length > 0 
    ? promotions.reduce((sum, p) => sum + p.reward_amount, 0) / promotions.length 
    : 0;
  const expiringPromotions = promotions.filter(p => {
    const expiryDate = new Date(p.expires_at);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return p.status === 'active' && daysLeft <= 7;
  }).length;

  return (
    <>
      {/* Promotion Stats Overview */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <Tag className="h-5 w-5 mr-2 text-gold-500" />
              Promotion Overview
            </h2>
            <p className="text-navy-600 text-sm">
              Create and manage time-limited promotions and special offers
            </p>
          </div>
          <Button
            variant="luxury"
            onClick={handleAddPromotion}
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New Promotion
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Active Promotions</div>
              <div className="text-xl font-bold text-navy-900">{activePromotions}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Claims</div>
              <div className="text-xl font-bold text-navy-900">{totalClaims}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Average Reward</div>
              <div className="text-xl font-bold text-navy-900">${averageReward.toFixed(2)}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Expiring Soon</div>
              <div className="text-xl font-bold text-navy-900">{expiringPromotions}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <h2 className="text-xl font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={handleAddPromotion}
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Promotion
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Importing promotions...')}
          >
            <Download className="h-5 w-5 mr-2" />
            Import Promotions
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Generating report...')}
          >
            <BarChart className="h-5 w-5 mr-2" />
            Performance Report
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Bulk update initiated...')}
          >
            <Target className="h-5 w-5 mr-2" />
            Manage Audiences
          </Button>
        </div>
      </div>

      {/* Promotion Table */}
      <DataTable
        columns={columns}
        data={filteredPromotions}
        title="Promotion Management"
        subtitle="Create time-limited promotions, assign to services or groups, and track performance"
        searchPlaceholder="Search promotions..."
        onSearch={handleSearch}
        onFilter={handleFilter}
        onExport={() => toast.success('Exporting promotion data')}
        onView={handleViewPromotion}
        onEdit={handleEditPromotion}
        onDelete={handleDeletePromotion}
        onAdd={handleAddPromotion}
        addButtonText="Create Promotion"
        filterOptions={filterOptions}
        extraActions={[
          {
            icon: <Users className="h-4 w-4" />,
            label: "View Claims",
            onClick: handleViewClaims
          },
          {
            icon: <BarChart className="h-4 w-4" />,
            label: "View Stats",
            onClick: handleViewStats
          }
        ]}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'view' ? 'Promotion Details' : 
               modalMode === 'edit' ? (selectedPromotion?.id ? 'Edit Promotion' : 'Create Promotion') : 
               modalMode === 'delete' ? 'Cancel Promotion' :
               modalMode === 'claims' ? 'Promotion Claims' :
               'Promotion Statistics'}
            </h3>
            
            {modalMode === 'view' && selectedPromotion && (
              <div className="space-y-6">
                {/* Promotion Details */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <Tag className="h-5 w-5 mr-2 text-navy-600" />
                    Promotion Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedPromotion.title}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Type</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(selectedPromotion.type)}`}>
                          {selectedPromotion.type.charAt(0).toUpperCase() + selectedPromotion.type.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reward Amount</label>
                      <div className="mt-1 p-2 bg-white rounded-md">${selectedPromotion.reward_amount.toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{new Date(selectedPromotion.expires_at).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedPromotion.status)}`}>
                          {selectedPromotion.status.charAt(0).toUpperCase() + selectedPromotion.status.slice(1)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {new Date(selectedPromotion.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Partner</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {selectedPromotion.partner?.name || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {selectedPromotion.target_audience 
                          ? selectedPromotion.target_audience.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          : 'All Members'}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <div className="mt-1 p-2 bg-white rounded-md">{selectedPromotion.description}</div>
                  </div>
                  {selectedPromotion.terms_conditions && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedPromotion.terms_conditions}</div>
                    </div>
                  )}
                </div>

                {/* Redemption Limits */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-navy-600" />
                    Redemption Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Redemption Limit</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {selectedPromotion.redemption_limit 
                          ? selectedPromotion.redemption_limit 
                          : 'Unlimited'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Redemptions Used</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {selectedPromotion.redemptions_used || 0}
                      </div>
                    </div>
                    {selectedPromotion.redemption_limit && (
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Redemption Progress</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-navy-600 h-2.5 rounded-full" 
                              style={{ 
                                width: `${Math.min(((selectedPromotion.redemptions_used || 0) / selectedPromotion.redemption_limit) * 100, 100)}%` 
                              }}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 text-right">
                            {selectedPromotion.redemptions_used || 0} of {selectedPromotion.redemption_limit} used
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalMode('edit');
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Promotion
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        handleViewClaims(selectedPromotion);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      View Claims
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'edit' && selectedPromotion && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Promotion Title</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedPromotion.title}
                    onChange={(e) => setSelectedPromotion({...selectedPromotion, title: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    rows={3}
                    value={selectedPromotion.description}
                    onChange={(e) => setSelectedPromotion({...selectedPromotion, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Promotion Type</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedPromotion.type}
                      onChange={(e) => setSelectedPromotion({...selectedPromotion, type: e.target.value as any})}
                    >
                      <option value="offer">Offer</option>
                      <option value="survey">Survey</option>
                      <option value="study">Study</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reward Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedPromotion.reward_amount}
                      onChange={(e) => setSelectedPromotion({...selectedPromotion, reward_amount: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiration Date</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={new Date(selectedPromotion.expires_at).toISOString().split('T')[0]}
                      onChange={(e) => setSelectedPromotion({...selectedPromotion, expires_at: new Date(e.target.value).toISOString()})}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedPromotion.status}
                      onChange={(e) => setSelectedPromotion({...selectedPromotion, status: e.target.value as any})}
                    >
                      <option value="active">Active</option>
                      <option value="expired">Expired</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedPromotion.target_audience || 'all'}
                      onChange={(e) => setSelectedPromotion({...selectedPromotion, target_audience: e.target.value as any})}
                    >
                      <option value="all">All Members</option>
                      <option value="new_members">New Members</option>
                      <option value="existing_members">Existing Members</option>
                      <option value="specific_group">Specific Group</option>
                    </select>
                  </div>
                  {selectedPromotion.target_audience === 'specific_group' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Select Group</label>
                      <select
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      >
                        {targetGroups.map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name} ({group.member_count} members)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Redemption Limit</label>
                    <input
                      type="number"
                      min="0"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedPromotion.redemption_limit || 0}
                      onChange={(e) => setSelectedPromotion({...selectedPromotion, redemption_limit: parseInt(e.target.value) || 0})}
                      placeholder="0 for unlimited"
                    />
                    <p className="mt-1 text-xs text-gray-500">Set to 0 for unlimited redemptions</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Associated Service (Optional)</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedPromotion.service_id || ''}
                      onChange={(e) => setSelectedPromotion({...selectedPromotion, service_id: e.target.value || null})}
                    >
                      <option value="">None (General Promotion)</option>
                      {services.map(service => (
                        <option key={service.id} value={service.id}>
                          {service.name} ({service.category})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Terms & Conditions</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    rows={3}
                    value={selectedPromotion.terms_conditions || ''}
                    onChange={(e) => setSelectedPromotion({...selectedPromotion, terms_conditions: e.target.value})}
                    placeholder="Enter terms and conditions for this promotion"
                  />
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePromotion}
                    isLoading={loading}
                  >
                    {selectedPromotion.id ? 'Save Changes' : 'Create Promotion'}
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'delete' && selectedPromotion && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to cancel the promotion <span className="font-semibold">{selectedPromotion.title}</span>?
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        This will immediately deactivate the promotion. Existing claims will still be honored.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Keep Active
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    isLoading={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Cancel Promotion
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'claims' && selectedPromotion && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Claims for {selectedPromotion.title}
                </h4>
                
                {promotionClaims.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Claimed At
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {promotionClaims.map((claim) => (
                          <tr key={claim.id}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
                                  <Users className="h-5 w-5 text-navy-600" />
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{claim.user_name}</div>
                                  <div className="text-sm text-gray-500">{claim.user_email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{new Date(claim.claimed_at).toLocaleDateString()}</div>
                              <div className="text-sm text-gray-500">{new Date(claim.claimed_at).toLocaleTimeString()}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getClaimStatusColor(claim.status)}`}>
                                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              {claim.status === 'pending' && (
                                <div className="flex justify-end space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateClaimStatus(claim.id, 'approved')}
                                    className="text-green-600 hover:bg-green-50"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleUpdateClaimStatus(claim.id, 'rejected')}
                                    className="text-red-600 hover:bg-red-50"
                                  >
                                    <XCircle className="h-4 w-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              )}
                              {claim.status === 'approved' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleUpdateClaimStatus(claim.id, 'completed')}
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Mark Completed
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Tag className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Claims Yet</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      This promotion hasn't been claimed by any members yet. Check back later or adjust the promotion terms to increase engagement.
                    </p>
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'stats' && selectedPromotion && promotionStats && (
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">
                  Performance Statistics for {selectedPromotion.title}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-navy-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-navy-600">Claim Statistics</h5>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={timeframe === 'week' ? 'bg-navy-100' : ''}
                          onClick={() => setTimeframe('week')}
                        >
                          Week
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={timeframe === 'month' ? 'bg-navy-100' : ''}
                          onClick={() => setTimeframe('month')}
                        >
                          Month
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className={timeframe === 'all' ? 'bg-navy-100' : ''}
                          onClick={() => setTimeframe('all')}
                        >
                          All
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Total Claims</span>
                          <span className="font-semibold text-navy-900">{promotionStats.total_claims}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Approved Claims</span>
                          <span className="font-semibold text-navy-900">{promotionStats.approved_claims}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Rejected Claims</span>
                          <span className="font-semibold text-navy-900">{promotionStats.rejected_claims}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Conversion Rate</span>
                          <span className="font-semibold text-navy-900">{promotionStats.conversion_rate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-navy-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-navy-600">Financial Impact</h5>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Total Reward Value</span>
                          <span className="font-semibold text-navy-900">
                            ${(promotionStats.approved_claims * selectedPromotion.reward_amount).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Estimated Revenue Impact</span>
                          <span className="font-semibold text-navy-900">
                            ${promotionStats.revenue_impact.toFixed(2)}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">ROI</span>
                          <span className="font-semibold text-navy-900">
                            {promotionStats.approved_claims > 0 
                              ? ((promotionStats.revenue_impact / (promotionStats.approved_claims * selectedPromotion.reward_amount)) - 1) * 100
                              : 0}%
                          </span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Cost per Conversion</span>
                          <span className="font-semibold text-navy-900">
                            ${promotionStats.approved_claims > 0 
                              ? (promotionStats.approved_claims * selectedPromotion.reward_amount / promotionStats.approved_claims).toFixed(2)
                              : '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}