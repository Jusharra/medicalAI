import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  Gift, 
  Calendar, 
  Clock, 
  Check, 
  AlertCircle, 
  Star, 
  Sparkles, 
  Tag, 
  Plane, 
  DollarSign, 
  ArrowRight, 
  LayoutDashboard, 
  Receipt, 
  Settings, 
  Activity, 
  Users, 
  MessageSquare, 
  Pill, 
  ChevronLeft, 
  ChevronRight, 
  LogOut, 
  Menu, 
  X 
} from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Reward {
  id: string;
  name: string;
  description: string;
  value: number;
  redeemed: boolean;
  expires_at: string | null;
  renewal_date: string | null;
  status: 'available' | 'used' | 'expired';
  reward_type: 'service' | 'travel' | 'discount' | 'experience' | 'promotion';
  terms_conditions: string | null;
  image_url: string | null;
}

export default function MemberRewards() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [filter, setFilter] = useState<'all' | 'available' | 'used' | 'expired'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'service' | 'travel' | 'discount' | 'experience' | 'promotion'>('all');
  const [showTermsModal, setShowTermsModal] = useState<{show: boolean, terms: string | null}>({show: false, terms: null});
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    loadRewards();
    
    // Set sidebar state based on screen size
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [user, navigate]);

  const loadRewards = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('member_rewards')
        .select('*')
        .eq('profile_id', user?.id)
        .order('status', { ascending: true })
        .order('expires_at', { ascending: true });

      if (error) throw error;
      setRewards(data || []);
    } catch (error) {
      console.error('Error loading rewards:', error);
      toast.error('Failed to load rewards');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'used':
        return 'bg-blue-100 text-blue-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'service':
        return <Star className="h-10 w-10 text-gold-500" />;
      case 'travel':
        return <Plane className="h-10 w-10 text-gold-500" />;
      case 'discount':
        return <DollarSign className="h-10 w-10 text-gold-500" />;
      case 'experience':
        return <Sparkles className="h-10 w-10 text-gold-500" />;
      case 'promotion':
        return <Tag className="h-10 w-10 text-gold-500" />;
      default:
        return <Gift className="h-10 w-10 text-gold-500" />;
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    try {
      setClaimLoading(rewardId);
      
      const { error } = await supabase
        .from('member_rewards')
        .update({
          status: 'used',
          redeemed: true
        })
        .eq('id', rewardId);

      if (error) throw error;
      
      toast.success('Reward redeemed successfully!');
      loadRewards();
    } catch (error) {
      console.error('Error redeeming reward:', error);
      toast.error('Failed to redeem reward');
    } finally {
      setClaimLoading(null);
    }
  };

  const filteredRewards = rewards
    .filter(r => filter === 'all' || r.status === filter)
    .filter(r => typeFilter === 'all' || r.reward_type === typeFilter);

  const availableRewards = rewards.filter(r => r.status === 'available').length;
  const totalValue = rewards
    .filter(r => r.status === 'available')
    .reduce((sum, r) => sum + (r.value || 0), 0);
  const nextRenewal = rewards
    .filter(r => r.renewal_date)
    .sort((a, b) => new Date(a.renewal_date!).getTime() - new Date(b.renewal_date!).getTime())[0]?.renewal_date;

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Check if the current path matches the link path
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      {/* Sidebar */}
      <aside 
        className={`bg-[#0A1628] fixed inset-y-0 left-0 z-50 transform ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'
        } transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header with Toggle Button */}
          <div className="p-4 border-b border-[#1E3A5F] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-[#1E3A5F] p-2 rounded-lg">
                <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" className="w-8 h-8 object-contain" />
              </div>
              {isSidebarOpen && <span className="text-lg font-semibold text-white">Member Portal</span>}
            </div>
            <button 
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              <li>
                <Link
                  to="/dashboard"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/dashboard') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Dashboard</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/rewards"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/rewards') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Gift className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Member Rewards</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/appointments"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/appointments') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Calendar className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Appointments</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/purchases"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/purchases') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Receipt className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Past Purchases</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/bookings"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/bookings') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Clock className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Upcoming Bookings</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/preferences"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/preferences') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Settings className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Service Preferences</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/promotions"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/promotions') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Tag className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Promotions</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/health-alerts"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/health-alerts') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Activity className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Health Alerts</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/team"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/team') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Users className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Concierge Team</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/messages"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/messages') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <MessageSquare className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Message Center</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/pharmacy"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/pharmacy') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Pill className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Pharmacy</span>}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[#1E3A5F]">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-400 hover:bg-[#1E3A5F] hover:text-red-300 rounded-lg"
            >
              <LogOut className="h-5 w-5 min-w-5" />
              {isSidebarOpen && <span className="ml-3">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex lg:hidden items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <div className="bg-[#0A1628] p-2 rounded-lg">
              <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" className="h-5 w-5 object-contain" />
            </div>
            <span className="text-lg font-semibold text-heading">Member Portal</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Content Area */}
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <Gift className="h-8 w-8 text-gold-500" />
                <h1 className="text-2xl font-display font-bold text-navy-900">Member Rewards</h1>
              </div>
              <p className="text-navy-600">
                Your exclusive benefits and rewards
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Star className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">Available Rewards</h3>
                    <p className="text-sm text-navy-600">
                      {availableRewards} Rewards
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Gift className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">Total Value</h3>
                    <p className="text-sm text-navy-600">
                      ${totalValue.toFixed(2)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Calendar className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">Next Renewal</h3>
                    <p className="text-sm text-navy-600">
                      {nextRenewal
                        ? new Date(nextRenewal).toLocaleDateString()
                        : 'No upcoming renewals'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-navy-900">Filter Rewards</h2>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="flex space-x-2">
                    {['all', 'available', 'used', 'expired'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilter(status as any)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          filter === status
                            ? 'bg-gold-gradient text-navy-900'
                            : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                        }`}
                      >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="flex space-x-2">
                    {['all', 'service', 'travel', 'discount', 'experience', 'promotion'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setTypeFilter(type as any)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          typeFilter === type
                            ? 'bg-navy-600 text-white'
                            : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                        }`}
                      >
                        {type === 'all' ? 'All Types' : type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Rewards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRewards.length > 0 ? (
                filteredRewards.map((reward) => (
                  <div
                    key={reward.id}
                    className="bg-white rounded-xl shadow-luxury overflow-hidden hover:shadow-luxury-lg transition-all duration-300"
                  >
                    {reward.image_url && (
                      <div className="h-48 w-full overflow-hidden">
                        <img
                          src={reward.image_url}
                          alt={reward.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center">
                          {getTypeIcon(reward.reward_type)}
                          <div className="ml-3">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(reward.status)}`}>
                              {reward.status.charAt(0).toUpperCase() + reward.status.slice(1)}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-semibold text-navy-900 mb-2">{reward.name}</h3>
                      <p className="text-navy-600 mb-4">{reward.description}</p>
                      
                      {reward.value > 0 && (
                        <p className="text-gold-600 font-semibold mb-4">
                          Value: ${reward.value.toFixed(2)}
                        </p>
                      )}

                      <div className="space-y-2 text-sm text-navy-600 mb-4">
                        {reward.redeemed && (
                          <div className="flex items-center">
                            <Check className="h-4 w-4 mr-2 text-green-500" />
                            <span>Redeemed</span>
                          </div>
                        )}
                        
                        {reward.expires_at && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2" />
                            Expires: {new Date(reward.expires_at).toLocaleDateString()}
                          </div>
                        )}

                        {reward.renewal_date && (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-2" />
                            Renews: {new Date(reward.renewal_date).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {reward.terms_conditions && (
                        <button 
                          onClick={() => setShowTermsModal({show: true, terms: reward.terms_conditions})}
                          className="text-sm text-navy-500 underline mb-4 hover:text-navy-700"
                        >
                          View Terms & Conditions
                        </button>
                      )}

                      {reward.status === 'available' && (
                        <Button
                          variant="luxury"
                          className="w-full"
                          onClick={() => handleRedeemReward(reward.id)}
                          isLoading={claimLoading === reward.id}
                        >
                          Redeem Now
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-white rounded-xl shadow-luxury p-8 text-center">
                  <Sparkles className="h-12 w-12 text-gold-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">No Rewards Available</h3>
                  <p className="text-navy-600">
                    {filter !== 'all' || typeFilter !== 'all' 
                      ? 'No rewards match your current filters. Try adjusting your filters to see more rewards.'
                      : 'Check back soon for new rewards and benefits!'}
                  </p>
                </div>
              )}
            </div>

            {/* Terms & Conditions Modal */}
            {showTermsModal.show && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <h3 className="text-xl font-bold mb-4">Terms & Conditions</h3>
                  <div className="bg-navy-50 rounded-lg p-4 mb-6 max-h-80 overflow-y-auto">
                    <p className="text-navy-600">{showTermsModal.terms}</p>
                  </div>
                  <div className="flex justify-end">
                    <Button
                      variant="luxury"
                      onClick={() => setShowTermsModal({show: false, terms: null})}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}