import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Pill, Search, MapPin, Phone, Clock, CheckCircle, Truck, CreditCard, Calendar, Bot, FileText, ArrowRight, X, LayoutDashboard, Gift, Receipt, Settings, Tag, Activity, Users, MessageSquare, ChevronLeft, ChevronRight, LogOut, Menu, Bone as Drone, Package, Mail, AlertCircle, Clipboard, RefreshCw, Video, MessageSquareText, User, Bell } from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

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
  delivery_radius: number | null;
  status: string;
}

interface CareTeamMember {
  id: string;
  pharmacy_id: string;
  is_primary: boolean;
}

interface Prescription {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  refills_remaining: number;
  last_filled: string;
  next_refill: string;
  status: 'active' | 'pending' | 'expired';
  image_url: string;
}

interface DeliveryOption {
  id: string;
  name: string;
  description: string;
  eta: string;
  price: number;
  icon: React.ReactNode;
}

interface DeliveryTimeSlot {
  id: string;
  time: string;
  available: boolean;
}

export default function Pharmacy() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [showModal, setShowModal] = useState(false);
  const jotformRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  // Pharmacy Services States
  const [activeTab, setActiveTab] = useState<'delivery' | 'prescriptions' | 'consultation'>('delivery');
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [selectedDeliveryOption, setSelectedDeliveryOption] = useState<string | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [deliveryTimeSlots, setDeliveryTimeSlots] = useState<DeliveryTimeSlot[]>([]);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [showDeliveryConfirmation, setShowDeliveryConfirmation] = useState(false);
  const [deliveryStatus, setDeliveryStatus] = useState<'pending' | 'processing' | 'in_transit' | 'delivered' | null>(null);
  const [showConsultationModal, setShowConsultationModal] = useState(false);
  const [consultationType, setConsultationType] = useState<'video' | 'chat'>('video');
  const [consultationDate, setConsultationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [consultationTimeSlot, setConsultationTimeSlot] = useState<string | null>(null);
  const [consultationNotes, setConsultationNotes] = useState<string>('');
  const [showConsultationConfirmation, setShowConsultationConfirmation] = useState(false);
  const [showPrescriptionDetail, setShowPrescriptionDetail] = useState(false);
  const [showDeliveryTracking, setShowDeliveryTracking] = useState(false);
  const [deliveryProgress, setDeliveryProgress] = useState(0);
  const [estimatedArrival, setEstimatedArrival] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    loadInitialData();
    
    // Initialize JotForm
    const script = document.createElement('script');
    script.src = 'https://cdn.jotfor.ms/s/umd/latest/for-form-embed-handler.js';
    script.async = true;
    document.body.appendChild(script);
    
    script.onload = () => {
      if (window.jotformEmbedHandler) {
        window.jotformEmbedHandler(
          "iframe[id='JotFormIFrame-019612f0c5187441a46efa2af9b7fce859c4']",
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
    
    // Initialize mock data
    initializeMockData();
    
    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, [user, navigate]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        loadPharmacies(),
        loadCareTeam()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacies = async () => {
    const { data, error } = await supabase
      .from('pharmacies')
      .select('*')
      .eq('status', 'active')
      .order('name', { ascending: true });

    if (error) throw error;
    setPharmacies(data || []);
  };

  const loadCareTeam = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('care_team_members')
      .select('id, pharmacy_id, is_primary')
      .eq('profile_id', user.id)
      .not('pharmacy_id', 'is', null);

    if (error) throw error;
    setCareTeam(data || []);
  };

  const initializeMockData = () => {
    // Initialize mock prescriptions
    const mockPrescriptions: Prescription[] = [
      {
        id: '1',
        name: 'Lisinopril',
        dosage: '10mg',
        instructions: 'Take 1 tablet by mouth once daily',
        refills_remaining: 3,
        last_filled: '2025-03-15',
        next_refill: '2025-04-15',
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=300&q=80'
      },
      {
        id: '2',
        name: 'Atorvastatin',
        dosage: '20mg',
        instructions: 'Take 1 tablet by mouth at bedtime',
        refills_remaining: 2,
        last_filled: '2025-03-01',
        next_refill: '2025-04-01',
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?auto=format&fit=crop&w=300&q=80'
      },
      {
        id: '3',
        name: 'Metformin',
        dosage: '500mg',
        instructions: 'Take 1 tablet by mouth twice daily with meals',
        refills_remaining: 0,
        last_filled: '2025-02-15',
        next_refill: '2025-03-15',
        status: 'expired',
        image_url: 'https://images.unsplash.com/photo-1550572017-edd951b55104?auto=format&fit=crop&w=300&q=80'
      },
      {
        id: '4',
        name: 'Levothyroxine',
        dosage: '75mcg',
        instructions: 'Take 1 tablet by mouth daily on an empty stomach',
        refills_remaining: 5,
        last_filled: '2025-03-20',
        next_refill: '2025-04-20',
        status: 'active',
        image_url: 'https://images.unsplash.com/photo-1626716493137-b67fe9501e76?auto=format&fit=crop&w=300&q=80'
      },
      {
        id: '5',
        name: 'Sertraline',
        dosage: '50mg',
        instructions: 'Take 1 tablet by mouth once daily in the morning',
        refills_remaining: 1,
        last_filled: '2025-03-10',
        next_refill: '2025-04-10',
        status: 'pending',
        image_url: 'https://images.unsplash.com/photo-1628771065518-0d82f1938462?auto=format&fit=crop&w=300&q=80'
      }
    ];
    
    setPrescriptions(mockPrescriptions);
    
    // Initialize mock delivery options
    const mockDeliveryOptions: DeliveryOption[] = [
      {
        id: 'drone',
        name: 'Drone Delivery',
        description: 'Fastest option - arrives within 2 hours',
        eta: '2 hours',
        price: 15.99,
        icon: <Drone className="h-6 w-6 text-gold-500" />
      },
      {
        id: 'courier',
        name: 'Courier Delivery',
        description: 'Same-day delivery by dedicated courier',
        eta: '4-6 hours',
        price: 9.99,
        icon: <Package className="h-6 w-6 text-navy-600" />
      },
      {
        id: 'standard',
        name: 'Standard Delivery',
        description: 'Next-day delivery via mail service',
        eta: '1-2 days',
        price: 0,
        icon: <Mail className="h-6 w-6 text-navy-400" />
      }
    ];
    
    setDeliveryOptions(mockDeliveryOptions);
    
    // Initialize mock time slots
    const generateTimeSlots = () => {
      const slots: DeliveryTimeSlot[] = [];
      const startHour = 9; // 9 AM
      const endHour = 19; // 7 PM
      
      for (let hour = startHour; hour <= endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          slots.push({
            id: `slot-${time}`,
            time: time,
            available: Math.random() > 0.3 // 70% chance of being available
          });
        }
      }
      
      return slots;
    };
    
    setDeliveryTimeSlots(generateTimeSlots());
    
    // Set default delivery address
    setDeliveryAddress('123 Main St, San Francisco, CA 94105');
    
    // Set estimated arrival time
    const now = new Date();
    now.setHours(now.getHours() + 2);
    setEstimatedArrival(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
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
      
      toast.success('Pharmacy added to your care team');
      loadCareTeam();
    } catch (error) {
      console.error('Error adding pharmacy:', error);
      toast.error('Failed to add pharmacy');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePharmacy = async (memberId: string) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('care_team_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      
      toast.success('Pharmacy removed from your care team');
      loadCareTeam();
    } catch (error) {
      console.error('Error removing pharmacy:', error);
      toast.error('Failed to remove pharmacy');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPharmacy = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setShowModal(true);
  };

  const filteredPharmacies = pharmacies.filter(pharmacy => {
    const matchesSearch = pharmacy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pharmacy.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         pharmacy.services.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const isInCareTeam = (pharmacyId: string) => {
    return careTeam.some(member => member.pharmacy_id === pharmacyId);
  };

  const getCareTeamMemberId = (pharmacyId: string) => {
    const member = careTeam.find(member => member.pharmacy_id === pharmacyId);
    return member?.id;
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
  
  // Pharmacy Services Handlers
  const handlePrescriptionSelect = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setShowPrescriptionDetail(true);
  };
  
  const handleDeliveryOptionSelect = (optionId: string) => {
    setSelectedDeliveryOption(optionId);
  };
  
  const handleTimeSlotSelect = (slotId: string) => {
    setSelectedTimeSlot(slotId);
  };
  
  const handleScheduleDelivery = () => {
    if (!selectedDeliveryOption || !selectedTimeSlot) {
      toast.error('Please select a delivery option and time slot');
      return;
    }
    
    setShowDeliveryConfirmation(true);
    
    // Simulate delivery status
    setDeliveryStatus('pending');
  };
  
  const handleConfirmDelivery = () => {
    setShowDeliveryConfirmation(false);
    setDeliveryStatus('processing');
    toast.success('Delivery scheduled successfully!');
    
    // Show tracking after a delay
    setTimeout(() => {
      setShowDeliveryTracking(true);
      
      // Simulate delivery progress
      const interval = setInterval(() => {
        setDeliveryProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setDeliveryStatus('delivered');
            return 100;
          }
          return prev + 5;
        });
      }, 1000);
    }, 1500);
  };
  
  const handleRequestRefill = (prescription: Prescription) => {
    setSelectedPrescription(prescription);
    setActiveTab('delivery');
    setShowPrescriptionDetail(false);
    toast.success('Prescription added to delivery');
  };
  
  const handleScheduleConsultation = () => {
    if (!consultationDate || !consultationTimeSlot) {
      toast.error('Please select a date and time for your consultation');
      return;
    }
    
    setShowConsultationConfirmation(true);
  };
  
  const handleConfirmConsultation = () => {
    setShowConsultationConfirmation(false);
    toast.success('Consultation scheduled successfully!');
    setConsultationDate('');
    setConsultationTimeSlot(null);
    setConsultationNotes('');
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
                <Pill className="h-8 w-8 text-gold-500" />
                <h1 className="text-2xl font-display font-bold text-navy-900">Pharmacy Services</h1>
              </div>
              <p className="text-navy-600 mb-6">
                Manage your medications, schedule deliveries, and consult with pharmacists
              </p>
            </div>

            {/* Pharmacy Services Tabs */}
            <div className="bg-white rounded-xl shadow-luxury overflow-hidden mb-8">
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('delivery')}
                  className={`flex-1 py-4 px-4 text-center font-medium ${
                    activeTab === 'delivery'
                      ? 'text-gold-500 border-b-2 border-gold-500'
                      : 'text-navy-600 hover:text-navy-900'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <Truck className="h-6 w-6 mb-1" />
                    <span>Medication Delivery</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('prescriptions')}
                  className={`flex-1 py-4 px-4 text-center font-medium ${
                    activeTab === 'prescriptions'
                      ? 'text-gold-500 border-b-2 border-gold-500'
                      : 'text-navy-600 hover:text-navy-900'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <Clipboard className="h-6 w-6 mb-1" />
                    <span>Prescriptions</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('consultation')}
                  className={`flex-1 py-4 px-4 text-center font-medium ${
                    activeTab === 'consultation'
                      ? 'text-gold-500 border-b-2 border-gold-500'
                      : 'text-navy-600 hover:text-navy-900'
                  }`}
                >
                  <div className="flex flex-col items-center">
                    <MessageSquare className="h-6 w-6 mb-1" />
                    <span>Consultation</span>
                  </div>
                </button>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {/* Medication Delivery Tab */}
                {activeTab === 'delivery' && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-xl font-semibold text-navy-900 mb-4">Schedule Medication Delivery</h2>
                      
                      {/* Prescription Selection */}
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-navy-700 mb-2">
                          Select Medication
                        </label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {prescriptions
                            .filter(p => p.status === 'active')
                            .map(prescription => (
                              <div 
                                key={prescription.id}
                                className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                  selectedPrescription?.id === prescription.id 
                                    ? 'border-gold-500 bg-gold-50' 
                                    : 'border-gray-200 hover:border-gold-300'
                                }`}
                                onClick={() => setSelectedPrescription(prescription)}
                              >
                                <div className="flex items-center">
                                  <div className="h-12 w-12 rounded-lg bg-navy-50 flex items-center justify-center overflow-hidden">
                                    <Pill className="h-6 w-6 text-navy-600" />
                                  </div>
                                  <div className="ml-3">
                                    <h3 className="font-medium text-navy-900">{prescription.name}</h3>
                                    <p className="text-sm text-navy-600">{prescription.dosage} • {prescription.refills_remaining} refills left</p>
                                  </div>
                                </div>
                              </div>
                          ))}
                        </div>
                        {prescriptions.filter(p => p.status === 'active').length === 0 && (
                          <div className="text-center py-4 bg-navy-50 rounded-lg">
                            <p className="text-navy-600">No active prescriptions available for delivery</p>
                          </div>
                        )}
                      </div>

                      {/* Delivery Options */}
                      {selectedPrescription && (
                        <>
                          <div className="mb-6">
                            <label className="block text-sm font-medium text-navy-700 mb-2">
                              Select Delivery Method
                            </label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              {deliveryOptions.map(option => (
                                <div 
                                  key={option.id}
                                  className={`border rounded-lg p-4 cursor-pointer transition-all ${
                                    selectedDeliveryOption === option.id 
                                      ? 'border-gold-500 bg-gold-50' 
                                      : 'border-gray-200 hover:border-gold-300'
                                  }`}
                                  onClick={() => handleDeliveryOptionSelect(option.id)}
                                >
                                  <div className="flex flex-col items-center text-center">
                                    {option.icon}
                                    <h3 className="font-medium text-navy-900 mt-2">{option.name}</h3>
                                    <p className="text-sm text-navy-600 mt-1">{option.description}</p>
                                    <div className="mt-2 flex items-center">
                                      <span className="font-medium text-navy-900">
                                        {option.price === 0 ? 'Free' : `$${option.price.toFixed(2)}`}
                                      </span>
                                      {option.id === 'drone' && (
                                        <span className="ml-2 px-2 py-1 bg-gold-100 text-gold-800 text-xs font-medium rounded-full">
                                          Fastest Option
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Delivery Date and Time */}
                          {selectedDeliveryOption && (
                            <div className="mb-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                  <label className="block text-sm font-medium text-navy-700 mb-2">
                                    Delivery Date
                                  </label>
                                  <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={(e) => setDeliveryDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium text-navy-700 mb-2">
                                    Delivery Time
                                  </label>
                                  <div className="grid grid-cols-3 gap-2">
                                    {deliveryTimeSlots
                                      .filter(slot => slot.available)
                                      .slice(0, 6)
                                      .map(slot => (
                                        <button
                                          key={slot.id}
                                          className={`py-2 px-3 text-center rounded-lg border ${
                                            selectedTimeSlot === slot.id
                                              ? 'bg-gold-500 text-white border-gold-500'
                                              : 'bg-white text-navy-900 border-gray-200 hover:border-gold-300'
                                          }`}
                                          onClick={() => handleTimeSlotSelect(slot.id)}
                                        >
                                          {slot.time}
                                        </button>
                                      ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Delivery Address */}
                          {selectedTimeSlot && (
                            <div className="mb-6">
                              <label className="block text-sm font-medium text-navy-700 mb-2">
                                Delivery Address
                              </label>
                              <div className="flex">
                                <input
                                  type="text"
                                  value={deliveryAddress}
                                  onChange={(e) => setDeliveryAddress(e.target.value)}
                                  className="flex-1 rounded-l-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                                  placeholder="Enter delivery address"
                                />
                                <button className="bg-navy-50 px-4 rounded-r-lg border border-gray-200 border-l-0 text-navy-600">
                                  <MapPin className="h-5 w-5" />
                                </button>
                              </div>
                              <p className="mt-1 text-sm text-navy-600">
                                We'll deliver to this address
                              </p>
                            </div>
                          )}

                          {/* Schedule Button */}
                          {selectedTimeSlot && (
                            <div className="flex justify-end">
                              <Button
                                variant="luxury"
                                onClick={handleScheduleDelivery}
                                disabled={!selectedPrescription || !selectedDeliveryOption || !selectedTimeSlot}
                              >
                                Schedule Delivery
                                <ArrowRight className="ml-2 h-5 w-5" />
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                    
                    {/* Delivery Tracking */}
                    {showDeliveryTracking && (
                      <div className="mt-8 bg-navy-50 rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="text-lg font-semibold text-navy-900">Delivery Status</h3>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            deliveryStatus === 'delivered' ? 'bg-green-100 text-green-800' :
                            deliveryStatus === 'in_transit' ? 'bg-blue-100 text-blue-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {deliveryStatus === 'delivered' ? 'Delivered' :
                             deliveryStatus === 'in_transit' ? 'In Transit' :
                             deliveryStatus === 'processing' ? 'Processing' : 'Pending'}
                          </span>
                        </div>
                        
                        <div className="mb-4">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className="bg-gold-500 h-2.5 rounded-full transition-all duration-500" 
                              style={{ width: `${deliveryProgress}%` }}
                            ></div>
                          </div>
                          <div className="flex justify-between mt-2 text-sm text-navy-600">
                            <span>Order Placed</span>
                            <span>Processing</span>
                            <span>In Transit</span>
                            <span>Delivered</span>
                          </div>
                        </div>
                        
                        <div className="bg-white rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-navy-100 flex items-center justify-center">
                                {selectedDeliveryOption === 'drone' ? (
                                  <Drone className="h-5 w-5 text-navy-600" />
                                ) : selectedDeliveryOption === 'courier' ? (
                                  <Package className="h-5 w-5 text-navy-600" />
                                ) : (
                                  <Mail className="h-5 w-5 text-navy-600" />
                                )}
                              </div>
                              <div className="ml-3">
                                <p className="font-medium text-navy-900">
                                  {selectedPrescription?.name} {selectedPrescription?.dosage}
                                </p>
                                <p className="text-sm text-navy-600">
                                  Estimated arrival: {estimatedArrival}
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDeliveryTracking(false)}
                            >
                              Close
                            </Button>
                          </div>
                        </div>
                        
                        {deliveryStatus === 'delivered' && (
                          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                            <div className="flex">
                              <div className="flex-shrink-0">
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              </div>
                              <div className="ml-3">
                                <p className="text-sm text-green-700">
                                  Your medication has been delivered successfully!
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Prescriptions Tab */}
                {activeTab === 'prescriptions' && (
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-semibold text-navy-900">My Prescriptions</h2>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search medications..."
                          className="pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                        <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {prescriptions.map(prescription => (
                        <div 
                          key={prescription.id}
                          className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-luxury transition-shadow cursor-pointer"
                          onClick={() => handlePrescriptionSelect(prescription)}
                        >
                          <div className="flex h-full">
                            <div className="w-1/3 bg-navy-50 flex items-center justify-center p-4">
                              <div className="h-24 w-24 rounded-full bg-white flex items-center justify-center overflow-hidden">
                                <Pill className="h-12 w-12 text-navy-300" />
                              </div>
                            </div>
                            <div className="w-2/3 p-4 flex flex-col justify-between">
                              <div>
                                <div className="flex justify-between items-start">
                                  <h3 className="font-semibold text-navy-900">{prescription.name}</h3>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    prescription.status === 'active' ? 'bg-green-100 text-green-800' :
                                    prescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {prescription.status.charAt(0).toUpperCase() + prescription.status.slice(1)}
                                  </span>
                                </div>
                                <p className="text-sm text-navy-600 mt-1">{prescription.dosage}</p>
                                <p className="text-sm text-navy-600 mt-1">{prescription.instructions}</p>
                                <p className="text-sm text-navy-600 mt-2">
                                  <span className="font-medium">Refills:</span> {prescription.refills_remaining} remaining
                                </p>
                                <p className="text-sm text-navy-600">
                                  <span className="font-medium">Next refill:</span> {prescription.next_refill}
                                </p>
                              </div>
                              <div className="mt-4 flex space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePrescriptionSelect(prescription);
                                  }}
                                  className="flex-1"
                                >
                                  View Details
                                </Button>
                                {prescription.status === 'active' && (
                                  <Button
                                    variant="luxury"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRequestRefill(prescription);
                                    }}
                                    className="flex-1"
                                  >
                                    Refill & Deliver
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {prescriptions.length === 0 && (
                      <div className="text-center py-12 bg-navy-50 rounded-lg">
                        <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-navy-900 mb-2">No Prescriptions Found</h3>
                        <p className="text-navy-600 mb-6">
                          You don't have any prescriptions in your account yet.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Consultation Tab */}
                {activeTab === 'consultation' && (
                  <div>
                    <h2 className="text-xl font-semibold text-navy-900 mb-6">Schedule Pharmacist Consultation</h2>
                    
                    <div className="bg-navy-50 rounded-xl p-6 mb-6">
                      <h3 className="font-medium text-navy-900 mb-4">Consultation Type</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div 
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            consultationType === 'video' 
                              ? 'border-gold-500 bg-gold-50' 
                              : 'border-gray-200 hover:border-gold-300 bg-white'
                          }`}
                          onClick={() => setConsultationType('video')}
                        >
                          <div className="flex flex-col items-center text-center">
                            <Video className="h-8 w-8 text-navy-600" />
                            <h3 className="font-medium text-navy-900 mt-2">Video Consultation</h3>
                            <p className="text-sm text-navy-600 mt-1">Face-to-face video call with a pharmacist</p>
                          </div>
                        </div>
                        
                        <div 
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            consultationType === 'chat' 
                              ? 'border-gold-500 bg-gold-50' 
                              : 'border-gray-200 hover:border-gold-300 bg-white'
                          }`}
                          onClick={() => setConsultationType('chat')}
                        >
                          <div className="flex flex-col items-center text-center">
                            <MessageSquareText className="h-8 w-8 text-navy-600" />
                            <h3 className="font-medium text-navy-900 mt-2">Chat Consultation</h3>
                            <p className="text-sm text-navy-600 mt-1">Text-based chat with a pharmacist</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
                      <h3 className="font-medium text-navy-900 mb-4">Select Pharmacist</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {pharmacies
                          .filter(pharmacy => isInCareTeam(pharmacy.id))
                          .slice(0, 2)
                          .map(pharmacy => (
                            <div 
                              key={pharmacy.id}
                              className="border rounded-lg p-4 cursor-pointer hover:border-gold-300 transition-all"
                            >
                              <div className="flex items-center">
                                <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                                  <User className="h-6 w-6 text-navy-600" />
                                </div>
                                <div className="ml-3">
                                  <h3 className="font-medium text-navy-900">Dr. {pharmacy.name.split(' ')[1] || 'Smith'}</h3>
                                  <p className="text-sm text-navy-600">{pharmacy.name}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                      {pharmacies.filter(pharmacy => isInCareTeam(pharmacy.id)).length === 0 && (
                        <div className="text-center py-4">
                          <p className="text-navy-600">No pharmacies in your care team</p>
                          <p className="text-sm text-navy-500 mt-1">Add a pharmacy to your care team first</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-2">
                          Consultation Date
                        </label>
                        <input
                          type="date"
                          value={consultationDate}
                          onChange={(e) => setConsultationDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-navy-700 mb-2">
                          Preferred Time
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {['09:00', '11:00', '13:00', '15:00', '17:00', '19:00'].map(time => (
                            <button
                              key={time}
                              className={`py-2 px-3 text-center rounded-lg border ${
                                consultationTimeSlot === time
                                  ? 'bg-gold-500 text-white border-gold-500'
                                  : 'bg-white text-navy-900 border-gray-200 hover:border-gold-300'
                              }`}
                              onClick={() => setConsultationTimeSlot(time)}
                            >
                              {time}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-navy-700 mb-2">
                        Consultation Notes (Optional)
                      </label>
                      <textarea
                        value={consultationNotes}
                        onChange={(e) => setConsultationNotes(e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                        placeholder="Describe what you'd like to discuss with the pharmacist..."
                      />
                    </div>
                    
                    <div className="flex justify-end">
                      <Button
                        variant="luxury"
                        onClick={handleScheduleConsultation}
                        disabled={!consultationDate || !consultationTimeSlot}
                      >
                        Schedule Consultation
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MedScript AI Assistant */}
            <div className="bg-white rounded-xl shadow-luxury overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-center space-x-3">
                  <Bot className="h-6 w-6 text-gold-500" />
                  <h2 className="text-xl font-semibold text-navy-900">
                    MedScript AI Assistant
                  </h2>
                </div>
              </div>
              <div className="relative" ref={jotformRef}>
                <iframe 
                  id="JotFormIFrame-019612f0c5187441a46efa2af9b7fce859c4" 
                  title="Pharmacist AI Agent"
                  allowTransparency={true}
                  allow="geolocation; microphone; camera; fullscreen"
                  src="https://hipaa.jotform.com/agent/019612f0c5187441a46efa2af9b7fce859c4?embedMode=iframe&background=1&shadow=1"
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

            {/* My Pharmacies */}
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <h2 className="text-xl font-semibold text-navy-900 mb-6">My Pharmacies</h2>
              
              {careTeam.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {careTeam.map((member) => {
                    const pharmacy = pharmacies.find(p => p.id === member.pharmacy_id);
                    if (!pharmacy) return null;
                    
                    return (
                      <div
                        key={member.id}
                        className="bg-navy-50 rounded-xl overflow-hidden hover:shadow-luxury transition-all duration-300"
                      >
                        <div className="p-6">
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center">
                              <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                                <Pill className="h-6 w-6 text-navy-600" />
                              </div>
                              <div className="ml-3">
                                <h3 className="text-lg font-semibold text-navy-900">{pharmacy.name}</h3>
                                {member.is_primary && (
                                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                    Primary
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-3 mb-4">
                            <div className="flex items-center text-navy-600 text-sm">
                              <MapPin className="h-4 w-4 mr-2" />
                              {pharmacy.address}
                            </div>
                            <div className="flex items-center text-navy-600 text-sm">
                              <Phone className="h-4 w-4 mr-2" />
                              {pharmacy.phone}
                            </div>
                            <div className="flex items-center text-navy-600 text-sm">
                              <Clock className="h-4 w-4 mr-2" />
                              {pharmacy.hours}
                            </div>
                            {pharmacy.delivery_available && (
                              <div className="flex items-center text-navy-600 text-sm">
                                <Truck className="h-4 w-4 mr-2" />
                                Delivery available ({pharmacy.delivery_radius} mile radius)
                              </div>
                            )}
                          </div>
                          
                          <div className="flex space-x-3">
                            <Button
                              variant="outline"
                              className="flex-1"
                              onClick={() => handleViewPharmacy(pharmacy)}
                            >
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1 text-red-600 hover:bg-red-50"
                              onClick={() => handleRemovePharmacy(member.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 bg-navy-50 rounded-lg">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">No Pharmacies Added</h3>
                  <p className="text-navy-600 mb-6">
                    You haven't added any pharmacies to your care team yet.
                  </p>
                </div>
              )}
            </div>

            {/* Available Pharmacies */}
            <div className="bg-white rounded-xl shadow-luxury p-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
                <h2 className="text-xl font-semibold text-navy-900 mb-4 md:mb-0">Available Pharmacies</h2>
                
                <div className="w-full md:w-auto">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search pharmacies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full md:w-64 pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredPharmacies
                  .filter(pharmacy => !isInCareTeam(pharmacy.id))
                  .map((pharmacy) => (
                    <div
                      key={pharmacy.id}
                      className="bg-white border rounded-xl overflow-hidden hover:shadow-luxury transition-all duration-300"
                    >
                      <div className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex items-center">
                            <div className="h-12 w-12 rounded-full bg-navy-100 flex items-center justify-center">
                              <Pill className="h-6 w-6 text-navy-600" />
                            </div>
                            <div className="ml-3">
                              <h3 className="text-lg font-semibold text-navy-900">{pharmacy.name}</h3>
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <div className="flex items-center text-navy-600 text-sm">
                            <MapPin className="h-4 w-4 mr-2" />
                            {pharmacy.address}
                          </div>
                          <div className="flex items-center text-navy-600 text-sm">
                            <Phone className="h-4 w-4 mr-2" />
                            {pharmacy.phone}
                          </div>
                          <div className="flex items-center text-navy-600 text-sm">
                            <Clock className="h-4 w-4 mr-2" />
                            {pharmacy.hours}
                          </div>
                          {pharmacy.delivery_available && (
                            <div className="flex items-center text-navy-600 text-sm">
                              <Truck className="h-4 w-4 mr-2" />
                              Delivery available ({pharmacy.delivery_radius} mile radius)
                            </div>
                          )}
                        </div>
                        
                        <div className="flex space-x-3">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => handleViewPharmacy(pharmacy)}
                          >
                            View Details
                          </Button>
                          <Button
                            variant="luxury"
                            className="flex-1"
                            onClick={() => handleAddPharmacy(pharmacy.id)}
                          >
                            Add Pharmacy
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {filteredPharmacies.filter(pharmacy => !isInCareTeam(pharmacy.id)).length === 0 && (
                <div className="text-center py-12 bg-navy-50 rounded-lg">
                  <Pill className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">No Available Pharmacies</h3>
                  <p className="text-navy-600">
                    {searchTerm ? 'No pharmacies match your search criteria.' : 'You have added all available pharmacies to your care team.'}
                  </p>
                </div>
              )}
            </div>

            {/* Pharmacy Detail Modal */}
            {showModal && selectedPharmacy && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-full bg-navy-100 flex items-center justify-center">
                        <Pill className="h-8 w-8 text-navy-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-semibold text-navy-900">{selectedPharmacy.name}</h3>
                        <p className="text-navy-600">{selectedPharmacy.address}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="bg-navy-50 rounded-lg p-4">
                      <h4 className="font-medium text-navy-900 mb-3">Contact Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center text-navy-600">
                          <Phone className="h-5 w-5 mr-3" />
                          {selectedPharmacy.phone}
                        </div>
                        <div className="flex items-center text-navy-600">
                          <Clock className="h-5 w-5 mr-3" />
                          {selectedPharmacy.hours}
                        </div>
                      </div>
                    </div>

                    <div className="bg-navy-50 rounded-lg p-4">
                      <h4 className="font-medium text-navy-900 mb-3">Services</h4>
                      <div className="space-y-2">
                        {selectedPharmacy.services.split(',').map((service, index) => (
                          <div key={index} className="flex items-center text-navy-600">
                            <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            {service.trim()}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 mb-6">
                    <div className="bg-navy-50 rounded-lg p-4">
                      <h4 className="font-medium text-navy-900 mb-3">Insurance Accepted</h4>
                      <p className="text-navy-600">{selectedPharmacy.insurance_accepted}</p>
                    </div>

                    {selectedPharmacy.delivery_available && (
                      <div className="bg-navy-50 rounded-lg p-4">
                        <h4 className="font-medium text-navy-900 mb-3">Delivery Information</h4>
                        <div className="flex items-center text-navy-600">
                          <Truck className="h-5 w-5 mr-3" />
                          <span>Delivery available within {selectedPharmacy.delivery_radius} mile radius</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowModal(false)}
                    >
                      Close
                    </Button>
                    
                    {isInCareTeam(selectedPharmacy.id) ? (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => {
                          const memberId = getCareTeamMemberId(selectedPharmacy.id);
                          if (memberId) {
                            handleRemovePharmacy(memberId);
                            setShowModal(false);
                          }
                        }}
                      >
                        Remove from Care Team
                      </Button>
                    ) : (
                      <Button
                        variant="luxury"
                        onClick={() => {
                          handleAddPharmacy(selectedPharmacy.id);
                          setShowModal(false);
                        }}
                      >
                        Add to Care Team
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Prescription Detail Modal */}
            {showPrescriptionDetail && selectedPrescription && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center">
                      <div className="h-16 w-16 rounded-full bg-navy-100 flex items-center justify-center">
                        <Pill className="h-8 w-8 text-navy-600" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-2xl font-semibold text-navy-900">{selectedPrescription.name}</h3>
                        <p className="text-navy-600">{selectedPrescription.dosage}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPrescriptionDetail(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>

                  <div className="bg-navy-50 rounded-lg p-6 mb-6">
                    <h4 className="font-medium text-navy-900 mb-3">Prescription Details</h4>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-navy-500">Instructions</p>
                        <p className="font-medium text-navy-900">{selectedPrescription.instructions}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-navy-500">Refills Remaining</p>
                          <p className="font-medium text-navy-900">{selectedPrescription.refills_remaining}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Last Filled</p>
                          <p className="font-medium text-navy-900">{selectedPrescription.last_filled}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Next Refill</p>
                          <p className="font-medium text-navy-900">{selectedPrescription.next_refill}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Status</p>
                          <p className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            selectedPrescription.status === 'active' ? 'bg-green-100 text-green-800' :
                            selectedPrescription.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {selectedPrescription.status.charAt(0).toUpperCase() + selectedPrescription.status.slice(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowPrescriptionDetail(false)}
                    >
                      Close
                    </Button>
                    
                    {selectedPrescription.status === 'active' && (
                      <div className="space-x-3">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPrescriptionDetail(false);
                            setActiveTab('consultation');
                          }}
                        >
                          Ask Pharmacist
                        </Button>
                        <Button
                          variant="luxury"
                          onClick={() => {
                            setShowPrescriptionDetail(false);
                            setActiveTab('delivery');
                          }}
                        >
                          Refill & Deliver
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Delivery Confirmation Modal */}
            {showDeliveryConfirmation && selectedPrescription && selectedDeliveryOption && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <div className="text-center mb-6">
                    <div className="h-16 w-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Truck className="h-8 w-8 text-gold-500" />
                    </div>
                    <h3 className="text-xl font-bold text-navy-900">Confirm Delivery</h3>
                  </div>

                  <div className="bg-navy-50 rounded-lg p-4 mb-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-navy-600">Medication:</span>
                        <span className="font-medium text-navy-900">{selectedPrescription.name} {selectedPrescription.dosage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Delivery Method:</span>
                        <span className="font-medium text-navy-900">
                          {deliveryOptions.find(o => o.id === selectedDeliveryOption)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Delivery Date:</span>
                        <span className="font-medium text-navy-900">{deliveryDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Delivery Time:</span>
                        <span className="font-medium text-navy-900">
                          {deliveryTimeSlots.find(s => s.id === selectedTimeSlot)?.time}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Delivery Address:</span>
                        <span className="font-medium text-navy-900">{deliveryAddress}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Delivery Fee:</span>
                        <span className="font-medium text-navy-900">
                          {deliveryOptions.find(o => o.id === selectedDeliveryOption)?.price === 0 
                            ? 'Free' 
                            : `$${deliveryOptions.find(o => o.id === selectedDeliveryOption)?.price.toFixed(2)}`}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeliveryConfirmation(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="luxury"
                      onClick={handleConfirmDelivery}
                    >
                      Confirm Delivery
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Consultation Confirmation Modal */}
            {showConsultationConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                  <div className="text-center mb-6">
                    <div className="h-16 w-16 bg-gold-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <MessageSquare className="h-8 w-8 text-gold-500" />
                    </div>
                    <h3 className="text-xl font-bold text-navy-900">Confirm Consultation</h3>
                  </div>

                  <div className="bg-navy-50 rounded-lg p-4 mb-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-navy-600">Consultation Type:</span>
                        <span className="font-medium text-navy-900">
                          {consultationType === 'video' ? 'Video Call' : 'Chat'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Date:</span>
                        <span className="font-medium text-navy-900">{consultationDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-navy-600">Time:</span>
                        <span className="font-medium text-navy-900">{consultationTimeSlot}</span>
                      </div>
                      {consultationNotes && (
                        <div>
                          <span className="text-navy-600">Notes:</span>
                          <p className="mt-1 text-navy-900">{consultationNotes}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={() => setShowConsultationConfirmation(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="luxury"
                      onClick={handleConfirmConsultation}
                    >
                      Confirm Consultation
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