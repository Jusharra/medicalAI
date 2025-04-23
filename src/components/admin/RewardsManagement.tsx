import { useState, useEffect } from 'react';
import { Gift, Search, Filter, Download, Plus, Eye, Edit, Trash, Award, Star, DollarSign, Users, ArrowUpDown, Sparkles, Zap, BarChart, CheckCircle, XCircle } from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  status?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

interface RewardPoints {
  id: string;
  profile_id: string;
  current_balance: number;
  lifetime_earned: number;
  lifetime_redeemed: number;
  last_activity: string;
}

interface RewardTransaction {
  id: string;
  profile_id: string;
  points: number;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'bonus' | 'adjustment';
  source: string;
  description?: string;
  created_at: string;
}

interface RewardTier {
  id: string;
  name: string;
  min_points: number;
  max_points?: number;
  benefits: any;
  multiplier: number;
}

export default function RewardsManagement() {
  const [users, setUsers] = useState<(User & { profile?: Profile, points?: RewardPoints })[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<(User & { profile?: Profile, points?: RewardPoints }) | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | 'add-points' | 'history'>('view');
  const [transactions, setTransactions] = useState<RewardTransaction[]>([]);
  const [rewardTiers, setRewardTiers] = useState<RewardTier[]>([]);
  const [pointsToAdd, setPointsToAdd] = useState(0);
  const [pointsSource, setPointsSource] = useState('manual');
  const [pointsDescription, setPointsDescription] = useState('');
  const [transactionType, setTransactionType] = useState<'earn' | 'redeem' | 'bonus' | 'adjustment'>('earn');

  useEffect(() => {
    loadUsers();
    loadRewardTiers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      
      // First get all users with role = member
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('role', 'member');
      
      if (userError) throw userError;
      
      // Get profiles for these users
      const userIds = userData?.map(user => user.id) || [];
      
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);
      
      if (profileError) throw profileError;
      
      // Get reward points for these users
      const { data: pointsData, error: pointsError } = await supabase
        .from('reward_points')
        .select('*')
        .in('profile_id', userIds);
      
      if (pointsError) throw pointsError;
      
      // Combine the data
      const combinedData = userData?.map(user => {
        const profile = profileData?.find(p => p.id === user.id);
        const points = pointsData?.find(p => p.profile_id === user.id);
        
        return {
          ...user,
          profile,
          points
        };
      }) || [];
      
      setUsers(combinedData);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadRewardTiers = async () => {
    try {
      const { data, error } = await supabase
        .from('reward_tiers')
        .select('*')
        .order('min_points', { ascending: true });
      
      if (error) throw error;
      setRewardTiers(data || []);
    } catch (error) {
      console.error('Error loading reward tiers:', error);
      toast.error('Failed to load reward tiers');
    }
  };

  const loadTransactionHistory = async (userId: string) => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('reward_transactions')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setTransactions(data || []);
    } catch (error) {
      console.error('Error loading transaction history:', error);
      toast.error('Failed to load transaction history');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = (user: User & { profile?: Profile, points?: RewardPoints }) => {
    setSelectedUser(user);
    setModalMode('view');
    setShowModal(true);
  };

  const handleViewHistory = async (user: User & { profile?: Profile, points?: RewardPoints }) => {
    setSelectedUser(user);
    await loadTransactionHistory(user.id);
    setModalMode('history');
    setShowModal(true);
  };

  const handleAddPoints = (user: User & { profile?: Profile, points?: RewardPoints }) => {
    setSelectedUser(user);
    setPointsToAdd(0);
    setPointsSource('manual');
    setPointsDescription('');
    setTransactionType('earn');
    setModalMode('add-points');
    setShowModal(true);
  };

  const handleSavePoints = async () => {
    if (!selectedUser || pointsToAdd === 0) return;

    try {
      setLoading(true);
      
      // Adjust points value based on transaction type
      const adjustedPoints = transactionType === 'redeem' ? -Math.abs(pointsToAdd) : pointsToAdd;
      
      // Create transaction record
      const { error } = await supabase
        .from('reward_transactions')
        .insert([{
          profile_id: selectedUser.id,
          points: adjustedPoints,
          transaction_type: transactionType,
          source: pointsSource,
          description: pointsDescription || `${transactionType === 'redeem' ? 'Redeemed' : 'Earned'} points - ${pointsSource}`
        }]);
      
      if (error) throw error;
      
      toast.success(`${Math.abs(pointsToAdd)} points ${transactionType === 'redeem' ? 'redeemed from' : 'added to'} user's account`);
      setShowModal(false);
      loadUsers(); // Reload to get updated points
    } catch (error) {
      console.error('Error saving points:', error);
      toast.error('Failed to update points');
    } finally {
      setLoading(false);
    }
  };

  const getUserTier = (points?: number) => {
    if (points === undefined) return 'No Tier';
    
    const tier = rewardTiers.find(tier => 
      points >= tier.min_points && 
      (tier.max_points === null || tier.max_points === undefined || points <= tier.max_points)
    );
    
    return tier ? tier.name : 'No Tier';
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'earn':
        return 'bg-green-100 text-green-800';
      case 'bonus':
        return 'bg-purple-100 text-purple-800';
      case 'redeem':
        return 'bg-blue-100 text-blue-800';
      case 'expire':
        return 'bg-red-100 text-red-800';
      case 'adjustment':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'profile',
      header: 'Member',
      render: (value: any, row: User & { profile?: Profile, points?: RewardPoints }) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-navy-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-navy-900">{row.profile?.full_name || 'N/A'}</div>
            <div className="text-sm text-navy-500">{row.email}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'points',
      header: 'Points Balance',
      render: (value: any, row: User & { profile?: Profile, points?: RewardPoints }) => (
        <div className="flex flex-col">
          <span className="font-medium text-navy-900">{row.points?.current_balance || 0}</span>
          <span className="text-xs text-navy-500">
            Tier: {getUserTier(row.points?.current_balance)}
          </span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'lifetime',
      header: 'Lifetime Points',
      render: (value: any, row: User & { profile?: Profile, points?: RewardPoints }) => (
        <div className="flex flex-col">
          <span className="font-medium text-navy-900">{row.points?.lifetime_earned || 0} earned</span>
          <span className="text-xs text-navy-500">
            {row.points?.lifetime_redeemed || 0} redeemed
          </span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'last_activity',
      header: 'Last Activity',
      render: (value: any, row: User & { profile?: Profile, points?: RewardPoints }) => (
        <span className="text-navy-600">
          {row.points?.last_activity ? new Date(row.points.last_activity).toLocaleDateString() : 'Never'}
        </span>
      ),
      sortable: true
    }
  ];

  const filterOptions = [
    {
      key: 'tier',
      label: 'Tier',
      options: rewardTiers.map(tier => ({ value: tier.name, label: tier.name }))
    },
    {
      key: 'activity',
      label: 'Activity',
      options: [
        { value: 'active', label: 'Active (Last 30 days)' },
        { value: 'inactive', label: 'Inactive (30+ days)' }
      ]
    }
  ];

  return (
    <>
      {/* Rewards Overview */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <Gift className="h-5 w-5 mr-2 text-gold-500" />
              Rewards Program Overview
            </h2>
            <p className="text-navy-600 text-sm">
              Manage member points, tiers, and rewards
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => toast.success('Generating rewards report...')}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
            <Button
              variant="luxury"
              onClick={() => toast.success('Bulk points update initiated...')}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Bulk Update
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Members</div>
              <div className="text-xl font-bold text-navy-900">{users.length}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Points Issued</div>
              <div className="text-xl font-bold text-navy-900">
                {users.reduce((sum, user) => sum + (user.points?.lifetime_earned || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Points Redeemed</div>
              <div className="text-xl font-bold text-navy-900">
                {users.reduce((sum, user) => sum + (user.points?.lifetime_redeemed || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Active Points</div>
              <div className="text-xl font-bold text-navy-900">
                {users.reduce((sum, user) => sum + (user.points?.current_balance || 0), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reward Tiers */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <h2 className="text-xl font-semibold text-navy-900 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-gold-500" />
          Reward Tiers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {rewardTiers.map((tier) => (
            <div key={tier.id} className="bg-navy-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-navy-900">{tier.name}</h3>
                <span className="text-sm text-navy-600">{tier.multiplier}x</span>
              </div>
              <div className="text-sm text-navy-600 mb-2">
                {tier.min_points.toLocaleString()} - {tier.max_points ? tier.max_points.toLocaleString() : '∞'} points
              </div>
              <div className="text-xs text-navy-500">
                {tier.benefits?.perks?.slice(0, 2).join(', ')}
                {tier.benefits?.perks?.length > 2 ? '...' : ''}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member Rewards Table */}
      <DataTable
        columns={columns}
        data={users}
        title="Member Rewards"
        subtitle="Manage points earned/redeemed by members"
        searchPlaceholder="Search members..."
        onSearch={(term) => console.log('Searching for:', term)}
        onFilter={(filters) => console.log('Filters:', filters)}
        onExport={() => toast.success('Exporting rewards data')}
        onView={handleViewUser}
        filterOptions={filterOptions}
        extraActions={[
          {
            icon: <Zap className="h-4 w-4" />,
            label: "Add Points",
            onClick: handleAddPoints
          },
          {
            icon: <BarChart className="h-4 w-4" />,
            label: "View History",
            onClick: handleViewHistory
          }
        ]}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'view' ? 'Member Rewards Details' : 
               modalMode === 'add-points' ? 'Add/Remove Points' : 
               modalMode === 'history' ? 'Transaction History' :
               'Manage Rewards'}
            </h3>
            
            {modalMode === 'view' && selectedUser && (
              <div className="space-y-6">
                {/* Member Details */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <Users className="h-5 w-5 mr-2 text-navy-600" />
                    Member Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedUser.profile?.full_name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedUser.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Member Since</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {new Date(selectedUser.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedUser.status || 'Active'}</div>
                    </div>
                  </div>
                </div>

                {/* Rewards Details */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <Gift className="h-5 w-5 mr-2 text-navy-600" />
                    Rewards Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Balance</label>
                      <div className="mt-1 p-2 bg-white rounded-md font-semibold text-navy-900">
                        {selectedUser.points?.current_balance?.toLocaleString() || '0'} points
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Tier</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {getUserTier(selectedUser.points?.current_balance)}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lifetime Earned</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {selectedUser.points?.lifetime_earned?.toLocaleString() || '0'} points
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Lifetime Redeemed</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {selectedUser.points?.lifetime_redeemed?.toLocaleString() || '0'} points
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {selectedUser.points?.last_activity 
                          ? new Date(selectedUser.points.last_activity).toLocaleString() 
                          : 'No activity'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Next Tier</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {(() => {
                          const currentPoints = selectedUser.points?.current_balance || 0;
                          const nextTier = rewardTiers.find(tier => 
                            tier.min_points > currentPoints
                          );
                          
                          if (nextTier) {
                            const pointsNeeded = nextTier.min_points - currentPoints;
                            return `${nextTier.name} (${pointsNeeded.toLocaleString()} points needed)`;
                          } else {
                            return 'Highest tier reached';
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalMode('add-points');
                        setPointsToAdd(0);
                        setPointsSource('manual');
                        setPointsDescription('');
                        setTransactionType('earn');
                      }}
                    >
                      <Zap className="h-4 w-4 mr-2" />
                      Add/Remove Points
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        loadTransactionHistory(selectedUser.id);
                        setModalMode('history');
                      }}
                    >
                      <BarChart className="h-4 w-4 mr-2" />
                      View History
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
            
            {modalMode === 'add-points' && selectedUser && (
              <div className="space-y-4">
                <div className="bg-navy-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-navy-600">Member</p>
                      <p className="font-medium text-navy-900">{selectedUser.profile?.full_name || selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-navy-600">Current Balance</p>
                      <p className="font-medium text-navy-900">{selectedUser.points?.current_balance?.toLocaleString() || '0'} points</p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Transaction Type</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value as any)}
                  >
                    <option value="earn">Add Points (Earn)</option>
                    <option value="bonus">Add Points (Bonus)</option>
                    <option value="redeem">Remove Points (Redeem)</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Points Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={pointsToAdd}
                    onChange={(e) => setPointsToAdd(parseInt(e.target.value) || 0)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Source</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={pointsSource}
                    onChange={(e) => setPointsSource(e.target.value)}
                  >
                    <option value="manual">Manual Adjustment</option>
                    <option value="promotion">Promotion</option>
                    <option value="purchase">Purchase</option>
                    <option value="referral">Referral</option>
                    <option value="loyalty">Loyalty Bonus</option>
                    <option value="correction">Correction</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description (Optional)</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    rows={3}
                    value={pointsDescription}
                    onChange={(e) => setPointsDescription(e.target.value)}
                    placeholder="Enter a description for this transaction..."
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
                    onClick={handleSavePoints}
                    isLoading={loading}
                    disabled={pointsToAdd <= 0}
                  >
                    {transactionType === 'redeem' ? 'Remove Points' : 'Add Points'}
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'history' && selectedUser && (
              <div className="space-y-4">
                <div className="bg-navy-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-navy-600">Member</p>
                      <p className="font-medium text-navy-900">{selectedUser.profile?.full_name || selectedUser.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-navy-600">Current Balance</p>
                      <p className="font-medium text-navy-900">{selectedUser.points?.current_balance?.toLocaleString() || '0'} points</p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[400px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Points</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {transactions.length > 0 ? (
                        transactions.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTransactionTypeColor(transaction.transaction_type)}`}>
                                {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={transaction.points >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {transaction.points >= 0 ? '+' : ''}{transaction.points}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.source}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500">
                              {transaction.description || '-'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                            No transaction history found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
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