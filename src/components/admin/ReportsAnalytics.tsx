import { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Filter, 
  Calendar, 
  Users, 
  DollarSign, 
  Activity, 
  MapPin, 
  BarChart, 
  PieChart, 
  LineChart, 
  Bot, 
  Mic, 
  MessageSquare, 
  Clock, 
  Search, 
  ChevronDown, 
  ArrowDownToLine, 
  Printer, 
  Mail, 
  RefreshCw,
  Award,
  TrendingUp,
  Check
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import ChartCard from '../ui/ChartCard';
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

// Define types for report filters and data
interface ReportFilters {
  userType: string;
  dateRange: string;
  startDate: string;
  endDate: string;
  service: string;
  location: string;
  customDateRange: boolean;
}

interface ReportData {
  revenue: {
    total: number;
    byService: { name: string; value: number }[];
    byMonth: { month: string; value: number }[];
    byUserType: { name: string; value: number }[];
  };
  bookings: {
    total: number;
    byService: { name: string; value: number }[];
    byStatus: { name: string; value: number }[];
    byMonth: { month: string; value: number }[];
  };
  members: {
    total: number;
    growth: { month: string; value: number }[];
    byTier: { name: string; value: number }[];
    retention: number;
  };
  partners: {
    total: number;
    performance: { name: string; bookings: number; revenue: number; rating: number }[];
    utilization: number;
  };
  voiceAI: {
    totalInteractions: number;
    avgDuration: number;
    topIntents: { name: string; value: number }[];
    satisfactionScore: number;
    usageByHour: { hour: string; value: number }[];
  };
}

export default function ReportsAnalytics() {
  const [loading, setLoading] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [filters, setFilters] = useState<ReportFilters>({
    userType: 'all',
    dateRange: 'last30days',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    service: 'all',
    location: 'all',
    customDateRange: false
  });
  const [services, setServices] = useState<{id: string, name: string}[]>([]);
  const [locations, setLocations] = useState<{city: string, state: string}[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [activeMetric, setActiveMetric] = useState<'revenue' | 'bookings' | 'members' | 'partners'>('revenue');

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Load services for filter dropdown
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('id, name')
        .eq('active', true)
        .order('name');
      
      if (servicesError) throw servicesError;
      setServices(servicesData || []);
      
      // Load locations (from partners table)
      const { data: partnersData, error: partnersError } = await supabase
        .from('partners')
        .select('practice_address')
        .eq('status', 'active');
      
      if (partnersError) throw partnersError;
      
      // Extract unique locations
      const uniqueLocations = new Set<string>();
      const locationsList: {city: string, state: string}[] = [];
      
      partnersData?.forEach(partner => {
        if (partner.practice_address && partner.practice_address.city && partner.practice_address.state) {
          const locationKey = `${partner.practice_address.city}, ${partner.practice_address.state}`;
          if (!uniqueLocations.has(locationKey)) {
            uniqueLocations.add(locationKey);
            locationsList.push({
              city: partner.practice_address.city,
              state: partner.practice_address.state
            });
          }
        }
      });
      
      setLocations(locationsList);
      
    } catch (error) {
      console.error('Error loading initial data:', error);
      toast.error('Failed to load filter options');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'dateRange' && value === 'custom') {
      setFilters(prev => ({ ...prev, [name]: value, customDateRange: true }));
    } else if (name === 'dateRange' && value !== 'custom') {
      // Calculate start date based on selected range
      let startDate = new Date().toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      switch (value) {
        case 'today':
          startDate = endDate;
          break;
        case 'yesterday':
          startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'last7days':
          startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'last30days':
          startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
          break;
        case 'thisMonth':
          const thisMonth = new Date();
          thisMonth.setDate(1);
          startDate = thisMonth.toISOString().split('T')[0];
          break;
        case 'lastMonth':
          const lastMonth = new Date();
          lastMonth.setMonth(lastMonth.getMonth() - 1);
          lastMonth.setDate(1);
          const lastMonthEnd = new Date();
          lastMonthEnd.setDate(0);
          startDate = lastMonth.toISOString().split('T')[0];
          break;
        case 'thisYear':
          const thisYear = new Date();
          thisYear.setMonth(0);
          thisYear.setDate(1);
          startDate = thisYear.toISOString().split('T')[0];
          break;
      }
      
      setFilters(prev => ({ 
        ...prev, 
        [name]: value, 
        startDate, 
        endDate,
        customDateRange: false 
      }));
    } else {
      setFilters(prev => ({ ...prev, [name]: value }));
    }
  };

  const generateReport = async () => {
    try {
      setGeneratingReport(true);
      
      // In a real application, this would fetch actual data from the database
      // For this demo, we'll generate mock data based on the filters
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate mock data based on filters
      const mockReportData: ReportData = {
        revenue: {
          total: Math.floor(Math.random() * 500000) + 100000,
          byService: generateMockServiceData(5),
          byMonth: generateMockMonthlyData(6),
          byUserType: [
            { name: 'Members', value: Math.floor(Math.random() * 70000) + 30000 },
            { name: 'Non-members', value: Math.floor(Math.random() * 40000) + 10000 },
            { name: 'Partners', value: Math.floor(Math.random() * 20000) + 5000 }
          ]
        },
        bookings: {
          total: Math.floor(Math.random() * 5000) + 1000,
          byService: generateMockServiceData(5),
          byStatus: [
            { name: 'Completed', value: Math.floor(Math.random() * 800) + 400 },
            { name: 'Confirmed', value: Math.floor(Math.random() * 400) + 200 },
            { name: 'Pending', value: Math.floor(Math.random() * 200) + 100 },
            { name: 'Cancelled', value: Math.floor(Math.random() * 100) + 50 }
          ],
          byMonth: generateMockMonthlyData(6)
        },
        members: {
          total: Math.floor(Math.random() * 10000) + 5000,
          growth: generateMockMonthlyData(6),
          byTier: [
            { name: 'Bronze', value: Math.floor(Math.random() * 3000) + 2000 },
            { name: 'Silver', value: Math.floor(Math.random() * 2000) + 1000 },
            { name: 'Gold', value: Math.floor(Math.random() * 1000) + 500 },
            { name: 'Platinum', value: Math.floor(Math.random() * 500) + 100 }
          ],
          retention: Math.floor(Math.random() * 20) + 75 // 75-95%
        },
        partners: {
          total: Math.floor(Math.random() * 100) + 50,
          performance: generateMockPartnerData(5),
          utilization: Math.floor(Math.random() * 30) + 60 // 60-90%
        },
        voiceAI: {
          totalInteractions: Math.floor(Math.random() * 50000) + 10000,
          avgDuration: Math.floor(Math.random() * 120) + 60, // 60-180 seconds
          topIntents: [
            { name: 'Schedule Appointment', value: Math.floor(Math.random() * 5000) + 3000 },
            { name: 'Check Status', value: Math.floor(Math.random() * 3000) + 2000 },
            { name: 'Health Question', value: Math.floor(Math.random() * 2000) + 1000 },
            { name: 'Medication Info', value: Math.floor(Math.random() * 1500) + 500 },
            { name: 'Find Provider', value: Math.floor(Math.random() * 1000) + 300 }
          ],
          satisfactionScore: Math.floor(Math.random() * 15) + 80, // 80-95%
          usageByHour: generateMockHourlyData()
        }
      };
      
      setReportData(mockReportData);
      setReportGenerated(true);
      toast.success('Report generated successfully');
      
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleExportReport = (format: 'pdf' | 'csv' | 'excel') => {
    toast.success(`Exporting report as ${format.toUpperCase()}`);
    // In a real application, this would trigger a download of the report in the specified format
  };

  const handlePrintReport = () => {
    toast.success('Preparing report for printing...');
    // In a real application, this would open the print dialog
  };

  const handleEmailReport = () => {
    toast.success('Report will be emailed to you shortly');
    // In a real application, this would send the report via email
  };

  // Helper functions to generate mock data
  const generateMockServiceData = (count: number) => {
    const mockData = [];
    const serviceNames = ['Medical Consultation', 'Wellness Assessment', 'Aesthetic Treatment', 'Spa Service', 'Executive Health', 'Nutrition Consultation', 'Mental Health'];
    
    for (let i = 0; i < count; i++) {
      mockData.push({
        name: serviceNames[i % serviceNames.length],
        value: Math.floor(Math.random() * 50000) + 10000
      });
    }
    
    return mockData;
  };

  const generateMockMonthlyData = (count: number) => {
    const mockData = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = new Date().getMonth();
    
    for (let i = 0; i < count; i++) {
      const monthIndex = (currentMonth - i + 12) % 12; // Go back i months from current month
      mockData.unshift({
        month: months[monthIndex],
        value: Math.floor(Math.random() * 50000) + 10000
      });
    }
    
    return mockData;
  };

  const generateMockPartnerData = (count: number) => {
    const mockData = [];
    const partnerNames = ['Dr. Sarah Chen', 'Dr. Michael Rodriguez', 'Dr. Emily Thompson', 'Dr. James Wilson', 'Dr. Lisa Patel'];
    
    for (let i = 0; i < count; i++) {
      mockData.push({
        name: partnerNames[i % partnerNames.length],
        bookings: Math.floor(Math.random() * 500) + 100,
        revenue: Math.floor(Math.random() * 100000) + 50000,
        rating: (Math.random() * 1.5 + 3.5).toFixed(1) // 3.5-5.0 rating
      });
    }
    
    return mockData;
  };

  const generateMockHourlyData = () => {
    const mockData = [];
    
    for (let i = 0; i < 24; i++) {
      const hour = i < 10 ? `0${i}:00` : `${i}:00`;
      // Create a bell curve with peak during business hours
      let value = Math.floor(Math.random() * 200);
      if (i >= 8 && i <= 18) {
        value += Math.floor(Math.random() * 800) + 200;
      }
      
      mockData.push({
        hour,
        value
      });
    }
    
    return mockData;
  };

  return (
    <div className="space-y-8">
      {/* Key Metrics Dashboard */}
      <div className="bg-white rounded-xl shadow-luxury p-6">
        <h2 className="text-xl font-semibold text-navy-900 mb-6 flex items-center">
          <BarChart className="h-5 w-5 mr-2 text-gold-500" />
          Key Performance Metrics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Revenue Metric */}
          <div 
            className={`bg-navy-50 rounded-xl p-6 cursor-pointer transition-all duration-300 ${activeMetric === 'revenue' ? 'ring-2 ring-gold-500 shadow-lg' : 'hover:shadow-md'}`}
            onClick={() => setActiveMetric('revenue')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-navy-900">Revenue</h3>
              <DollarSign className="h-5 w-5 text-gold-500" />
            </div>
            <div className="text-2xl font-bold text-navy-900 mb-1">
              ${reportData ? reportData.revenue.total.toLocaleString() : '0'}
            </div>
            <div className="text-sm text-navy-600 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span>12% increase from last period</span>
            </div>
          </div>
          
          {/* Bookings Metric */}
          <div 
            className={`bg-navy-50 rounded-xl p-6 cursor-pointer transition-all duration-300 ${activeMetric === 'bookings' ? 'ring-2 ring-gold-500 shadow-lg' : 'hover:shadow-md'}`}
            onClick={() => setActiveMetric('bookings')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-navy-900">Bookings</h3>
              <Calendar className="h-5 w-5 text-gold-500" />
            </div>
            <div className="text-2xl font-bold text-navy-900 mb-1">
              {reportData ? reportData.bookings.total.toLocaleString() : '0'}
            </div>
            <div className="text-sm text-navy-600 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span>8% increase from last period</span>
            </div>
          </div>
          
          {/* Member Growth Metric */}
          <div 
            className={`bg-navy-50 rounded-xl p-6 cursor-pointer transition-all duration-300 ${activeMetric === 'members' ? 'ring-2 ring-gold-500 shadow-lg' : 'hover:shadow-md'}`}
            onClick={() => setActiveMetric('members')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-navy-900">Member Growth</h3>
              <Users className="h-5 w-5 text-gold-500" />
            </div>
            <div className="text-2xl font-bold text-navy-900 mb-1">
              {reportData ? reportData.members.total.toLocaleString() : '0'}
            </div>
            <div className="text-sm text-navy-600 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span>15% increase from last period</span>
            </div>
          </div>
          
          {/* Partner Performance Metric */}
          <div 
            className={`bg-navy-50 rounded-xl p-6 cursor-pointer transition-all duration-300 ${activeMetric === 'partners' ? 'ring-2 ring-gold-500 shadow-lg' : 'hover:shadow-md'}`}
            onClick={() => setActiveMetric('partners')}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-navy-900">Partner Performance</h3>
              <Award className="h-5 w-5 text-gold-500" />
            </div>
            <div className="text-2xl font-bold text-navy-900 mb-1">
              {reportData ? `${reportData.partners.utilization}%` : '0%'}
            </div>
            <div className="text-sm text-navy-600 flex items-center">
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
              <span>5% increase in utilization</span>
            </div>
          </div>
        </div>
      </div>

      {/* Report Generator Card */}
      <div className="bg-white rounded-xl shadow-luxury p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gold-500" />
              Report Generator
            </h2>
            <p className="text-navy-600 text-sm">
              Create custom reports by selecting filters below
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  userType: 'all',
                  dateRange: 'last30days',
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  endDate: new Date().toISOString().split('T')[0],
                  service: 'all',
                  location: 'all',
                  customDateRange: false
                });
                setReportGenerated(false);
                setReportData(null);
              }}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Filters
            </Button>
            <Button
              variant="luxury"
              onClick={generateReport}
              isLoading={generatingReport}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Generate Report
            </Button>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              User Type
            </label>
            <select
              name="userType"
              value={filters.userType}
              onChange={handleFilterChange}
              className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
            >
              <option value="all">All Users</option>
              <option value="member">Members Only</option>
              <option value="partner">Partners Only</option>
              <option value="admin">Admins Only</option>
              <option value="non-member">Non-Members</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Date Range
            </label>
            <select
              name="dateRange"
              value={filters.dateRange}
              onChange={handleFilterChange}
              className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7days">Last 7 Days</option>
              <option value="last30days">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="thisYear">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Service
            </label>
            <select
              name="service"
              value={filters.service}
              onChange={handleFilterChange}
              className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
            >
              <option value="all">All Services</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
          
          {filters.customDateRange && (
            <>
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={filters.startDate}
                  onChange={handleFilterChange}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={filters.endDate}
                  onChange={handleFilterChange}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                />
              </div>
            </>
          )}
          
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Location
            </label>
            <select
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
            >
              <option value="all">All Locations</option>
              {locations.map((location, index) => (
                <option key={index} value={`${location.city},${location.state}`}>
                  {location.city}, {location.state}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {reportGenerated && reportData && (
        <div className="space-y-6">
          {/* Report Header */}
          <div className="bg-white rounded-xl shadow-luxury p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
              <div>
                <h2 className="text-xl font-semibold text-navy-900">
                  Report Results
                </h2>
                <p className="text-navy-600 text-sm">
                  Generated on {new Date().toLocaleDateString()} for period {filters.customDateRange ? `${filters.startDate} to ${filters.endDate}` : filters.dateRange}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport('pdf')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport('csv')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportReport('excel')}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintReport}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEmailReport}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </Button>
              </div>
            </div>
          </div>

          {/* REVENUE SECTION */}
          {activeMetric === 'revenue' && (
            <div className="bg-white rounded-xl shadow-luxury p-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-6 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-gold-500" />
                Revenue Analytics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Total Revenue</div>
                    <div className="text-xl font-bold text-navy-900">${reportData.revenue.total.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Avg. Monthly</div>
                    <div className="text-xl font-bold text-navy-900">
                      ${Math.floor(reportData.revenue.total / 6).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Top Service</div>
                    <div className="text-xl font-bold text-navy-900">
                      {reportData.revenue.byService[0]?.name || 'N/A'}
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Growth Rate</div>
                    <div className="text-xl font-bold text-navy-900">+12.5%</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Revenue by Month */}
                <ChartCard title="Revenue Trend" icon={LineChart}>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={reportData.revenue.byMonth}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#82ca9d" 
                          fillOpacity={1} 
                          fill="url(#colorRevenue)" 
                          name="Revenue"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* Revenue by Service */}
                <ChartCard title="Revenue by Service" icon={PieChart}>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={reportData.revenue.byService}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {reportData.revenue.byService.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              {/* Revenue by User Type */}
              <ChartCard title="Revenue by User Type" icon={Users}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsBarChart
                      data={reportData.revenue.byUserType}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, 'Revenue']} />
                      <Legend />
                      <Bar dataKey="value" name="Revenue" fill="#8884d8" />
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          )}

          {/* BOOKINGS SECTION */}
          {activeMetric === 'bookings' && (
            <div className="bg-white rounded-xl shadow-luxury p-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-6 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-gold-500" />
                Booking Analytics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Total Bookings</div>
                    <div className="text-xl font-bold text-navy-900">{reportData.bookings.total.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Completion Rate</div>
                    <div className="text-xl font-bold text-navy-900">
                      {Math.round((reportData.bookings.byStatus.find(s => s.name === 'Completed')?.value || 0) / reportData.bookings.total * 100)}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Avg. Daily</div>
                    <div className="text-xl font-bold text-navy-900">
                      {Math.round(reportData.bookings.total / 30)}
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Cancellation Rate</div>
                    <div className="text-xl font-bold text-navy-900">
                      {Math.round((reportData.bookings.byStatus.find(s => s.name === 'Cancelled')?.value || 0) / reportData.bookings.total * 100)}%
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Bookings by Month */}
                <ChartCard title="Booking Trend" icon={LineChart}>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsLineChart
                        data={reportData.bookings.byMonth}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#8884d8" 
                          activeDot={{ r: 8 }}
                          name="Bookings"
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* Bookings by Service */}
                <ChartCard title="Bookings by Service" icon={Activity}>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={reportData.bookings.byService}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        layout="vertical"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Bookings" fill="#82ca9d" />
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              {/* Bookings by Status */}
              <ChartCard title="Bookings by Status" icon={PieChart}>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={reportData.bookings.byStatus}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {reportData.bookings.byStatus.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            </div>
          )}

          {/* MEMBER GROWTH SECTION */}
          {activeMetric === 'members' && (
            <div className="bg-white rounded-xl shadow-luxury p-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-6 flex items-center">
                <Users className="h-5 w-5 mr-2 text-gold-500" />
                Member Growth Analytics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Total Members</div>
                    <div className="text-xl font-bold text-navy-900">{reportData.members.total.toLocaleString()}</div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">New This Month</div>
                    <div className="text-xl font-bold text-navy-900">
                      {reportData.members.growth[reportData.members.growth.length - 1].value.toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Retention Rate</div>
                    <div className="text-xl font-bold text-navy-900">
                      {reportData.members.retention}%
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Growth Rate</div>
                    <div className="text-xl font-bold text-navy-900">+15.3%</div>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Member Growth Trend */}
                <ChartCard title="Member Growth Trend" icon={LineChart}>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={reportData.members.growth}
                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                      >
                        <defs>
                          <linearGradient id="colorMembers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value) => [value.toLocaleString(), 'New Members']} />
                        <Area 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#8884d8" 
                          fillOpacity={1} 
                          fill="url(#colorMembers)" 
                          name="New Members"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* Members by Tier */}
                <ChartCard title="Members by Tier" icon={Award}>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={reportData.members.byTier}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {reportData.members.byTier.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value.toLocaleString(), 'Members']} />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              {/* Member Retention */}
              <div className="bg-navy-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-navy-900 mb-4">Member Retention</h3>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-green-600 h-4 rounded-full" 
                      style={{ width: `${reportData.members.retention}%` }}
                    ></div>
                  </div>
                  <span className="ml-4 font-semibold text-navy-900">{reportData.members.retention}%</span>
                </div>
                <p className="mt-2 text-sm text-navy-600">
                  {reportData.members.retention >= 90 ? 'Excellent retention rate' : 
                   reportData.members.retention >= 80 ? 'Good retention rate' : 
                   'Average retention rate'}
                </p>
              </div>
            </div>
          )}

          {/* PARTNER PERFORMANCE SECTION */}
          {activeMetric === 'partners' && (
            <div className="bg-white rounded-xl shadow-luxury p-6">
              <h2 className="text-xl font-semibold text-navy-900 mb-6 flex items-center">
                <Award className="h-5 w-5 mr-2 text-gold-500" />
                Partner Performance
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Total Partners</div>
                    <div className="text-xl font-bold text-navy-900">{reportData.partners.total}</div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Avg. Bookings</div>
                    <div className="text-xl font-bold text-navy-900">
                      {Math.round(reportData.partners.performance.reduce((sum, p) => sum + p.bookings, 0) / reportData.partners.performance.length)}
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Avg. Rating</div>
                    <div className="text-xl font-bold text-navy-900">
                      {(reportData.partners.performance.reduce((sum, p) => sum + parseFloat(p.rating), 0) / reportData.partners.performance.length).toFixed(1)}
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-navy-600">Utilization</div>
                    <div className="text-xl font-bold text-navy-900">{reportData.partners.utilization}%</div>
                  </div>
                </div>
              </div>
              
              {/* Top Performing Partners */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-navy-900 mb-4">Top Performing Partners</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-navy-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Partner</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Bookings</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Revenue</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.partners.performance.map((partner, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-navy-900">{partner.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-navy-600">{partner.bookings.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-navy-600">${partner.revenue.toLocaleString()}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Star className="h-4 w-4 text-gold-500 fill-current" />
                              <span className="ml-1 text-sm text-navy-600">{partner.rating}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Partner Utilization */}
              <div className="bg-navy-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-navy-900 mb-4">Partner Utilization</h3>
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-blue-600 h-4 rounded-full" 
                      style={{ width: `${reportData.partners.utilization}%` }}
                    ></div>
                  </div>
                  <span className="ml-4 font-semibold text-navy-900">{reportData.partners.utilization}%</span>
                </div>
                <p className="mt-2 text-sm text-navy-600">
                  Average partner capacity utilization
                </p>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm font-medium text-navy-600">High Utilization</div>
                    <div className="text-lg font-semibold text-navy-900">12 Partners</div>
                    <div className="text-xs text-navy-500">Above 80% capacity</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm font-medium text-navy-600">Medium Utilization</div>
                    <div className="text-lg font-semibold text-navy-900">28 Partners</div>
                    <div className="text-xs text-navy-500">50-80% capacity</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-sm font-medium text-navy-600">Low Utilization</div>
                    <div className="text-lg font-semibold text-navy-900">10 Partners</div>
                    <div className="text-xs text-navy-500">Below 50% capacity</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export Options */}
          <div className="bg-white rounded-xl shadow-luxury p-6">
            <h2 className="text-xl font-semibold text-navy-900 mb-6 flex items-center">
              <ArrowDownToLine className="h-5 w-5 mr-2 text-gold-500" />
              Export Options
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                onClick={() => handleExportReport('pdf')}
              >
                <Download className="h-5 w-5 mr-2" />
                Export as PDF
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                onClick={() => handleExportReport('csv')}
              >
                <Download className="h-5 w-5 mr-2" />
                Export as CSV
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                onClick={() => handleExportReport('excel')}
              >
                <Download className="h-5 w-5 mr-2" />
                Export as Excel
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                onClick={handlePrintReport}
              >
                <Printer className="h-5 w-5 mr-2" />
                Print Report
              </Button>
              
              <Button 
                variant="outline" 
                className="flex items-center justify-center"
                onClick={handleEmailReport}
              >
                <Mail className="h-5 w-5 mr-2" />
                Email Report
              </Button>
              
              <Button 
                variant="luxury" 
                className="flex items-center justify-center"
                onClick={generateReport}
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh Report
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!reportGenerated && (
        <div className="bg-white rounded-xl shadow-luxury p-12 text-center">
          <FileText className="h-16 w-16 text-navy-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-navy-900 mb-2">No Report Generated Yet</h3>
          <p className="text-navy-600 mb-6 max-w-md mx-auto">
            Select your filters above and click "Generate Report" to create a custom analytics report.
          </p>
          <Button
            variant="luxury"
            onClick={generateReport}
            isLoading={generatingReport}
          >
            <BarChart className="h-4 w-4 mr-2" />
            Generate Report
          </Button>
        </div>
      )}
    </div>
  );
}