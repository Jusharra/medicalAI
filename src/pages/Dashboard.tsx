import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import { Menu, X, User, Settings, LogOut, Phone, Briefcase, Pill } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  Gift, 
  Calendar, 
  Clock, 
  Receipt, 
  Tag, 
  Activity, 
  Users, 
  MessageSquare, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import HealthAssistant from '../components/dashboard/HealthAssistant';

interface Note {
  id: string;
  content: string;
  created_at: string;
}

interface OnboardingProgress {
  welcome: boolean;
  profile: boolean;
  health_assessment: boolean;
  concierge_intro: boolean;
  schedule_consultation: boolean;
}

export default function Dashboard() {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState('');
  const [onboardingProgress, setOnboardingProgress] = useState<OnboardingProgress>({
    welcome: false,
    profile: false,
    health_assessment: false,
    concierge_intro: false,
    schedule_consultation: false
  });
  const jotformRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
    loadNotes();
    checkOnboardingProgress();
    
    // Initialize JotForm
    const script = document.createElement('script');
    script.src = 'https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js';
    script.async = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      if (window.jotformEmbedHandler) {
        window.jotformEmbedHandler(
          "iframe[id='JotFormIFrame-019612884885794fb92c90a81180e62f1fbd']",
          "https://hipaa.jotform.com"
        );
      }
    };
    
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
      // Clean up script when component unmounts
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [user, navigate]);

  const loadNotes = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('profile_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error loading notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const checkOnboardingProgress = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Welcome is always true as they're logged in
      let progress: OnboardingProgress = {
        welcome: true,
        profile: false,
        health_assessment: false,
        concierge_intro: false,
        schedule_consultation: false
      };

      // Check profile completion
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', session.user.id)
        .single();

      if (!profileError) {
        progress.profile = !!(profile?.full_name && profile?.avatar_url);
      }

      // Check health assessment - try direct query first
      const { data: assessments, error: assessmentsError } = await supabase
        .from('health_assessments')
        .select('id')
        .eq('profile_id', session.user.id)
        .limit(1);

      if (!assessmentsError && assessments && assessments.length > 0) {
        progress.health_assessment = true;
      } else {
        // Fallback to count query if direct query fails or returns no results
        const { count, error: countError } = await supabase
          .from('health_assessments')
          .select('*', { count: 'exact', head: true })
          .eq('profile_id', session.user.id);
        
        if (!countError) {
          progress.health_assessment = count > 0;
        }
      }

      // Check care team - primary provider
      const { count: primaryProviderCount, error: providerError } = await supabase
        .from('care_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', session.user.id)
        .eq('is_primary', true);

      // Check care team - pharmacy
      const { count: pharmacyCount, error: pharmacyError } = await supabase
        .from('care_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', session.user.id)
        .not('pharmacy_id', 'is', null);

      // Check care team - any partner
      const { count: partnerCount, error: partnerError } = await supabase
        .from('care_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', session.user.id)
        .not('partner_id', 'is', null);

      // Mark concierge_intro as complete if any care team member exists
      if (!providerError && !pharmacyError && !partnerError) {
        progress.concierge_intro = (primaryProviderCount > 0 || pharmacyCount > 0 || partnerCount > 0);
      }

      // Check appointments
      const { count: appointmentCount, error: appointmentError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('profile_id', session.user.id);

      if (!appointmentError) {
        progress.schedule_consultation = appointmentCount > 0;
      }

      console.log('Onboarding progress:', progress);
      setOnboardingProgress(progress);
    } catch (error) {
      console.error('Error checking onboarding progress:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return;
      }

      const { data, error } = await supabase
        .from('notes')
        .insert([{ 
          content: newNote.trim(),
          profile_id: session.user.id
        }])
        .select()
        .single();

      if (error) throw error;

      setNotes(prev => [data, ...prev]);
      setNewNote('');
      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(prev => prev.filter(note => note.id !== noteId));
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
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

  // Check if the current path matches the link path
  const isActive = (path: string) => {
    return location.pathname === path;
  };

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
                    isActive('/dashboard') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/rewards') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/appointments') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/purchases') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/bookings') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/preferences') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/promotions') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/health-alerts') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/team') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/messages') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
                    isActive('/pharmacy') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#ffffff] hover:text-white'
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
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-400 hover:bg-[#ffffff] hover:text-red-300 rounded-lg"
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
            {/* Onboarding Progress */}
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 mb-8">
              <h2 className="text-xl font-semibold text-luxury-800 mb-6 sm:mb-8">Complete Your Profile Setup</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {ONBOARDING_STEPS.map((step) => {
                  const isComplete = onboardingProgress[step.id as keyof OnboardingProgress];
                  return (
                    <div 
                      key={step.id} 
                      className={`relative overflow-hidden rounded-xl border-2 transition-all duration-300 ${
                        isComplete 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gold-500 bg-luxury-50'
                      }`}
                    >
                      {/* Status Badge */}
                      <div 
                        className={`absolute top-4 right-4 rounded-full px-3 py-1 text-xs font-semibold ${
                          isComplete 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gold-100 text-gold-800'
                        }`}
                      >
                        {isComplete ? 'Completed' : 'Pending'}
                      </div>

                      <div className="p-4 sm:p-6">
                        {/* Icon and Title */}
                        <div className="flex items-center mb-4">
                          {isComplete ? (
                            <CheckCircle2 className="h-8 w-8 text-green-500 mr-3" />
                          ) : (
                            <AlertCircle className="h-8 w-8 text-gold-500 mr-3" />
                          )}
                          <h3 className="font-semibold text-lg text-luxury-800">{step.title}</h3>
                        </div>

                        {/* Description */}
                        <p className="text-luxury-600 mb-6">{step.description}</p>

                        {/* Action Button */}
                        {!isComplete && (
                          <Link to={step.id === 'health-assessment' ? '/health-alerts' : `/${step.id}`}>
                            <Button 
                              variant="luxury" 
                              className="w-full flex items-center justify-center"
                            >
                              Complete Now
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Health Assistant */}
            <HealthAssistant membershipTier="core" />

            {/* AI Medical Concierge Assistant */}
            <div className="bg-[#0A1628] rounded-xl shadow-luxury overflow-hidden mb-8">
              <div className="p-4 sm:p-6 border-b border-[#1E3A5F]">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10">
                    <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">AI Medical Concierge</h2>
                    <p className="text-sm text-[#00F0FF]">Your personal health assistant</p>
                  </div>
                </div>
              </div>
              <div className="h-[400px] sm:h-[600px] w-full" ref={jotformRef}>
                <iframe 
                  id="JotFormIFrame-019612884885794fb92c90a81180e62f1fbd"
                  title="Patient Care Coordinator AI Agent" 
                  allowTransparency={true} 
                  allow="geolocation; microphone; camera; fullscreen"
                  src="https://hipaa.jotform.com/agent/019612884885794fb92c90a81180e62f1fbd?embedMode=iframe&background=1&shadow=1"
                  frameBorder="0" 
                  style={{
                    minWidth: '100%',
                    maxWidth: '100%',
                    height: '688px',
                    border: 'none',
                    width: '100%'
                  }}
                  scrolling="no"
                />
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-white rounded-xl shadow-luxury overflow-hidden mb-8">
              <div className="p-4 sm:p-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-luxury-50 flex items-center justify-center">
                      <PenSquare className="h-6 w-6 text-luxury-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-luxury-800">Notes</h2>
                  </div>
                  <Button
                    onClick={handleSaveNote}
                    disabled={!newNote.trim() || loading}
                    size="sm"
                    variant="luxury"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Note
                  </Button>
                </div>
              </div>

              <div className="p-4 sm:p-6">
                {/* New Note Input */}
                <div className="mb-6">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a new note..."
                    className="w-full h-32 p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-luxury-500 focus:border-transparent resize-none"
                  />
                </div>

                {/* Notes List */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className="bg-luxury-50 rounded-lg p-4 flex justify-between items-start"
                    >
                      <div className="flex-1">
                        <p className="text-luxury-800 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-sm text-luxury-600 mt-2">
                          {new Date(note.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDeleteNote(note.id)}
                        className="ml-4 text-luxury-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-center text-luxury-500">No notes yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// Import missing components
import { useNavigate } from 'react-router-dom';
import { PenSquare, Trash2, Plus, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';
import { ONBOARDING_STEPS } from '../constants/config';