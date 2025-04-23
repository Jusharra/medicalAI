import { useState, useEffect } from 'react';
import { Users, Search, Filter, Download, Plus, Eye, Edit, Trash, Calendar, BarChart, UserPlus, ArrowRight, ArrowDown, Briefcase, Activity, CheckCircle, XCircle, LineChart, Zap, UserCheck, Clock, DollarSign, ChevronRight, ChevronLeft, FileText } from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Lead {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  status: 'new' | 'nurturing' | 'qualified' | 'converted' | 'lost';
  source: string;
  lead_score: number;
  created_at: string;
  updated_at: string;
  last_contact: string | null;
  next_contact: string | null;
  notes: string | null;
  health_interests: string[];
  risk_factors: {
    symptoms: string[];
    lifestyle: string[];
  };
}

interface LeadInteraction {
  id: string;
  lead_id: string;
  interaction_type: string;
  content: any;
  engagement_score: number;
  created_at: string;
}

interface FunnelStats {
  new_leads: number;
  nurturing_leads: number;
  qualified_leads: number;
  converted_leads: number;
  lost_leads: number;
  total_leads: number;
  conversion_rate: number;
}

interface ConversionStats {
  month: string;
  total_leads: number;
  converted_leads: number;
  conversion_rate: number;
}

interface Partner {
  id: string;
  name: string;
  email: string;
  practice_name?: string;
  specialties?: string[];
}

interface Membership {
  id: string;
  profile_id: string;
  membership_type: string;
  start_date: string;
  end_date: string;
  status: string;
  payment_method: string;
  amount: number;
  created_at: string;
}

export default function LeadManagement() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | 'interactions' | 'assign' | 'convert'>('view');
  const [interactions, setInteractions] = useState<LeadInteraction[]>([]);
  const [funnelStats, setFunnelStats] = useState<FunnelStats>({
    new_leads: 0,
    nurturing_leads: 0,
    qualified_leads: 0,
    converted_leads: 0,
    lost_leads: 0,
    total_leads: 0,
    conversion_rate: 0
  });
  const [conversionStats, setConversionStats] = useState<ConversionStats[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [timeframe, setTimeframe] = useState<'all' | 'week' | 'month' | 'quarter'>('month');
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [membershipType, setMembershipType] = useState<string>('Essential Care');
  const [viewMode, setViewMode] = useState<'leads' | 'memberships'>('leads');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    loadLeads();
    loadFunnelStats();
    loadPartners();
    loadConversionStats();
    loadMemberships();
  }, []);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const loadFunnelStats = async () => {
    try {
      const { data, error } = await supabase
        .from('lead_funnel_stats')
        .select('*')
        .single();
      
      if (error) throw error;
      setFunnelStats(data || {
        new_leads: 0,
        nurturing_leads: 0,
        qualified_leads: 0,
        converted_leads: 0,
        lost_leads: 0,
        total_leads: 0,
        conversion_rate: 0
      });
    } catch (error) {
      console.error('Error loading funnel stats:', error);
      
      // Calculate stats from leads if view fails
      if (leads.length > 0) {
        const newLeads = leads.filter(l => l.status === 'new').length;
        const nurturingLeads = leads.filter(l => l.status === 'nurturing').length;
        const qualifiedLeads = leads.filter(l => l.status === 'qualified').length;
        const convertedLeads = leads.filter(l => l.status === 'converted').length;
        const lostLeads = leads.filter(l => l.status === 'lost').length;
        const totalLeads = leads.length;
        const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;
        
        setFunnelStats({
          new_leads: newLeads,
          nurturing_leads: nurturingLeads,
          qualified_leads: qualifiedLeads,
          converted_leads: convertedLeads,
          lost_leads: lostLeads,
          total_leads: totalLeads,
          conversion_rate: conversionRate
        });
      }
    }
  };

  const loadConversionStats = async () => {
    try {
      const { data, error } = await supabase
        .from('membership_conversion_stats')
        .select('*')
        .order('month', { ascending: false });
      
      if (error) throw error;
      
      // Format data for chart
      const formattedData = data?.map(stat => ({
        ...stat,
        month: new Date(stat.month).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      })) || [];
      
      setConversionStats(formattedData);
    } catch (error) {
      console.error('Error loading conversion stats:', error);
      
      // Generate mock data if needed
      const mockData = [];
      const today = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
        mockData.push({
          month: month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          total_leads: Math.floor(Math.random() * 50) + 20,
          converted_leads: Math.floor(Math.random() * 20) + 5,
          conversion_rate: Math.floor(Math.random() * 30) + 10
        });
      }
      setConversionStats(mockData);
    }
  };

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('id, name, email, practice_name, specialties')
        .eq('status', 'active');
      
      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
    }
  };

  const loadMemberships = async () => {
    try {
      setLoading(true);
      
      // In a real app, you would have a memberships table
      // For this demo, we'll generate mock data based on converted leads
      
      const convertedLeads = leads.filter(lead => lead.status === 'converted');
      const mockMemberships: Membership[] = convertedLeads.map(lead => {
        const startDate = new Date(lead.updated_at);
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 1);
        
        return {
          id: lead.id,
          profile_id: lead.id,
          membership_type: ['Essential Care', 'Premium Care', 'Elite Care'][Math.floor(Math.random() * 3)],
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          status: ['active', 'active', 'active', 'pending', 'cancelled'][Math.floor(Math.random() * 5)],
          payment_method: ['Credit Card', 'Bank Transfer', 'PayPal'][Math.floor(Math.random() * 3)],
          amount: [199, 499, 999][Math.floor(Math.random() * 3)],
          created_at: lead.updated_at
        };
      });
      
      setMemberships(mockMemberships);
    } catch (error) {
      console.error('Error loading memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInteractions = async (leadId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('lead_interactions')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setInteractions(data || []);
    } catch (error) {
      console.error('Error loading interactions:', error);
      toast.error('Failed to load interactions');
    } finally {
      setLoading(false);
    }
  };

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('view');
    setShowModal(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeleteLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('delete');
    setShowModal(true);
  };

  const handleViewInteractions = async (lead: Lead) => {
    setSelectedLead(lead);
    await loadInteractions(lead.id);
    setModalMode('interactions');
    setShowModal(true);
  };

  const handleAssignLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('assign');
    setShowModal(true);
  };

  const handleConvertLead = (lead: Lead) => {
    setSelectedLead(lead);
    setModalMode('convert');
    setShowModal(true);
  };

  const handleAddLead = () => {
    setSelectedLead({
      id: '',
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      status: 'new',
      source: '',
      lead_score: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_contact: null,
      next_contact: null,
      notes: null,
      health_interests: [],
      risk_factors: {
        symptoms: [],
        lifestyle: []
      }
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSaveLead = async () => {
    if (!selectedLead) return;

    try {
      setLoading(true);
      
      if (selectedLead.id) {
        // Update existing lead
        const { error } = await supabase
          .from('leads')
          .update({
            email: selectedLead.email,
            first_name: selectedLead.first_name,
            last_name: selectedLead.last_name,
            phone: selectedLead.phone,
            status: selectedLead.status,
            source: selectedLead.source,
            lead_score: selectedLead.lead_score,
            notes: selectedLead.notes,
            health_interests: selectedLead.health_interests,
            risk_factors: selectedLead.risk_factors
          })
          .eq('id', selectedLead.id);
        
        if (error) throw error;
        toast.success('Lead updated successfully');
      } else {
        // Create new lead
        const { error } = await supabase
          .from('leads')
          .insert([{
            email: selectedLead.email,
            first_name: selectedLead.first_name,
            last_name: selectedLead.last_name,
            phone: selectedLead.phone,
            status: selectedLead.status,
            source: selectedLead.source,
            lead_score: selectedLead.lead_score,
            notes: selectedLead.notes,
            health_interests: selectedLead.health_interests,
            risk_factors: selectedLead.risk_factors
          }]);
        
        if (error) throw error;
        toast.success('Lead created successfully');
      }
      
      setShowModal(false);
      loadLeads();
      loadFunnelStats();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedLead) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', selectedLead.id);
      
      if (error) throw error;
      
      toast.success('Lead deleted successfully');
      setShowModal(false);
      loadLeads();
      loadFunnelStats();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('Failed to delete lead');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPartner = async () => {
    if (!selectedLead || !selectedPartner) {
      toast.error('Please select a partner');
      return;
    }

    try {
      setLoading(true);
      
      // Check if assignment already exists
      const { data: existingAssignment, error: checkError } = await supabase
        .from('lead_assignments')
        .select('*')
        .eq('lead_id', selectedLead.id)
        .eq('partner_id', selectedPartner);
      
      if (checkError) throw checkError;
      
      if (existingAssignment && existingAssignment.length > 0) {
        toast.error('Lead is already assigned to this partner');
        return;
      }
      
      // Create new assignment
      const { error } = await supabase
        .from('lead_assignments')
        .insert([{
          lead_id: selectedLead.id,
          partner_id: selectedPartner,
          status: 'active'
        }]);
      
      if (error) throw error;
      
      // Create interaction record
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert([{
          lead_id: selectedLead.id,
          interaction_type: 'assignment',
          content: {
            summary: 'Lead assigned to partner',
            partner_id: selectedPartner,
            action: 'assigned'
          },
          engagement_score: 50
        }]);
      
      if (interactionError) throw interactionError;
      
      toast.success('Lead assigned successfully');
      setShowModal(false);
      setSelectedPartner('');
    } catch (error) {
      console.error('Error assigning lead:', error);
      toast.error('Failed to assign lead');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToMember = async () => {
    if (!selectedLead) return;

    try {
      setLoading(true);
      
      // Update lead status to converted
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          status: 'converted',
          lead_score: 100,
          last_contact: new Date().toISOString()
        })
        .eq('id', selectedLead.id);
      
      if (updateError) throw updateError;
      
      // Create interaction record
      const { error: interactionError } = await supabase
        .from('lead_interactions')
        .insert([{
          lead_id: selectedLead.id,
          interaction_type: 'conversion',
          content: {
            summary: 'Lead converted to member',
            membership_type: membershipType,
            converted_by: 'admin'
          },
          engagement_score: 100
        }]);
      
      if (interactionError) throw interactionError;
      
      // In a real app, you would create a membership record here
      
      toast.success('Lead converted to member successfully');
      setShowModal(false);
      loadLeads();
      loadFunnelStats();
      loadConversionStats();
      loadMemberships();
    } catch (error) {
      console.error('Error converting lead:', error);
      toast.error('Failed to convert lead');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'bg-blue-100 text-blue-800';
      case 'nurturing':
        return 'bg-yellow-100 text-yellow-800';
      case 'qualified':
        return 'bg-purple-100 text-purple-800';
      case 'converted':
        return 'bg-green-100 text-green-800';
      case 'lost':
        return 'bg-red-100 text-red-800';
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const leadColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (_: any, row: Lead) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-navy-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-navy-900">{`${row.first_name} ${row.last_name}`}</div>
            <div className="text-sm text-navy-500">{row.email}</div>
          </div>
        </div>
      ),
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
      key: 'lead_score',
      header: 'Score',
      render: (value: number) => (
        <div className="flex items-center">
          <div className="w-16 bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${
                value >= 80 ? 'bg-green-500' :
                value >= 60 ? 'bg-blue-500' :
                value >= 40 ? 'bg-yellow-500' :
                'bg-red-500'
              }`} 
              style={{ width: `${value}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm text-gray-700">{value}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'source',
      header: 'Source',
      render: (value: string) => (
        <span className="text-sm text-gray-700 capitalize">{value || 'Unknown'}</span>
      ),
      sortable: true
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (value: string) => (
        <span className="text-sm text-gray-700">{new Date(value).toLocaleDateString()}</span>
      ),
      sortable: true
    },
    {
      key: 'next_contact',
      header: 'Next Contact',
      render: (value: string | null) => (
        <span className="text-sm text-gray-700">
          {value ? new Date(value).toLocaleDateString() : 'Not scheduled'}
        </span>
      ),
      sortable: true
    }
  ];

  const membershipColumns = [
    {
      key: 'name',
      header: 'Member',
      render: (_: any, row: Membership) => {
        const lead = leads.find(l => l.id === row.profile_id);
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-navy-600" />
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-navy-900">
                {lead ? `${lead.first_name} ${lead.last_name}` : 'Unknown Member'}
              </div>
              <div className="text-sm text-navy-500">
                {lead?.email || 'No email available'}
              </div>
            </div>
          </div>
        );
      },
      sortable: true
    },
    {
      key: 'membership_type',
      header: 'Plan',
      render: (value: string) => (
        <span className="text-sm font-medium text-navy-900">{value}</span>
      ),
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
      key: 'amount',
      header: 'Amount',
      render: (value: number) => (
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
          <span className="font-medium">${value}/mo</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'start_date',
      header: 'Start Date',
      render: (value: string) => (
        <span className="text-sm text-gray-700">{new Date(value).toLocaleDateString()}</span>
      ),
      sortable: true
    },
    {
      key: 'end_date',
      header: 'End Date',
      render: (value: string) => (
        <span className="text-sm text-gray-700">{new Date(value).toLocaleDateString()}</span>
      ),
      sortable: true
    }
  ];

  const leadFilterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'new', label: 'New' },
        { value: 'nurturing', label: 'Nurturing' },
        { value: 'qualified', label: 'Qualified' },
        { value: 'converted', label: 'Converted' },
        { value: 'lost', label: 'Lost' }
      ]
    },
    {
      key: 'source',
      label: 'Source',
      options: [
        { value: 'website', label: 'Website' },
        { value: 'referral', label: 'Referral' },
        { value: 'social', label: 'Social Media' },
        { value: 'email', label: 'Email' },
        { value: 'event', label: 'Event' }
      ]
    }
  ];

  const membershipFilterOptions = [
    {
      key: 'membership_type',
      label: 'Plan',
      options: [
        { value: 'Essential Care', label: 'Essential Care' },
        { value: 'Premium Care', label: 'Premium Care' },
        { value: 'Elite Care', label: 'Elite Care' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    }
  ];

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentLeads = leads.slice(indexOfFirstItem, indexOfLastItem);
  const currentMemberships = memberships.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil((viewMode === 'leads' ? leads.length : memberships.length) / itemsPerPage);

  return (
    <>
      {/* Lead Funnel Section */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <BarChart className="h-5 w-5 mr-2 text-gold-500" />
              Lead & Membership Funnel
            </h2>
            <p className="text-navy-600 text-sm">
              Visualize and manage incoming leads and conversions
            </p>
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              className={timeframe === 'week' ? 'bg-navy-50' : ''}
              onClick={() => setTimeframe('week')}
            >
              Week
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className={timeframe === 'month' ? 'bg-navy-50' : ''}
              onClick={() => setTimeframe('month')}
            >
              Month
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className={timeframe === 'quarter' ? 'bg-navy-50' : ''}
              onClick={() => setTimeframe('quarter')}
            >
              Quarter
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className={timeframe === 'all' ? 'bg-navy-50' : ''}
              onClick={() => setTimeframe('all')}
            >
              All Time
            </Button>
          </div>
        </div>

        {/* Funnel Visualization */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{funnelStats.new_leads}</div>
            <div className="text-sm font-medium text-navy-900">New</div>
            <div className="mt-2 flex justify-center">
              <ArrowDown className="h-5 w-5 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{funnelStats.nurturing_leads}</div>
            <div className="text-sm font-medium text-navy-900">Nurturing</div>
            <div className="mt-2 flex justify-center">
              <ArrowDown className="h-5 w-5 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{funnelStats.qualified_leads}</div>
            <div className="text-sm font-medium text-navy-900">Qualified</div>
            <div className="mt-2 flex justify-center">
              <ArrowDown className="h-5 w-5 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{funnelStats.converted_leads}</div>
            <div className="text-sm font-medium text-navy-900">Converted</div>
          </div>
          
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{funnelStats.lost_leads}</div>
            <div className="text-sm font-medium text-navy-900">Lost</div>
          </div>
        </div>

        {/* Conversion Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Leads</div>
              <div className="text-xl font-bold text-navy-900">{funnelStats.total_leads}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Conversion Rate</div>
              <div className="text-xl font-bold text-navy-900">{funnelStats.conversion_rate.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Avg. Lead Score</div>
              <div className="text-xl font-bold text-navy-900">
                {leads.length > 0 
                  ? (leads.reduce((sum, lead) => sum + lead.lead_score, 0) / leads.length).toFixed(1) 
                  : '0'}
              </div>
            </div>
          </div>
        </div>

        {/* Conversion Trend Chart */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
          <h3 className="text-lg font-semibold text-navy-900 mb-4">Conversion Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsLineChart
                data={conversionStats}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="total_leads" name="Total Leads" stroke="#8884d8" activeDot={{ r: 8 }} />
                <Line yAxisId="left" type="monotone" dataKey="converted_leads" name="Converted Leads" stroke="#82ca9d" />
                <Line yAxisId="right" type="monotone" dataKey="conversion_rate" name="Conversion Rate (%)" stroke="#ffc658" />
              </RechartsLineChart>
            </ResponsiveContainer>
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
            onClick={handleAddLead}
          >
            <UserPlus className="h-5 w-5 mr-2" />
            Add New Lead
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Importing leads...')}
          >
            <Download className="h-5 w-5 mr-2" />
            Import Leads
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Generating report...')}
          >
            <FileText className="h-5 w-5 mr-2" />
            Generate Report
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Bulk assignment initiated...')}
          >
            <Briefcase className="h-5 w-5 mr-2" />
            Bulk Assign
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="bg-white rounded-xl shadow-luxury p-4 mb-8">
        <div className="flex space-x-4">
          <Button
            variant={viewMode === 'leads' ? 'luxury' : 'outline'}
            onClick={() => setViewMode('leads')}
          >
            <Users className="h-5 w-5 mr-2" />
            Leads
          </Button>
          <Button
            variant={viewMode === 'memberships' ? 'luxury' : 'outline'}
            onClick={() => setViewMode('memberships')}
          >
            <UserCheck className="h-5 w-5 mr-2" />
            Memberships
          </Button>
        </div>
      </div>

      {/* Lead/Membership Table */}
      {viewMode === 'leads' ? (
        <div className="bg-white rounded-xl shadow-luxury overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">Lead Management</h2>
                <p className="text-navy-600 text-sm">View and manage all leads in the system</p>
              </div>
              <Button
                variant="luxury"
                onClick={handleAddLead}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lead
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-navy-50">
                  <tr>
                    {leadColumns.map(column => (
                      <th 
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider"
                      >
                        {column.header}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-navy-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-navy-50">
                      {leadColumns.map(column => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                          {column.render ? column.render(lead[column.key as keyof Lead], lead) : lead[column.key as keyof Lead]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewLead(lead)}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEditLead(lead)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewInteractions(lead)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="View Interactions"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleAssignLead(lead)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="Assign to Partner"
                        >
                          <UserPlus className="h-4 w-4" />
                        </button>
                        {lead.status !== 'converted' && (
                          <button
                            onClick={() => handleConvertLead(lead)}
                            className="text-green-600 hover:text-green-900 mr-3"
                            title="Convert to Member"
                          >
                            <Zap className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteLead(lead)}
                          className="text-red-600 hover:text-red-900"
                          title="Delete"
                        >
                          <Trash className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentLeads.length === 0 && (
                    <tr>
                      <td colSpan={leadColumns.length + 1} className="px-6 py-4 text-center text-sm text-gray-500">
                        No leads found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {leads.length > itemsPerPage && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastItem, leads.length)}</span> of{' '}
                  <span className="font-medium">{leads.length}</span> leads
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-luxury overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">Membership Management</h2>
                <p className="text-navy-600 text-sm">Track signups, trial-to-paid conversions, and cancellations</p>
              </div>
              <Button
                variant="luxury"
                onClick={() => toast.success('Membership report generated')}
              >
                <FileText className="h-4 w-4 mr-2" />
                Generate Report
              </Button>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-navy-50">
                  <tr>
                    {membershipColumns.map(column => (
                      <th 
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider"
                      >
                        {column.header}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-navy-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentMemberships.map(membership => (
                    <tr key={membership.id} className="hover:bg-navy-50">
                      {membershipColumns.map(column => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                          {column.render ? column.render(membership[column.key as keyof Membership], membership) : membership[column.key as keyof Membership]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toast.success('Viewing membership details')}
                          className="text-indigo-600 hover:text-indigo-900 mr-3"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toast.success('Editing membership')}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toast.success('Membership history viewed')}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="View History"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {currentMemberships.length === 0 && (
                    <tr>
                      <td colSpan={membershipColumns.length + 1} className="px-6 py-4 text-center text-sm text-gray-500">
                        No memberships found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {memberships.length > itemsPerPage && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{indexOfFirstItem + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(indexOfLastItem, memberships.length)}</span> of{' '}
                  <span className="font-medium">{memberships.length}</span> memberships
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'view' ? 'Lead Details' : 
               modalMode === 'edit' ? (selectedLead?.id ? 'Edit Lead' : 'Add Lead') : 
               modalMode === 'interactions' ? 'Lead Interactions' :
               modalMode === 'assign' ? 'Assign Lead to Partner' :
               modalMode === 'convert' ? 'Convert Lead to Member' :
               'Delete Lead'}
            </h3>
            
            {modalMode === 'view' && selectedLead && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">
                    {selectedLead.first_name} {selectedLead.last_name}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">{selectedLead.email}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">{selectedLead.phone || 'N/A'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedLead.status)}`}>
                      {selectedLead.status.charAt(0).toUpperCase() + selectedLead.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md capitalize">{selectedLead.source || 'Unknown'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Score</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">{selectedLead.lead_score}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Health Interests</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">
                    {selectedLead.health_interests?.length > 0 
                      ? selectedLead.health_interests.map(interest => (
                          <span key={interest} className="inline-block bg-navy-100 text-navy-800 rounded-full px-2 py-1 text-xs font-semibold mr-2 mb-2">
                            {interest}
                          </span>
                        ))
                      : 'None specified'}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <div className="mt-1 p-2 bg-gray-50 rounded-md">
                    {selectedLead.notes || 'No notes'}
                  </div>
                </div>
                <div className="mt-6 flex justify-between">
                  <div className="space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalMode('assign');
                      }}
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Assign
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleViewInteractions(selectedLead)}
                      size="sm"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      Interactions
                    </Button>
                    {selectedLead.status !== 'converted' && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setModalMode('convert');
                        }}
                        size="sm"
                      >
                        <Zap className="h-4 w-4 mr-2" />
                        Convert
                      </Button>
                    )}
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
            
            {modalMode === 'edit' && selectedLead && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">First Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedLead.first_name}
                    onChange={(e) => setSelectedLead({...selectedLead, first_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedLead.last_name}
                    onChange={(e) => setSelectedLead({...selectedLead, last_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedLead.email}
                    onChange={(e) => setSelectedLead({...selectedLead, email: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <input
                    type="tel"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedLead.phone || ''}
                    onChange={(e) => setSelectedLead({...selectedLead, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedLead.status}
                    onChange={(e) => setSelectedLead({...selectedLead, status: e.target.value as any})}
                  >
                    <option value="new">New</option>
                    <option value="nurturing">Nurturing</option>
                    <option value="qualified">Qualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedLead.source || ''}
                    onChange={(e) => setSelectedLead({...selectedLead, source: e.target.value})}
                  >
                    <option value="">Select Source</option>
                    <option value="website">Website</option>
                    <option value="referral">Referral</option>
                    <option value="social">Social Media</option>
                    <option value="email">Email</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Lead Score</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedLead.lead_score}
                    onChange={(e) => setSelectedLead({...selectedLead, lead_score: parseInt(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    rows={3}
                    value={selectedLead.notes || ''}
                    onChange={(e) => setSelectedLead({...selectedLead, notes: e.target.value})}
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
                    onClick={handleSaveLead}
                    isLoading={loading}
                  >
                    {selectedLead.id ? 'Save Changes' : 'Create Lead'}
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'delete' && selectedLead && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the lead <span className="font-semibold">{selectedLead.email}</span>?
                  This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    isLoading={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete Lead
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'interactions' && selectedLead && (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">
                  Interactions for {selectedLead.first_name} {selectedLead.last_name}
                </h4>
                
                {interactions.length > 0 ? (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {interactions.map((interaction) => (
                      <div key={interaction.id} className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium capitalize">{interaction.interaction_type}</span>
                          <span className="text-gray-500">{new Date(interaction.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="mt-1">
                          <span className="text-gray-700">
                            {interaction.content && typeof interaction.content === 'object' 
                              ? interaction.content.summary || JSON.stringify(interaction.content)
                              : 'No details available'}
                          </span>
                        </div>
                        <div className="mt-2 flex justify-between items-center">
                          <div className="flex items-center">
                            <Activity className="h-4 w-4 text-navy-600 mr-1" />
                            <span className="text-xs text-navy-600">Engagement: {interaction.engagement_score}/100</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No interactions found</p>
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
            
            {modalMode === 'assign' && selectedLead && (
              <div className="space-y-4">
                <p className="text-gray-700">
                  Assign <span className="font-semibold">{selectedLead.first_name} {selectedLead.last_name}</span> to a partner:
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Select Partner</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedPartner}
                    onChange={(e) => setSelectedPartner(e.target.value)}
                  >
                    <option value="">Select a partner...</option>
                    {partners.map(partner => (
                      <option key={partner.id} value={partner.id}>
                        {partner.name} {partner.practice_name ? `(${partner.practice_name})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                {selectedPartner && (
                  <div className="bg-navy-50 p-3 rounded-lg">
                    <h4 className="font-medium text-navy-900 text-sm">Partner Details</h4>
                    {partners.find(p => p.id === selectedPartner)?.specialties && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {partners.find(p => p.id === selectedPartner)?.specialties?.map(specialty => (
                          <span key={specialty} className="bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full text-xs">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAssignPartner}
                    isLoading={loading}
                    disabled={!selectedPartner}
                  >
                    Assign Partner
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'convert' && selectedLead && (
              <div className="space-y-4">
                <p className="text-gray-700">
                  Convert <span className="font-semibold">{selectedLead.first_name} {selectedLead.last_name}</span> to a member:
                </p>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Membership Type</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={membershipType}
                    onChange={(e) => setMembershipType(e.target.value)}
                  >
                    <option value="Essential Care">Essential Care ($199/mo)</option>
                    <option value="Premium Care">Premium Care ($499/mo)</option>
                    <option value="Elite Care">Elite Care ($999/mo)</option>
                  </select>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-green-800">Conversion Benefits</h3>
                      <div className="mt-2 text-sm text-green-700">
                        <ul className="list-disc pl-5 space-y-1">
                          <li>Immediate access to all membership benefits</li>
                          <li>Personalized onboarding experience</li>
                          <li>First consultation included</li>
                          <li>Welcome package with exclusive offers</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConvertToMember}
                    isLoading={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Convert to Member
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