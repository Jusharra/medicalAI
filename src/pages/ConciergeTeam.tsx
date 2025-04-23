import { useState, useEffect } from 'react';
import { Heart, Activity, Star, Calendar, MessageSquare, Pill, LayoutDashboard, Gift, Receipt, Clock, Settings, Tag, Users, ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { toast } from 'react-hot-toast';

interface Provider {
  id: string;
  name: string;
  email: string;
  phone: string;
  practice_name: string;
  practice_address: {
    city: string;
    state: string;
  };
  specialties: string[];
  profile_image: string | null;
  consultation_fee: number;
  video_consultation: boolean;
  in_person_consultation: boolean;
  rating: number;
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  services: string;
  insurance_accepted: string;
  delivery_available: boolean;
  delivery_radius: number;
  status: string;
}

interface CareTeamMember {
  id: string;
  provider?: Provider;
  pharmacy?: Pharmacy;
  is_primary: boolean;
  relationship_type: 'physician' | 'specialist' | 'pharmacy';
}

export default function ConciergeTeam() {
  const { user, signOut } = useAuthStore();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [filter, setFilter] = useState<'all' | 'primary' | 'specialist' | 'pharmacy'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
    
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
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load care team members (providers)
      const { data: careTeamProviders, error: careTeamProvidersError } = await supabase
        .from('care_team_members')
        .select(`
          id,
          is_primary,
          partner:partners (
            id,
            name,
            email,
            phone,
            practice_name,
            practice_address,
            specialties,
            profile_image,
            consultation_fee,
            video_consultation,
            in_person_consultation,
            rating
          )
        `)
        .eq('profile_id', user.id)
        .not('partner_id', 'is', null);

      if (careTeamProvidersError) throw careTeamProvidersError;

      // Load care team members (pharmacies)
      const { data: careTeamPharmacies, error: careTeamPharmaciesError } = await supabase
        .from('care_team_members')
        .select(`
          id,
          is_primary,
          pharmacy:pharmacies (
            id,
            name,
            address,
            phone,
            email,
            hours,
            services,
            insurance_accepted,
            delivery_available,
            delivery_radius,
            status
          )
        `)
        .eq('profile_id', user.id)
        .not('pharmacy_id', 'is', null);

      if (careTeamPharmaciesError) throw careTeamPharmaciesError;

      // Transform provider data
      const providerMembers = careTeamProviders?.map(member => ({
        id: member.id,
        provider: member.partner,
        is_primary: member.is_primary,
        relationship_type: member.is_primary ? 'physician' : 'specialist'
      })) || [];

      // Transform pharmacy data
      const pharmacyMembers = careTeamPharmacies?.map(member => ({
        id: member.id,
        pharmacy: member.pharmacy,
        is_primary: false,
        relationship_type: 'pharmacy'
      })) || [];

      // Combine both types of care team members
      setCareTeam([...providerMembers, ...pharmacyMembers]);

      // Load available providers
      const { data: providersData, error: providersError } = await supabase
        .from('partners')
        .select('*')
        .eq('status', 'active')
        .not('id', 'in', `(${providerMembers.map(m => m.provider?.id).filter(Boolean).join(',') || 'null'})`);

      if (providersError) throw providersError;
      setProviders(providersData || []);

      // Load available pharmacies
      const { data: pharmaciesData, error: pharmaciesError } = await supabase
        .from('pharmacies')
        .select('*')
        .eq('status', 'active')
        .not('id', 'in', `(${pharmacyMembers.map(m => m.pharmacy?.id).filter(Boolean).join(',') || 'null'})`);

      if (pharmaciesError) throw pharmaciesError;
      setPharmacies(pharmaciesData || []);

    } catch (error) {
      console.error('Error loading care team data:', error);
      toast.error('Failed to load care team data');
    } finally {
      setLoading(false);
    }
  };

  const handleAddProvider = async (providerId: string, isPrimary: boolean = false) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('care_team_members')
        .insert({
          profile_id: user?.id,
          partner_id: providerId,
          is_primary: isPrimary
        });

      if (error) throw error;

      toast.success('Provider added to care team');
      loadData();
    } catch (error) {
      console.error('Error adding provider:', error);
      toast.error('Failed to add provider');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPharmacy = async (pharmacyId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('care_team_members')
        .insert({
          profile_id: user?.id,
          pharmacy_id: pharmacyId,
          is_primary: false
        });

      if (error) throw error;

      toast.success('Pharmacy added to care team');
      loadData();
    } catch (error) {
      console.error('Error adding pharmacy:', error);
      toast.error('Failed to add pharmacy');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('care_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;

      toast.success('Removed from care team');
      loadData();
    } catch (error) {
      console.error('Error removing team member:', error);
      toast.error('Failed to remove from care team');
    } finally {
      setLoading(false);
    }
  };

  // Toggle sidebar function
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

  // Count primary physicians, specialists, and pharmacies
  const primaryPhysicians = careTeam.filter(m => m.relationship_type === 'physician').length;
  const specialists = careTeam.filter(m => m.relationship_type === 'specialist').length;
  const pharmaciesCount = careTeam.filter(m => m.relationship_type === 'pharmacy').length;

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
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <Heart className="h-8 w-8 text-gold-500" />
                <h1 className="text-2xl font-display font-bold text-navy-900">Your Care Team</h1>
              </div>
              <p className="text-navy-600">
                Manage your dedicated healthcare providers and pharmacies
              </p>

              {/* Quick Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Activity className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">Primary Physician</h3>
                    <p className="text-sm text-navy-600">
                      {primaryPhysicians} Selected
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Star className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">Specialists</h3>
                    <p className="text-sm text-navy-600">
                      {specialists} Selected
                    </p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Pill className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">Pharmacies</h3>
                    <p className="text-sm text-navy-600">
                      {pharmaciesCount} Selected
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Care Team List */}
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <h2 className="text-xl font-semibold text-navy-900 mb-6">Current Care Team</h2>
              <div className="space-y-6">
                {careTeam.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-navy-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      {member.relationship_type === 'pharmacy' ? (
                        <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                          <Pill className="h-6 w-6 text-navy-600" />
                        </div>
                      ) : member.provider?.profile_image ? (
                        <img
                          src={member.provider.profile_image}
                          alt={member.provider.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                          <Heart className="h-6 w-6 text-navy-600" />
                        </div>
                      )}
                      <div className="ml-4">
                        <h3 className="font-medium text-navy-900">
                          {member.relationship_type === 'pharmacy' 
                            ? member.pharmacy?.name 
                            : member.provider?.name}
                        </h3>
                        <p className="text-sm text-navy-600">
                          {member.is_primary ? 'Primary Physician' : 
                           member.relationship_type === 'pharmacy' ? 'Pharmacy' : 'Specialist'}
                        </p>
                      </div>
                    </div>

                    <div className="flex space-x-4">
                      {member.relationship_type !== 'pharmacy' && (
                        <>
                          <Button
                            onClick={() => {/* Handle scheduling */}}
                            variant="outline"
                          >
                            <Calendar className="h-4 w-4 mr-2" />
                            Schedule
                          </Button>
                          <Button
                            onClick={() => {/* Handle messaging */}}
                            variant="outline"
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Message
                          </Button>
                        </>
                      )}
                      <Button
                        onClick={() => handleRemoveMember(member.id)}
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}

                {careTeam.length === 0 && (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No Care Team Members</h3>
                    <p className="text-navy-600">
                      Start by selecting your primary physician, specialists, and pharmacy
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Available Providers */}
            <div className="bg-white rounded-xl shadow-luxury p-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-6">Available Providers</h2>
              
              {/* Filter Tabs */}
              <div className="flex space-x-4 mb-6 overflow-x-auto pb-2">
                {['all', 'primary', 'specialist', 'pharmacy'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setFilter(type as any)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      filter === type
                        ? 'bg-gold-gradient text-navy-900'
                        : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                    }`}
                  >
                    {type === 'all' ? 'All' : 
                     type === 'primary' ? 'Primary Physicians' : 
                     type === 'specialist' ? 'Specialists' : 
                     'Pharmacies'}
                  </button>
                ))}
              </div>

              {filter !== 'pharmacy' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {providers
                    .filter(provider => filter === 'all' || 
                      (filter === 'primary' && provider.specialties?.some(s => 
                        s.toLowerCase().includes('primary') || 
                        s.toLowerCase().includes('family') || 
                        s.toLowerCase().includes('internal medicine'))) ||
                      (filter === 'specialist' && !provider.specialties?.some(s => 
                        s.toLowerCase().includes('primary') || 
                        s.toLowerCase().includes('family') || 
                        s.toLowerCase().includes('internal medicine'))))
                    .map((provider) => (
                      <div
                        key={provider.id}
                        className="border rounded-lg overflow-hidden hover:shadow-luxury transition-shadow"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              {provider.profile_image ? (
                                <img
                                  src={provider.profile_image}
                                  alt={provider.name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                                  <Heart className="h-6 w-6 text-navy-600" />
                                </div>
                              )}
                              <div className="ml-3">
                                <h3 className="font-medium text-navy-900">{provider.name}</h3>
                                <p className="text-sm text-navy-600">{provider.practice_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-gold-500 fill-current" />
                              <span className="ml-1 font-medium">{provider.rating.toFixed(1)}</span>
                            </div>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div className="flex flex-wrap gap-2">
                              {provider.specialties?.map((specialty) => (
                                <span
                                  key={specialty}
                                  className="px-2 py-1 text-xs font-medium bg-navy-100 text-navy-800 rounded-full"
                                >
                                  {specialty}
                                </span>
                              ))}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-navy-600">
                                Consultation: ${provider.consultation_fee}
                              </span>
                              <div className="flex gap-2">
                                {provider.video_consultation && (
                                  <span className="text-navy-600">Video</span>
                                )}
                                {provider.in_person_consultation && (
                                  <span className="text-navy-600">In-person</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex space-x-3">
                            {provider.specialties?.some(s => 
                              s.toLowerCase().includes('primary') || 
                              s.toLowerCase().includes('family') || 
                              s.toLowerCase().includes('internal medicine')) && (
                              <Button
                                onClick={() => handleAddProvider(provider.id, true)}
                                variant="luxury"
                                className="flex-1"
                              >
                                Add as Primary
                              </Button>
                            )}
                            <Button
                              onClick={() => handleAddProvider(provider.id, false)}
                              variant={provider.specialties?.some(s => 
                                s.toLowerCase().includes('primary') || 
                                s.toLowerCase().includes('family') || 
                                s.toLowerCase().includes('internal medicine')) ? "outline" : "luxury"}
                              className="flex-1"
                            >
                              Add as Specialist
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {filter === 'pharmacy' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {pharmacies.map((pharmacy) => (
                    <div
                      key={pharmacy.id}
                      className="border rounded-lg overflow-hidden hover:shadow-luxury transition-shadow"
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                              <Pill className="h-6 w-6 text-navy-600" />
                            </div>
                            <div className="ml-3">
                              <h3 className="font-medium text-navy-900">
                                {pharmacy.name}
                              </h3>
                              <p className="text-sm text-navy-600">{pharmacy.address.split(',')[0]}</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 mb-4">
                          <div className="text-sm text-navy-600">
                            <p><strong>Hours:</strong> {pharmacy.hours}</p>
                            <p><strong>Phone:</strong> {pharmacy.phone}</p>
                            <p><strong>Services:</strong> {pharmacy.services.split(',').slice(0, 2).join(', ')}...</p>
                            <p>
                              <strong>Delivery:</strong> {pharmacy.delivery_available ? 
                                `Available (${pharmacy.delivery_radius} mile radius)` : 
                                'Not available'}
                            </p>
                          </div>
                        </div>

                        <Button
                          variant="luxury"
                          onClick={() => handleAddPharmacy(pharmacy.id)}
                          className="w-full"
                        >
                          Add to Care Team
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {((filter !== 'pharmacy' && providers.length === 0) || 
                (filter === 'pharmacy' && pharmacies.length === 0)) && (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">No Providers Available</h3>
                  <p className="text-navy-600">
                    Check back soon for new {filter === 'all' ? 'providers' : filter + 's'}!
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