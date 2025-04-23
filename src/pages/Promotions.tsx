import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  Tag, 
  Gift, 
  ClipboardList, 
  DollarSign, 
  Clock, 
  ArrowRight,
  Star,
  AlertCircle,
  LayoutDashboard,
  Calendar,
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

interface Promotion {
  id: string;
  title: string;
  description: string;
  type: 'offer' | 'survey' | 'study';
  reward_amount: number;
  expires_at: string;
  status: 'active' | 'claimed' | 'expired';
  partner_name: string;
  partner_logo?: string;
  terms_conditions?: string;
}

export default function Promotions() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [claimLoading, setClaimLoading] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [filter, setFilter] = useState<'all' | 'offer' | 'survey' | 'study'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    loadPromotions();
    
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

  const loadPromotions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('promotions')
        .select('*')
        .eq('status', 'active')
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

  const handleClaimPromotion = async (promotionId: string) => {
    try {
      setClaimLoading(promotionId);
      
      // First check if user has already claimed this promotion
      const { data: existingClaims, error: checkError } = await supabase
        .from('promotion_claims')
        .select('id')
        .eq('promotion_id', promotionId)
        .eq('profile_id', user?.id)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingClaims) {
        toast.error('You have already claimed this promotion');
        return;
      }
      
      // Insert new claim
      const { error } = await supabase
        .from('promotion_claims')
        .insert({
          promotion_id: promotionId,
          profile_id: user?.id,
          status: 'pending'
        });

      if (error) throw error;
      
      toast.success('Promotion claimed successfully!');
      
      // Update local state to reflect the claim
      setPromotions(prevPromotions => 
        prevPromotions.map(promo => 
          promo.id === promotionId 
            ? { ...promo, status: 'claimed' as 'active' | 'claimed' | 'expired' } 
            : promo
        )
      );
    } catch (error) {
      console.error('Error claiming promotion:', error);
      toast.error(`Error claiming promotion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setClaimLoading(null);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'offer':
        return <Tag className="h-5 w-5" />;
      case 'survey':
        return <ClipboardList className="h-5 w-5" />;
      case 'study':
        return <Star className="h-5 w-5" />;
      default:
        return <Gift className="h-5 w-5" />;
    }
  };

  const filteredPromotions = filter === 'all' 
    ? promotions 
    : promotions.filter(p => p.type === filter);

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
                <h1 className="text-2xl font-display font-bold text-navy-900">Special Promotions</h1>
              </div>
              <p className="text-navy-600 mb-6">
                Exclusive offers, research opportunities, and rewards for our valued members
              </p>

              {/* Filter Tabs */}
              <div className="flex flex-wrap gap-4">
                {['all', 'offer', 'survey', 'study'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
                      filter === type
                        ? 'bg-gold-gradient text-navy-900 shadow-luxury transform hover:scale-102'
                        : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Promotions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPromotions.length > 0 ? (
                filteredPromotions.map((promotion) => (
                  <div
                    key={promotion.id}
                    className="bg-white rounded-xl shadow-luxury overflow-hidden hover:shadow-luxury-lg transition-all duration-300"
                  >
                    {/* Partner Info */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex items-center space-x-3">
                        {promotion.partner_logo ? (
                          <img
                            src={promotion.partner_logo}
                            alt={promotion.partner_name}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center">
                            {getTypeIcon(promotion.type)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-navy-900">{promotion.partner_name}</h3>
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            promotion.type === 'offer' ? 'bg-green-100 text-green-800' :
                            promotion.type === 'survey' ? 'bg-blue-100 text-blue-800' :
                            'bg-purple-100 text-purple-800'
                          }`}>
                            {promotion.type.charAt(0).toUpperCase() + promotion.type.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Promotion Content */}
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-navy-900 mb-2">
                        {promotion.title}
                      </h3>
                      <p className="text-navy-600 mb-4">
                        {promotion.description}
                      </p>

                      <div className="space-y-3 mb-6">
                        <div className="flex items-center text-navy-600">
                          <DollarSign className="h-5 w-5 mr-2" />
                          Reward Value: ${promotion.reward_amount}
                        </div>
                        <div className="flex items-center text-navy-600">
                          <Clock className="h-5 w-5 mr-2" />
                          Expires: {new Date(promotion.expires_at).toLocaleDateString()}
                        </div>
                      </div>

                      {promotion.terms_conditions && (
                        <div className="mb-6">
                          <p className="text-sm text-navy-500">
                            <span className="font-medium">Terms & Conditions:</span> {promotion.terms_conditions}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="luxury"
                        onClick={() => handleClaimPromotion(promotion.id)}
                        isLoading={claimLoading === promotion.id}
                        disabled={promotion.status !== 'active' || claimLoading !== null}
                        className="w-full"
                      >
                        {promotion.status === 'active' ? (
                          <>
                            Claim Now
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        ) : (
                          'Already Claimed'
                        )}
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full bg-white rounded-xl shadow-luxury p-8 text-center">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">No Promotions Available</h3>
                  <p className="text-navy-600">
                    Check back soon for new {filter === 'all' ? 'promotions' : filter + 's'}!
                  </p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}