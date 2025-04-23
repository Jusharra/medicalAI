import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  BarChart, 
  Users, 
  Calendar, 
  DollarSign, 
  Settings, 
  Tag, 
  Gift, 
  FileText, 
  LogOut,
  Menu,
  X, 
  LayoutDashboard, 
  UserPlus, 
  Activity, 
  Phone, 
  FileText as FileText2, 
  Briefcase, 
  LineChart, 
  Cog, 
  ChevronLeft, 
  ChevronRight, 
  UserCog, 
  UserCheck, 
  TrendingUp, 
  PieChart, 
  Star, 
  Award, 
  Zap, 
  Bell,
  RefreshCw
} from 'lucide-react';
import Button from '../components/ui/Button';
import StatsCard from '../components/ui/StatsCard';
import UserManagement from '../components/admin/UserManagement';
import LeadManagement from '../components/admin/LeadManagement';
import PartnerManagement from '../components/admin/PartnerManagement';
import ServiceManagement from '../components/admin/ServiceManagement';
import PromotionManagement from '../components/admin/PromotionManagement';
import RewardsManagement from '../components/admin/RewardsManagement';
import ReportsAnalytics from '../components/admin/ReportsAnalytics';
import LogsAuditTrail from '../components/admin/LogsAuditTrail';
import PayoutManagement from '../components/admin/PayoutManagement';
import NotificationsMessaging from '../components/admin/NotificationsMessaging';
import CallReportsAnalytics from '../components/admin/CallReportsAnalytics';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import ChartCard from '../components/ui/ChartCard';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart as RechartsLineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPartners: number;
  totalAppointments: number;
  totalRevenue: number;
  pendingApprovals: number;
  newSignups: number;
  bookingConversionRate: number;
  topPartners: {name: string, appointments: number}[];
  topServices: {name: string, bookings: number}[];
}

interface ChartData {
  signupTrend: {date: string, count: number}[];
  revenueTrend: {date: string, amount: number}[];
  serviceDistribution: {name: string, value: number}[];
  bookingConversion: {date: string, rate: number}[];
  leadConversion: {date: string, leads: number, conversions: number}[];
}

export default function AdminDashboard() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'user-management' | 'leads' | 'partners' | 'services' | 'promotions' | 'rewards' | 'reports' | 'logs' | 'payouts' | 'notifications' | 'call-reports'>('overview');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalPartners: 0,
    totalAppointments: 0,
    totalRevenue: 0,
    pendingApprovals: 0,
    newSignups: 0,
    bookingConversionRate: 0,
    topPartners: [],
    topServices: []
  });
  const [chartData, setChartData] = useState<ChartData>({
    signupTrend: [],
    revenueTrend: [],
    serviceDistribution: [],
    bookingConversion: [],
    leadConversion: []
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    
    if (user.role !== 'admin') {
      navigate('/unauthorized');
      return;
    }
    
    loadStats();
    loadChartData();

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

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Check if Supabase URL is valid
      if (!import.meta.env.VITE_SUPABASE_URL) {
        throw new Error('Supabase URL is not configured');
      }
      
      // Load user count with error handling
      try {
        const { count: userCount, error: userError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true });
        
        if (userError) throw userError;
        
        // Load partner count
        const { count: partnerCount, error: partnerError } = await supabase
          .from('partners')
          .select('*', { count: 'exact', head: true });
        
        if (partnerError) throw partnerError;
        
        // Load appointment count
        const { count: appointmentCount, error: appointmentError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true });
        
        if (appointmentError) throw appointmentError;
        
        // Load revenue data
        const { data: revenueData, error: revenueError } = await supabase
          .from('purchases')
          .select('amount');
        
        if (revenueError) throw revenueError;
        
        const totalRevenue = revenueData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
        
        // Load pending approvals
        const { count: pendingCount, error: pendingError } = await supabase
          .from('promotion_claims')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');
        
        if (pendingError) throw pendingError;
        
        // Get new signups (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { count: newSignupsCount, error: signupsError } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', thirtyDaysAgo.toISOString());
        
        if (signupsError) throw signupsError;

        // Calculate booking conversion rate (confirmed / total)
        const { count: totalBookings, error: totalBookingsError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true });
        
        if (totalBookingsError) throw totalBookingsError;

        const { count: confirmedBookings, error: confirmedBookingsError } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .in('status', ['confirmed', 'completed']);
        
        if (confirmedBookingsError) throw confirmedBookingsError;

        const bookingConversionRate = totalBookings ? (confirmedBookings / totalBookings) * 100 : 0;

        // Get top partners - using manual approach instead of groupBy
        const { data: appointmentsData, error: appointmentsError } = await supabase
          .from('appointments')
          .select(`
            partner:partner_id (
              name
            ),
            partner_id
          `)
          .not('partner_id', 'is', null);
        
        if (appointmentsError) throw appointmentsError;

        // Manually count appointments per partner
        const partnerCounts: Record<string, { name: string, count: number }> = {};
        appointmentsData?.forEach(appointment => {
          if (appointment.partner_id && appointment.partner?.name) {
            if (!partnerCounts[appointment.partner_id]) {
              partnerCounts[appointment.partner_id] = { 
                name: appointment.partner.name, 
                count: 0 
              };
            }
            partnerCounts[appointment.partner_id].count++;
          }
        });

        // Convert to array and sort
        const topPartners = Object.values(partnerCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(p => ({ name: p.name, appointments: p.count }));

        // Get top services - using manual approach instead of groupBy
        const { data: servicesData, error: servicesError } = await supabase
          .from('appointments')
          .select(`
            service:service_id (
              name
            ),
            service_id
          `)
          .not('service_id', 'is', null);
        
        if (servicesError) throw servicesError;

        // Manually count bookings per service
        const serviceCounts: Record<string, { name: string, count: number }> = {};
        servicesData?.forEach(appointment => {
          if (appointment.service_id && appointment.service?.name) {
            if (!serviceCounts[appointment.service_id]) {
              serviceCounts[appointment.service_id] = { 
                name: appointment.service.name, 
                count: 0 
              };
            }
            serviceCounts[appointment.service_id].count++;
          }
        });

        // Convert to array and sort
        const topServices = Object.values(serviceCounts)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map(s => ({ name: s.name, bookings: s.count }));
        
        setStats({
          totalUsers: userCount || 0,
          activeUsers: Math.floor((userCount || 0) * 0.8), // Assuming 80% are active
          totalPartners: partnerCount || 0,
          totalAppointments: appointmentCount || 0,
          totalRevenue,
          pendingApprovals: pendingCount || 0,
          newSignups: newSignupsCount || 0,
          bookingConversionRate,
          topPartners,
          topServices
        });
      } catch (queryError) {
        console.error('Supabase query error:', queryError);
        throw queryError;
      }
    } catch (error) {
      console.error('Error loading stats:', error);
      
      // More detailed error logging
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error details:', {
          supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
          timestamp: new Date().toISOString()
        });
        toast.error('Network error - Check your connection and Supabase URL');
      } else {
        toast.error('Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      // Signup trend data (last 7 days)
      const signupTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count: Math.floor(Math.random() * 10) + 5
        };
      }).reverse();

      // Revenue trend data (last 7 days)
      const revenueTrend = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          amount: Math.floor(Math.random() * 5000) + 1000
        };
      }).reverse();

      // Service distribution data
      const serviceDistribution = [
        { name: 'Medical', value: 35 },
        { name: 'Wellness', value: 25 },
        { name: 'Aesthetic', value: 20 },
        { name: 'Spa', value: 15 },
        { name: 'Other', value: 5 }
      ];

      // Booking conversion rate trend
      const bookingConversion = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          rate: Math.floor(Math.random() * 30) + 60 // 60-90%
        };
      }).reverse();

      // Lead conversion trend
      const leadConversion = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const leads = Math.floor(Math.random() * 20) + 10;
        const conversions = Math.floor(leads * (Math.random() * 0.3 + 0.1)); // 10-40% conversion
        return {
          date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          leads,
          conversions
        };
      }).reverse();

      setChartData({
        signupTrend,
        revenueTrend,
        serviceDistribution,
        bookingConversion,
        leadConversion
      });
    } catch (error) {
      console.error('Error loading chart data:', error);
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

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  const renderContent = () => {
    switch (activeTab) {
      case 'user-management':
        return <UserManagement />;
      case 'leads':
        return <LeadManagement />;
      case 'partners':
        return <PartnerManagement />;
      case 'services':
        return <ServiceManagement />;
      case 'promotions':
        return <PromotionManagement />;
      case 'rewards':
        return <RewardsManagement />;
      case 'reports':
        return <ReportsAnalytics />;
      case 'logs':
        return <LogsAuditTrail />;
      case 'payouts':
        return <PayoutManagement />;
      case 'notifications':
        return <NotificationsMessaging />;
      case 'call-reports':
        return <CallReportsAnalytics />;
      case 'overview':
      default:
        return (
          <>
            {/* KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <StatsCard
                title="Total Users"
                value={stats.totalUsers.toString()}
                icon={Users}
                iconColor="text-blue-600"
                iconBgColor="bg-blue-100"
                subtitle="All registered users"
              />
              <StatsCard
                title="Active Users"
                value={stats.activeUsers.toString()}
                icon={Activity}
                iconColor="text-green-600"
                iconBgColor="bg-green-100"
                subtitle="Users active in last 30 days"
              />
              <StatsCard
                title="Total Partners"
                value={stats.totalPartners.toString()}
                icon={UserPlus}
                iconColor="text-purple-600"
                iconBgColor="bg-purple-100"
                subtitle="Healthcare providers"
              />
              <StatsCard
                title="Total Appointments"
                value={stats.totalAppointments.toString()}
                icon={Calendar}
                iconColor="text-orange-600"
                iconBgColor="bg-orange-100"
                subtitle="All scheduled appointments"
              />
              <StatsCard
                title="Total Revenue"
                value={`$${stats.totalRevenue.toLocaleString()}`}
                icon={DollarSign}
                iconColor="text-emerald-600"
                iconBgColor="bg-emerald-100"
                subtitle="Lifetime revenue"
              />
              <StatsCard
                title="Pending Approvals"
                value={stats.pendingApprovals.toString()}
                icon={Tag}
                iconColor="text-amber-600"
                iconBgColor="bg-amber-100"
                subtitle="Awaiting review"
              />
            </div>

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Signup Trend Chart */}
              <ChartCard title="New Member Signups" icon={Users}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData.signupTrend}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorSignups" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#00B2C2" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#00B2C2" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#00B2C2" 
                        fillOpacity={1} 
                        fill="url(#colorSignups)" 
                        name="New Signups"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Revenue Trend Chart */}
              <ChartCard title="Revenue Trend" icon={DollarSign}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData.revenueTrend}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#82ca9d" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        name="Revenue"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* Service Distribution */}
              <ChartCard title="Service Distribution" icon={PieChart}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={chartData.serviceDistribution}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.serviceDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value}%`, 'Percentage']} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Booking Conversion Rate */}
              <ChartCard title="Booking Conversion Rate" icon={Calendar}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={chartData.bookingConversion}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#00B2C2" 
                        activeDot={{ r: 8 }}
                        name="Conversion Rate"
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>

              {/* Lead Conversion */}
              <ChartCard title="Lead Conversion" icon={Users}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={chartData.leadConversion}
                      margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="leads" fill="#00B2C2" name="Total Leads" />
                      <Bar dataKey="conversions" fill="#82ca9d" name="Conversions" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              {/* Top Partners */}
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <h2 className="text-xl font-semibold text-heading mb-6 flex items-center">
                  <Users className="h-5 w-5 mr-2 text-gold-500" />
                  Top Partners
                </h2>
                <div className="space-y-4">
                  {stats.topPartners.length > 0 ? (
                    stats.topPartners.map((partner, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-luxury-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-luxury-100 flex items-center justify-center mr-3">
                            <Users className="h-5 w-5 text-luxury-600" />
                          </div>
                          <div>
                            <p className="font-medium text-heading">{partner.name}</p>
                            <p className="text-sm text-body">{partner.appointments} appointments</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Star className="h-5 w-5 text-gold-500 fill-current" />
                          <span className="ml-1 font-medium">{(4 + Math.random()).toFixed(1)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-body">
                      No partner data available
                    </div>
                  )}
                </div>
              </div>

              {/* Top Services */}
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <h2 className="text-xl font-semibold text-heading mb-6 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-gold-500" />
                  Top Services
                </h2>
                <div className="space-y-4">
                  {stats.topServices.length > 0 ? (
                    stats.topServices.map((service, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-luxury-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-luxury-100 flex items-center justify-center mr-3">
                            <Activity className="h-5 w-5 text-luxury-600" />
                          </div>
                          <div>
                            <p className="font-medium text-heading">{service.name}</p>
                            <p className="text-sm text-body">{service.bookings} bookings</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-gold-500" />
                          <span className="ml-1 font-medium">${(Math.random() * 500 + 100).toFixed(0)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-body">
                      No service data available
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <h2 className="text-xl font-semibold text-heading mb-6 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-luxury-600" />
                  Recent Appointments
                </h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-heading">Patient Name</p>
                        <p className="text-sm text-body">Service • Provider</p>
                      </div>
                      <Button size="sm">View</Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-luxury p-6">
                <h2 className="text-xl font-semibold text-heading mb-6 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-luxury-600" />
                  Recent Transactions
                </h2>
                <div className="space-y-4">
                  {[1, 2, 3].map((_, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-heading">$299.00</p>
                        <p className="text-sm text-body">Service Purchase • User</p>
                      </div>
                      <Button size="sm">Details</Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
    }
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
      <aside className={`bg-[#0A1628] fixed inset-y-0 left-0 z-50 transform ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'} transition-all duration-300 ease-in-out`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header with Toggle Button */}
          <div className="p-4 border-b border-[#1E3A5F] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-[#1E3A5F] p-2 rounded-lg">
                <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" className="w-8 h-8 object-contain" />
              </div>
              {isSidebarOpen && <span className="text-lg font-semibold text-white">Admin Panel</span>}
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
                  onClick={() => setActiveTab('user-management')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'user-management'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <UserCog className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">User Management</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('leads')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'leads'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <Users className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Leads</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('payouts')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'payouts'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <DollarSign className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Payout Management</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'notifications'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <Bell className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Notifications</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('partners')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'partners'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <UserPlus className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Partners</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('services')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'services'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <Activity className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Services</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('promotions')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'promotions'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <Tag className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Promotions</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('rewards')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'rewards'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <Gift className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Rewards</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'reports'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <FileText className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Reports</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'logs'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <BarChart className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Logs</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => setActiveTab('call-reports')}
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    activeTab === 'call-reports'
                      ? 'bg-[#1E3A5F] text-[#00F0FF]'
                      : 'text-white hover:bg-[#ffffff] hover:text-white'
                  }`}
                >
                  <Phone className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Call Reports</span>}
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/clear-cache')}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg text-white hover:bg-[#1E3A5F] hover:text-white"
                >
                  <RefreshCw className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Clear Cache</span>}
                </button>
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
            <span className="text-lg font-semibold text-heading">Admin Panel</span>
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
              {activeTab === 'user-management' && 'User Management'}
              {activeTab === 'leads' && 'Lead Management'}
              {activeTab === 'partners' && 'Partner & Pharmacy Management'}
              {activeTab === 'services' && 'Service Management'}
              {activeTab === 'promotions' && 'Promotion Management'}
              {activeTab === 'rewards' && 'Rewards Management'}
              {activeTab === 'reports' && 'Reports & Analytics'}
              {activeTab === 'logs' && 'System Logs'}
              {activeTab === 'payouts' && 'Payout Management'}
              {activeTab === 'notifications' && 'Notifications & Platform Messaging'}
              {activeTab === 'call-reports' && 'AI Call Reports'}
            </h1>
            <p className="text-body">
              {activeTab === 'overview' && 'View key metrics and recent activity'}
              {activeTab === 'user-management' && 'Manage users, roles, and permissions'}
              {activeTab === 'leads' && 'Manage leads and their interactions'}
              {activeTab === 'partners' && 'Manage healthcare providers, partners, and pharmacies'}
              {activeTab === 'services' && 'Manage available services and pricing'}
              {activeTab === 'promotions' && 'Create time-limited promotions and special offers'}
              {activeTab === 'rewards' && 'Manage points earned/redeemed by members'}
              {activeTab === 'reports' && 'Generate custom reports and analytics'}
              {activeTab === 'logs' && 'View system activity logs'}
              {activeTab === 'payouts' && 'Manage partner payouts and payment schedules'}
              {activeTab === 'notifications' && 'Manage communications with users and platform announcements'}
              {activeTab === 'call-reports' && 'View and analyze AI-assisted member call data'}
            </p>
          </div>

          {renderContent()}
        </main>
      </div>
    </div>
  );
}