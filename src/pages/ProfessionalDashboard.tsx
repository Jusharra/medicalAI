import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  MessageSquare, 
  DollarSign, 
  Bell, 
  Settings, 
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Pill
} from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// Import Professional Dashboard Components
import DashboardStats from '../components/professional/DashboardStats';
import TodayAppointments from '../components/professional/TodayAppointments';
import AssignedMembers from '../components/professional/AssignedMembers';
import MessagingCenter from '../components/professional/MessagingCenter';
import PayoutsTransactions from '../components/professional/PayoutsTransactions';
import NotificationsPanel from '../components/professional/NotificationsPanel';
import AvailabilityManager from '../components/professional/AvailabilityManager';
import PracticeProfile from '../components/professional/PracticeProfile';
import TriageInbox from '../components/professional/TriageInbox';
import PrescriptionManagement from '../components/professional/PrescriptionManagement';

export default function ProfessionalDashboard() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'members' | 'messages' | 'payouts' | 'notifications' | 'availability' | 'profile' | 'triage' | 'prescriptions'
  >('overview');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
    if (user.role !== 'partner') {
      navigate('/unauthorized');
      return;
    }
    
    loadPartnerData();
    
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

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, [user, navigate]);

  const loadPartnerData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      if (error) throw error;
      
      setPartner(data);
    } catch (error) {
      console.error('Error loading partner data:', error);
      toast.error('Failed to load partner data');
    } finally {
      setLoading(false);
    }
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

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-luxury-600"></div>
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
              {isSidebarOpen && <span className="text-lg font-semibold text-white">Partner Portal</span>}
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
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'overview'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Dashboard</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'members'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Users className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Assigned Members</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('triage')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'triage'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <MessageSquare className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Symptom Triage</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'prescriptions'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Pill className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Prescriptions</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'messages'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <MessageSquare className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Messages</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'payouts'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <DollarSign className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Payouts</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'notifications'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Bell className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Notifications</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('availability')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'availability'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Calendar className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Availability</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('profile')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'profile'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Settings className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Practice Settings</span>}
                </button>
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
            <span className="text-lg font-semibold text-heading">Partner Portal</span>
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
          <div className="mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-heading">
              {activeTab === 'overview' && 'Dashboard Overview'}
              {activeTab === 'members' && 'Assigned Members'}
              {activeTab === 'triage' && 'Symptom Triage Inbox'}
              {activeTab === 'prescriptions' && 'Prescription Management'}
              {activeTab === 'messages' && 'Messaging Center'}
              {activeTab === 'payouts' && 'Payouts & Transactions'}
              {activeTab === 'notifications' && 'Notifications'}
              {activeTab === 'availability' && 'Availability Management'}
              {activeTab === 'profile' && 'Practice Settings'}
            </h1>
            <p className="text-body">
              {activeTab === 'overview' && `Welcome back, ${partner?.name || 'Partner'}`}
              {activeTab === 'members' && 'Manage your assigned members and patient relationships'}
              {activeTab === 'triage' && 'Review and triage patient symptom submissions'}
              {activeTab === 'prescriptions' && 'Manage prescription refill requests and medications'}
              {activeTab === 'messages' && 'Communicate with members and admin'}
              {activeTab === 'payouts' && 'Track your earnings and manage payouts'}
              {activeTab === 'notifications' && 'Stay updated with important alerts and information'}
              {activeTab === 'availability' && 'Set your availability for appointments'}
              {activeTab === 'profile' && 'Update your practice information and settings'}
            </p>
          </div>

          {/* Dashboard Content */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <DashboardStats partnerId={user?.id || ''} />
              <TodayAppointments partnerId={user?.id || ''} />
              
              {/* Separate sections for Assigned Members and Notifications */}
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-heading mb-4">Assigned Members</h2>
                <AssignedMembers partnerId={user?.id || ''} />
              </div>
              
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-heading mb-4">Notifications</h2>
                <NotificationsPanel partnerId={user?.id || ''} />
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <AssignedMembers partnerId={user?.id || ''} />
          )}

          {activeTab === 'triage' && (
            <TriageInbox partnerId={user?.id || ''} />
          )}

          {activeTab === 'prescriptions' && (
            <PrescriptionManagement partnerId={user?.id || ''} />
          )}

          {activeTab === 'messages' && (
            <MessagingCenter partnerId={user?.id || ''} />
          )}

          {activeTab === 'payouts' && (
            <PayoutsTransactions partnerId={user?.id || ''} />
          )}

          {activeTab === 'notifications' && (
            <NotificationsPanel partnerId={user?.id || ''} />
          )}

          {activeTab === 'availability' && (
            <AvailabilityManager partnerId={user?.id || ''} />
          )}

          {activeTab === 'profile' && (
            <PracticeProfile partnerId={user?.id || ''} />
          )}
        </main>
      </div>
    </div>
  );
}