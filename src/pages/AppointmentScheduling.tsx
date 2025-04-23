import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  Calendar,
  Clock, 
  Bot, 
  Users, 
  ArrowRight, 
  MapPin, 
  DollarSign, 
  Search,
  Star,
  LayoutDashboard,
  Gift,
  Receipt,
  Settings,
  Tag,
  Activity,
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

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: string;
  image_url: string | null;
  active: boolean;
}

interface Partner {
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

interface CareTeamMember {
  id: string;
  partner_id: string;
  is_primary: boolean;
}

export default function AppointmentScheduling() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [step, setStep] = useState<'service' | 'partner'>('service');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    loadInitialData();
    
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

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadServices(),
        loadCareTeam(),
        loadPartners()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadServices = async () => {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('active', true)
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    setServices(data || []);
  };

  const loadCareTeam = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('care_team_members')
      .select(`
        id, 
        partner_id, 
        is_primary
      `)
      .eq('profile_id', user.id);

    if (error) throw error;
    setCareTeam(data || []);
  };

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('status', 'active');

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error('Failed to load partners');
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setStep('partner');
  };

  const handlePartnerSelect = (partner: Partner) => {
    navigate('/appointments/book', { 
      state: { 
        service: selectedService,
        provider: partner
      }
    });
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         service.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || service.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(services.map(service => service.category)));

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
                <Calendar className="h-8 w-8 text-gold-500" />
                <h1 className="text-2xl font-display font-bold text-navy-900">Schedule an Appointment</h1>
              </div>
              <p className="text-navy-600 mb-6">
                Choose from our premium services or use our AI assistant to schedule your appointment
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Clock className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">24/7 Scheduling</h3>
                    <p className="text-sm text-navy-600">Book anytime, anywhere</p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Bot className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">AI Assistant</h3>
                    <p className="text-sm text-navy-600">Smart scheduling help</p>
                  </div>
                </div>
                <div className="flex items-center p-4 bg-navy-50 rounded-lg">
                  <Users className="h-6 w-6 text-navy-600 mr-3" />
                  <div>
                    <h3 className="font-medium text-navy-900">Personalized Care</h3>
                    <p className="text-sm text-navy-600">Find the right provider</p>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Assistant Interface */}
            <div className="bg-white rounded-xl shadow-luxury overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <Bot className="h-6 w-6 text-gold-500" />
                  <h2 className="text-xl font-semibold text-navy-900">
                    Kira: Appointment Scheduler
                  </h2>
                </div>
              </div>
              <div className="relative" style={{ height: '688px' }}>
                <iframe
                  id="JotFormIFrame-01959cf3b3167f43a276d03281f96d06ac83"
                  title="Kira: Appointment Scheduler"
                  allowTransparency={true}
                  allow="geolocation; microphone; camera; fullscreen"
                  src="https://agent.jotform.com/01959cf3b3167f43a276d03281f96d06ac83?embedMode=iframe&background=1&shadow=1"
                  frameBorder="0"
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    backgroundColor: 'transparent'
                  }}
                  scrolling="no"
                />
              </div>
            </div>

            {step === 'service' ? (
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                  <h2 className="text-xl font-semibold text-navy-900 mb-4 md:mb-0">Available Services</h2>
                  
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-initial">
                      <input
                        type="text"
                        placeholder="Search services..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      />
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full md:w-48 px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    >
                      <option value="">All Categories</option>
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.replace('_', ' ').charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-navy-50 rounded-xl overflow-hidden hover:shadow-luxury transition-all duration-300"
                    >
                      {service.image_url && (
                        <div className="h-48 w-full overflow-hidden">
                          <img
                            src={service.image_url}
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-navy-900 mb-2">{service.name}</h3>
                        <p className="text-navy-600 text-sm mb-4">{service.description}</p>
                        <div className="space-y-2 mb-4">
                          <div className="flex items-center text-navy-600 text-sm">
                            <Clock className="h-4 w-4 mr-2" />
                            {service.duration}
                          </div>
                          <div className="flex items-center text-navy-600 text-sm">
                            <DollarSign className="h-4 w-4 mr-2" />
                            ${service.price}
                          </div>
                          <div className="flex items-center text-navy-600 text-sm">
                            <MapPin className="h-4 w-4 mr-2" />
                            {service.category.replace('_', ' ').charAt(0).toUpperCase() + service.category.slice(1)}
                          </div>
                        </div>
                        <Button
                          variant="luxury"
                          className="w-full"
                          onClick={() => handleServiceSelect(service)}
                        >
                          Select Service
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-navy-900">Select a Provider</h2>
                    <p className="text-navy-600">
                      Choose a healthcare provider for {selectedService?.name}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setStep('service')}
                  >
                    Back to Services
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {partners.map((partner) => {
                    const isInCareTeam = careTeam.some(member => member.partner_id === partner.id);
                    const isPrimary = careTeam.some(member => member.partner_id === partner.id && member.is_primary);

                    return (
                      <div
                        key={partner.id}
                        className="border rounded-lg overflow-hidden hover:shadow-luxury transition-shadow"
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center">
                              {partner.profile_image ? (
                                <img
                                  src={partner.profile_image}
                                  alt={partner.name}
                                  className="h-12 w-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                                  <Users className="h-6 w-6 text-navy-600" />
                                </div>
                              )}
                              <div className="ml-3">
                                <h3 className="font-medium text-navy-900">
                                  {partner.name}
                                </h3>
                                <p className="text-sm text-navy-600">{partner.practice_name}</p>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-gold-500 fill-current" />
                              <span className="ml-1 text-sm font-medium text-navy-600">
                                {partner.rating.toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 mb-4">
                            <div className="flex items-center text-navy-600">
                              <MapPin className="h-4 w-4 mr-2" />
                              {partner.practice_address.city}, {partner.practice_address.state}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {partner.specialties?.map((specialty) => (
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
                                Consultation: ${partner.consultation_fee}
                              </span>
                              <div className="flex gap-2">
                                {partner.video_consultation && (
                                  <span className="text-navy-600">Video</span>
                                )}
                                {partner.in_person_consultation && (
                                  <span className="text-navy-600">In-person</span>
                                )}
                              </div>
                            </div>
                            {isInCareTeam && (
                              <div className="text-sm font-medium text-gold-600">
                                {isPrimary ? 'Your Primary Provider' : 'In Your Care Team'}
                              </div>
                            )}
                          </div>

                          <Button
                            variant="luxury"
                            className="w-full"
                            onClick={() => handlePartnerSelect(partner)}
                          >
                            Book Appointment
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}