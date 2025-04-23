import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, Heart, Clock, MapPin, AlertCircle, LayoutDashboard, Gift, Calendar, Receipt, Tag, Activity, Users, MessageSquare, Pill, ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuthStore } from '../store/auth';
import { toast } from 'react-hot-toast';

interface ServicePreferences {
  preferred_categories: string[];
  preferred_days: string[];
  preferred_times: string[];
  preferred_locations: string[];
  max_travel_distance: number;
  special_requirements: string[];
  communication_preferences: {
    pre_appointment_reminder: boolean;
    post_appointment_followup: boolean;
    preferred_contact_method: string;
  };
  health_focus_areas: string[];
}

const defaultPreferences: ServicePreferences = {
  preferred_categories: [],
  preferred_days: [],
  preferred_times: [],
  preferred_locations: [],
  max_travel_distance: 25,
  special_requirements: [],
  communication_preferences: {
    pre_appointment_reminder: true,
    post_appointment_followup: true,
    preferred_contact_method: 'email'
  },
  health_focus_areas: []
};

export default function ServicePreferences() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<ServicePreferences>(defaultPreferences);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
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

  const togglePreference = (category: keyof ServicePreferences, value: string) => {
    setPreferences(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const updateCommunicationPreference = (key: string, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      communication_preferences: {
        ...prev.communication_preferences,
        [key]: value
      }
    }));
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Preferences saved successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <Settings className="h-8 w-8 text-leaf-600" />
                <h1 className="text-2xl font-bold text-gray-900">Service Preferences</h1>
              </div>
              <p className="text-gray-600">
                Customize your service preferences to help us match you with the right care providers
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Service Categories */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Heart className="h-6 w-6 text-leaf-600 mr-2" />
                  Preferred Service Categories
                </h2>
                <div className="space-y-3">
                  {['aesthetic', 'medical_cosmetic', 'spa', 'wellness'].map(category => (
                    <label key={category} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={preferences.preferred_categories.includes(category)}
                        onChange={() => togglePreference('preferred_categories', category)}
                        className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                      />
                      <span className="ml-2 text-gray-700 capitalize">
                        {category.replace('_', ' ')}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Scheduling Preferences */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <Clock className="h-6 w-6 text-leaf-600 mr-2" />
                  Scheduling Preferences
                </h2>
                <div className="space-y-6">
                  {/* Preferred Days */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Preferred Days</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                        <label key={day} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.preferred_days.includes(day)}
                            onChange={() => togglePreference('preferred_days', day)}
                            className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                          />
                          <span className="ml-2 text-gray-700">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preferred Times */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Preferred Times</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['Morning', 'Afternoon', 'Evening'].map(time => (
                        <label key={time} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.preferred_times.includes(time)}
                            onChange={() => togglePreference('preferred_times', time)}
                            className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                          />
                          <span className="ml-2 text-gray-700">{time}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Location Preferences */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <MapPin className="h-6 w-6 text-leaf-600 mr-2" />
                  Location Preferences
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Preferred Locations</h3>
                    <div className="grid grid-cols-2 gap-3">
                      {['In-Office', 'Video Call', 'Home Visit'].map(location => (
                        <label key={location} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={preferences.preferred_locations.includes(location)}
                            onChange={() => togglePreference('preferred_locations', location)}
                            className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                          />
                          <span className="ml-2 text-gray-700">{location}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Maximum Travel Distance</h3>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      step="5"
                      value={preferences.max_travel_distance}
                      onChange={(e) => setPreferences(prev => ({
                        ...prev,
                        max_travel_distance: parseInt(e.target.value)
                      }))}
                      className="w-full"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-2">
                      <span>5 miles</span>
                      <span>{preferences.max_travel_distance} miles</span>
                      <span>50 miles</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Communication Preferences */}
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                  <AlertCircle className="h-6 w-6 text-leaf-600 mr-2" />
                  Communication Preferences
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Notifications</h3>
                    <div className="space-y-3">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences.communication_preferences.pre_appointment_reminder}
                          onChange={(e) => updateCommunicationPreference('pre_appointment_reminder', e.target.checked)}
                          className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                        />
                        <span className="ml-2 text-gray-700">Pre-appointment reminders</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={preferences.communication_preferences.post_appointment_followup}
                          onChange={(e) => updateCommunicationPreference('post_appointment_followup', e.target.checked)}
                          className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                        />
                        <span className="ml-2 text-gray-700">Post-appointment follow-ups</span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-gray-900 mb-3">Preferred Contact Method</h3>
                    <select
                      value={preferences.communication_preferences.preferred_contact_method}
                      onChange={(e) => updateCommunicationPreference('preferred_contact_method', e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500"
                    >
                      <option value="email">Email</option>
                      <option value="sms">SMS</option>
                      <option value="phone">Phone Call</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSavePreferences}
                isLoading={loading}
              >
                Save Preferences
              </Button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}