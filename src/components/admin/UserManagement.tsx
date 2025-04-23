import { useState, useEffect } from 'react';
import { Users, Search, Filter, Download, Plus, Eye, Edit, Trash, UserCheck, UserX, UserCog, Shield, Activity, Calendar, Heart } from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: string;
  created_at: string;
  full_name?: string;
  status?: string;
}

interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  phone?: string;
}

interface Membership {
  id: string;
  membership_type?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
}

interface HealthActivity {
  appointments: number;
  assessments: number;
  metrics: number;
  lastActivity?: string;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | 'impersonate'>('view');
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [userMembership, setUserMembership] = useState<Membership | null>(null);
  const [healthActivity, setHealthActivity] = useState<HealthActivity | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const loadUserDetails = async (userId: string) => {
    try {
      setLoading(true);
      
      // Load profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (profileError && profileError.code !== 'PGRST116') throw profileError;
      setUserProfile(profile || null);
      
      // Load membership
      const { data: membership, error: membershipError } = await supabase
        .from('memberships')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (membershipError && membershipError.code !== 'PGRST116') throw membershipError;
      setUserMembership(membership || null);
      
      // Load health activity counts
      const [
        { count: appointmentsCount, error: appointmentsError },
        { count: assessmentsCount, error: assessmentsError },
        { count: metricsCount, error: metricsError },
        { data: lastActivity, error: lastActivityError }
      ] = await Promise.all([
        supabase.from('appointments').select('*', { count: 'exact', head: true }).eq('profile_id', userId),
        supabase.from('health_assessments').select('*', { count: 'exact', head: true }).eq('profile_id', userId),
        supabase.from('health_metrics').select('*', { count: 'exact', head: true }).eq('profile_id', userId),
        supabase.from('appointments')
          .select('scheduled_for')
          .eq('profile_id', userId)
          .order('scheduled_for', { ascending: false })
          .limit(1)
      ]);
      
      if (appointmentsError) throw appointmentsError;
      if (assessmentsError) throw assessmentsError;
      if (metricsError) throw metricsError;
      if (lastActivityError) throw lastActivityError;
      
      setHealthActivity({
        appointments: appointmentsCount || 0,
        assessments: assessmentsCount || 0,
        metrics: metricsCount || 0,
        lastActivity: lastActivity && lastActivity.length > 0 ? lastActivity[0].scheduled_for : undefined
      });
      
    } catch (error) {
      console.error('Error loading user details:', error);
      toast.error('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    setModalMode('view');
    await loadUserDetails(user.id);
    setShowModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('delete');
    setShowModal(true);
  };

  const handleImpersonateUser = (user: User) => {
    setSelectedUser(user);
    setModalMode('impersonate');
    setShowModal(true);
  };

  const handleAddUser = () => {
    setSelectedUser({
      id: '',
      email: '',
      role: 'member',
      created_at: new Date().toISOString(),
      full_name: '',
      status: 'active'
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      if (selectedUser.id) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            role: selectedUser.role,
            status: selectedUser.status || 'active'
          })
          .eq('id', selectedUser.id);
        
        if (error) throw error;
        
        // Update profile if full_name changed
        if (selectedUser.full_name) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ full_name: selectedUser.full_name })
            .eq('id', selectedUser.id);
          
          if (profileError) throw profileError;
        }
        
        toast.success('User updated successfully');
      } else {
        // Create new user - in a real app, this would involve more steps
        // This is a simplified version for demo purposes
        toast.success('User creation would happen here');
        // In a real app, you would:
        // 1. Create auth user
        // 2. Set up profile
        // 3. Set role and permissions
      }
      
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      toast.error('Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      // In a real app, this might archive the user instead of deleting
      const { error } = await supabase
        .from('users')
        .update({ status: 'inactive' })
        .eq('id', selectedUser.id);
      
      if (error) throw error;
      
      toast.success('User deactivated successfully');
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error deactivating user:', error);
      toast.error('Failed to deactivate user');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmImpersonate = async () => {
    if (!selectedUser) return;

    try {
      setLoading(true);
      
      // In a real app, this would create a temporary session as the user
      toast.success(`Now viewing as ${selectedUser.full_name || selectedUser.email}`);
      
      // Redirect to user's dashboard
      // window.location.href = '/dashboard';
      
      setShowModal(false);
    } catch (error) {
      console.error('Error impersonating user:', error);
      toast.error('Failed to impersonate user');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilter = (filters: Record<string, string>) => {
    setRoleFilter(filters.role || '');
    setStatusFilter(filters.status || '');
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    const matchesStatus = !statusFilter || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const columns = [
    {
      key: 'full_name',
      header: 'Name',
      render: (value: string, row: User) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
            <Users className="h-5 w-5 text-navy-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-navy-900">{value || 'N/A'}</div>
            <div className="text-sm text-navy-500">{row.email}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'role',
      header: 'Role',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'admin' ? 'bg-purple-100 text-purple-800' :
          value === 'partner' ? 'bg-blue-100 text-blue-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value}
        </span>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value === 'active' || !value ? 'bg-green-100 text-green-800' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {value || 'active'}
        </span>
      ),
      sortable: true
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (value: string) => new Date(value).toLocaleDateString(),
      sortable: true
    }
  ];

  const filterOptions = [
    {
      key: 'role',
      label: 'Role',
      options: [
        { value: 'member', label: 'Member' },
        { value: 'partner', label: 'Partner' },
        { value: 'admin', label: 'Admin' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredUsers}
        title="User Management"
        subtitle="View and manage all users in the system"
        searchPlaceholder="Search users..."
        onSearch={handleSearch}
        onFilter={handleFilter}
        onExport={() => toast.success('Exporting user data')}
        onView={handleViewUser}
        onEdit={handleEditUser}
        onDelete={handleDeleteUser}
        onAdd={handleAddUser}
        addButtonText="Add User"
        filterOptions={filterOptions}
        extraActions={[
          {
            icon: <UserCog className="h-4 w-4" />,
            label: "Impersonate",
            onClick: handleImpersonateUser
          }
        ]}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'view' ? 'User Details' : 
               modalMode === 'edit' ? (selectedUser?.id ? 'Edit User' : 'Add User') : 
               modalMode === 'impersonate' ? 'Impersonate User' :
               'Deactivate User'}
            </h3>
            
            {modalMode === 'view' && selectedUser && (
              <div className="space-y-6">
                {/* User Profile Section */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <UserCheck className="h-5 w-5 mr-2 text-navy-600" />
                    User Profile
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedUser.email}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Full Name</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{userProfile?.full_name || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Phone</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{userProfile?.phone || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Role</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedUser.role}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedUser.status || 'active'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {new Date(selectedUser.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Membership Section */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <Shield className="h-5 w-5 mr-2 text-navy-600" />
                    Membership Status
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Membership Type</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{userMembership?.membership_type || 'No active membership'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{userMembership?.status || 'N/A'}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Start Date</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {userMembership?.start_date ? new Date(userMembership.start_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">End Date</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {userMembership?.end_date ? new Date(userMembership.end_date).toLocaleDateString() : 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health Activity Section */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-navy-600" />
                    Health Activity
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg text-center">
                      <Calendar className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                      <div className="text-2xl font-semibold text-navy-900">{healthActivity?.appointments || 0}</div>
                      <div className="text-sm text-navy-600">Appointments</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <Heart className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                      <div className="text-2xl font-semibold text-navy-900">{healthActivity?.assessments || 0}</div>
                      <div className="text-sm text-navy-600">Assessments</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <Activity className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                      <div className="text-2xl font-semibold text-navy-900">{healthActivity?.metrics || 0}</div>
                      <div className="text-sm text-navy-600">Health Metrics</div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Last Activity</label>
                    <div className="mt-1 p-2 bg-white rounded-md">
                      {healthActivity?.lastActivity ? new Date(healthActivity.lastActivity).toLocaleString() : 'No recent activity'}
                    </div>
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
                      Edit User
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalMode('impersonate');
                      }}
                    >
                      <UserCog className="h-4 w-4 mr-2" />
                      Impersonate
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
            
            {modalMode === 'edit' && (
              <div className="space-y-4">
                {!selectedUser?.id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedUser?.email || ''}
                      onChange={(e) => setSelectedUser({...selectedUser as User, email: e.target.value})}
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Full Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedUser?.full_name || ''}
                    onChange={(e) => setSelectedUser({...selectedUser as User, full_name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedUser?.role || 'member'}
                    onChange={(e) => setSelectedUser({...selectedUser as User, role: e.target.value})}
                  >
                    <option value="member">Member</option>
                    <option value="partner">Partner</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedUser?.status || 'active'}
                    onChange={(e) => setSelectedUser({...selectedUser as User, status: e.target.value})}
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveUser}
                    isLoading={loading}
                  >
                    {selectedUser?.id ? 'Save Changes' : 'Create User'}
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'delete' && selectedUser && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to deactivate the user <span className="font-semibold">{selectedUser.email}</span>?
                  This action will prevent the user from accessing the system.
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <UserX className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        User data will be preserved for compliance and reporting purposes.
                      </p>
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
                    onClick={handleConfirmDelete}
                    isLoading={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Deactivate User
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'impersonate' && selectedUser && (
              <div>
                <p className="text-gray-700 mb-4">
                  You are about to impersonate <span className="font-semibold">{selectedUser.full_name || selectedUser.email}</span>.
                  This will allow you to view the application as this user would see it.
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <UserCog className="h-5 w-5 text-blue-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-700">
                        This is for support and testing purposes only. All actions will be logged.
                      </p>
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
                    onClick={handleConfirmImpersonate}
                    isLoading={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Start Impersonation
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