import { useState, useEffect } from 'react';
import { 
  Phone, 
  Search, 
  Filter, 
  Download, 
  Calendar, 
  Clock, 
  User, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  BarChart, 
  PieChart, 
  TrendingUp, 
  FileText,
  ChevronDown,
  ChevronUp,
  Bot,
  ThumbsUp,
  ThumbsDown,
  X
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

interface CallReport {
  id: string;
  profile_id: string;
  call_duration: number;
  call_date: string;
  ai_agent_id: string;
  satisfaction_rating: number;
  topics_discussed: string[];
  follow_up_required: boolean;
  follow_up_notes: string | null;
  call_summary: string;
  sentiment_analysis: {
    overall: 'positive' | 'neutral' | 'negative';
    satisfaction: number;
    concern: number;
    confusion: number;
    keywords: string[];
  };
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

interface DailySummary {
  report_date: string;
  total_calls: number;
  avg_duration_seconds: number;
  avg_satisfaction: number;
  follow_ups_needed: number;
  agent_usage: Record<string, number>;
  topics: string[];
}

export default function CallReportsAnalytics() {
  const [reports, setReports] = useState<CallReport[]>([]);
  const [dailySummaries, setDailySummaries] = useState<DailySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | '90days' | 'all'>('30days');
  const [showFilters, setShowFilters] = useState(false);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [followUpFilter, setFollowUpFilter] = useState<'all' | 'required' | 'not-required'>('all');
  const [satisfactionFilter, setStatisfactionFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [selectedReport, setSelectedReport] = useState<CallReport | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  
  // Stats
  const [stats, setStats] = useState({
    totalCalls: 0,
    avgDuration: 0,
    avgSatisfaction: 0,
    followUpsNeeded: 0,
    topTopics: [] as {name: string, count: number}[],
    sentimentBreakdown: [] as {name: string, value: number}[]
  });

  useEffect(() => {
    loadReports();
    loadSummaries();
  }, [dateRange, agentFilter, followUpFilter, satisfactionFilter, page, pageSize]);

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Calculate date range
      let fromDate: Date | null = null;
      const now = new Date();
      
      if (dateRange === '7days') {
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 7);
      } else if (dateRange === '30days') {
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 30);
      } else if (dateRange === '90days') {
        fromDate = new Date(now);
        fromDate.setDate(now.getDate() - 90);
      }
      
      // Build query
      let query = supabase
        .from('call_reports')
        .select(`
          *,
          profiles (
            full_name,
            email
          )
        `, { count: 'exact' });
      
      // Apply date filter
      if (fromDate) {
        query = query.gte('call_date', fromDate.toISOString());
      }
      
      // Apply agent filter
      if (agentFilter !== 'all') {
        query = query.eq('ai_agent_id', agentFilter);
      }
      
      // Apply follow-up filter
      if (followUpFilter === 'required') {
        query = query.eq('follow_up_required', true);
      } else if (followUpFilter === 'not-required') {
        query = query.eq('follow_up_required', false);
      }
      
      // Apply satisfaction filter
      if (satisfactionFilter === 'high') {
        query = query.gte('satisfaction_rating', 4);
      } else if (satisfactionFilter === 'medium') {
        query = query.in('satisfaction_rating', [3]);
      } else if (satisfactionFilter === 'low') {
        query = query.lte('satisfaction_rating', 2);
      }
      
      // Apply search term if provided
      if (searchTerm) {
        query = query.or(`call_summary.ilike.%${searchTerm}%,topics_discussed.cs.{${searchTerm}}`);
      }
      
      // Apply pagination
      query = query
        .order('call_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      setReports(data || []);
      setTotalCount(count || 0);
      
      // Calculate stats
      if (data && data.length > 0) {
        // Total calls
        const totalCalls = count || data.length;
        
        // Average duration
        const totalDuration = data.reduce((sum, report) => sum + report.call_duration, 0);
        const avgDuration = Math.round(totalDuration / data.length);
        
        // Average satisfaction
        const totalSatisfaction = data.reduce((sum, report) => sum + report.satisfaction_rating, 0);
        const avgSatisfaction = totalSatisfaction / data.length;
        
        // Follow-ups needed
        const followUpsNeeded = data.filter(report => report.follow_up_required).length;
        
        // Top topics
        const topicsCount: Record<string, number> = {};
        data.forEach(report => {
          report.topics_discussed.forEach(topic => {
            topicsCount[topic] = (topicsCount[topic] || 0) + 1;
          });
        });
        
        const topTopics = Object.entries(topicsCount)
          .map(([name, count]) => ({ name, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        // Sentiment breakdown
        const sentimentCount = {
          positive: 0,
          neutral: 0,
          negative: 0
        };
        
        data.forEach(report => {
          if (report.sentiment_analysis && report.sentiment_analysis.overall) {
            sentimentCount[report.sentiment_analysis.overall]++;
          }
        });
        
        const sentimentBreakdown = Object.entries(sentimentCount)
          .map(([name, value]) => ({ name, value }));
        
        setStats({
          totalCalls,
          avgDuration,
          avgSatisfaction,
          followUpsNeeded,
          topTopics,
          sentimentBreakdown
        });
      }
    } catch (error) {
      console.error('Error loading call reports:', error);
      toast.error('Failed to load call reports');
    } finally {
      setLoading(false);
    }
  };

  const loadSummaries = async () => {
    try {
      const { data, error } = await supabase
        .from('call_reports_summary')
        .select('*')
        .order('report_date', { ascending: false })
        .limit(30);
      
      if (error) throw error;
      
      setDailySummaries(data || []);
    } catch (error) {
      console.error('Error loading call report summaries:', error);
      toast.error('Failed to load call report summaries');
    }
  };

  const handleViewReport = (report: CallReport) => {
    setSelectedReport(report);
    setShowReportModal(true);
  };

  const handleExportReports = () => {
    try {
      // Convert reports to CSV
      const headers = [
        'Date', 
        'Member', 
        'Duration (min)', 
        'AI Agent', 
        'Satisfaction', 
        'Topics', 
        'Follow-up Required', 
        'Sentiment'
      ];
      
      const csvContent = [
        headers.join(','),
        ...reports.map(report => [
          new Date(report.call_date).toLocaleDateString(),
          `"${report.profiles?.full_name || 'Unknown'}"`,
          (report.call_duration / 60).toFixed(1),
          report.ai_agent_id,
          report.satisfaction_rating,
          `"${report.topics_discussed.join(', ')}"`,
          report.follow_up_required ? 'Yes' : 'No',
          report.sentiment_analysis?.overall || 'Unknown'
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `call_reports_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Reports exported successfully');
    } catch (error) {
      console.error('Error exporting reports:', error);
      toast.error('Failed to export reports');
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getSatisfactionColor = (rating: number) => {
    if (rating >= 4) return 'bg-green-100 text-green-800';
    if (rating >= 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'neutral':
        return 'bg-blue-100 text-blue-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const COLORS = ['#00C49F', '#FFBB28', '#FF8042', '#0088FE', '#8884d8'];

  return (
    <>
      {/* Overview Stats */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <Phone className="h-5 w-5 mr-2 text-gold-500" />
              AI Call Reports
            </h2>
            <p className="text-navy-600 text-sm">
              Analytics and insights from AI-assisted member calls
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleExportReports}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Reports
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {showFilters ? (
                <ChevronUp className="h-4 w-4 ml-2" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-2" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Calls</div>
              <div className="text-xl font-bold text-navy-900">{stats.totalCalls}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Avg. Duration</div>
              <div className="text-xl font-bold text-navy-900">{formatDuration(stats.avgDuration)}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Avg. Satisfaction</div>
              <div className="text-xl font-bold text-navy-900">{stats.avgSatisfaction.toFixed(1)}/5</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Follow-ups Needed</div>
              <div className="text-xl font-bold text-navy-900">{stats.followUpsNeeded}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
          <h3 className="font-semibold text-navy-900 mb-4">Filter Reports</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                AI Agent
              </label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="all">All Agents</option>
                <option value="health-assistant-v1">Health Assistant</option>
                <option value="medical-concierge-v2">Medical Concierge</option>
                <option value="wellness-advisor-v1">Wellness Advisor</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Follow-up Required
              </label>
              <select
                value={followUpFilter}
                onChange={(e) => setFollowUpFilter(e.target.value as any)}
                className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="all">All</option>
                <option value="required">Required</option>
                <option value="not-required">Not Required</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Satisfaction Rating
              </label>
              <select
                value={satisfactionFilter}
                onChange={(e) => setStatisfactionFilter(e.target.value as any)}
                className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              >
                <option value="all">All Ratings</option>
                <option value="high">High (4-5)</option>
                <option value="medium">Medium (3)</option>
                <option value="low">Low (1-2)</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by topic or summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Call Volume Trend */}
        <div className="bg-white rounded-xl shadow-luxury p-6">
          <h3 className="font-semibold text-navy-900 mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-gold-500" />
            Call Volume Trend
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailySummaries.slice(0, 14).reverse()}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="report_date" 
                  tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip 
                  formatter={(value) => [value, 'Calls']}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total_calls" 
                  stroke="#00B2C2" 
                  activeDot={{ r: 8 }}
                  name="Total Calls"
                />
                <Line 
                  type="monotone" 
                  dataKey="follow_ups_needed" 
                  stroke="#FFC30F" 
                  name="Follow-ups Needed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Satisfaction Distribution */}
        <div className="bg-white rounded-xl shadow-luxury p-6">
          <h3 className="font-semibold text-navy-900 mb-4 flex items-center">
            <ThumbsUp className="h-5 w-5 mr-2 text-gold-500" />
            Satisfaction Distribution
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={[1, 2, 3, 4, 5].map(rating => ({
                  rating: `${rating} Star${rating !== 1 ? 's' : ''}`,
                  count: reports.filter(r => r.satisfaction_rating === rating).length
                }))}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Number of Calls" fill="#00B2C2" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* More Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Topics */}
        <div className="bg-white rounded-xl shadow-luxury p-6">
          <h3 className="font-semibold text-navy-900 mb-4 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-gold-500" />
            Top Topics Discussed
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart
                data={stats.topTopics}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Frequency" fill="#FFC30F" />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-white rounded-xl shadow-luxury p-6">
          <h3 className="font-semibold text-navy-900 mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-gold-500" />
            Sentiment Analysis
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={stats.sentimentBreakdown}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {stats.sentimentBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-xl shadow-luxury p-6">
        <h3 className="font-semibold text-navy-900 mb-4">Call Reports</h3>
        
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
          </div>
        ) : reports.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-navy-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Member</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Duration</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">AI Agent</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Rating</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Follow-up</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Sentiment</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-navy-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report.id} className="hover:bg-navy-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 text-navy-400 mr-2" />
                          <span className="text-navy-900">{format(new Date(report.call_date), 'MMM d, yyyy')}</span>
                        </div>
                        <div className="text-xs text-navy-500 ml-6">
                          {format(new Date(report.call_date), 'h:mm a')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-navy-400 mr-2" />
                          <div>
                            <div className="text-sm font-medium text-navy-900">{report.profiles?.full_name || 'Unknown'}</div>
                            <div className="text-xs text-navy-500">{report.profiles?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 text-navy-400 mr-2" />
                          <span className="text-navy-900">{formatDuration(report.call_duration)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Bot className="h-4 w-4 text-navy-400 mr-2" />
                          <span className="text-navy-900">{report.ai_agent_id}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSatisfactionColor(report.satisfaction_rating)}`}>
                          {report.satisfaction_rating}/5
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.follow_up_required ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                            <XCircle className="h-3 w-3 mr-1" />
                            Not Required
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {report.sentiment_analysis?.overall && (
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getSentimentColor(report.sentiment_analysis.overall)}`}>
                            {report.sentiment_analysis.overall.charAt(0).toUpperCase() + report.sentiment_analysis.overall.slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReport(report)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-navy-600">
                Showing {Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)} of {totalCount} results
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page * pageSize >= totalCount}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-navy-900 mb-2">No Call Reports Found</h3>
            <p className="text-navy-600">
              {searchTerm || dateRange !== 'all' || agentFilter !== 'all' || followUpFilter !== 'all' || satisfactionFilter !== 'all'
                ? 'No reports match your current filters. Try adjusting your search criteria.'
                : 'No call reports have been recorded yet.'}
            </p>
          </div>
        )}
      </div>

      {/* Report Detail Modal */}
      {showReportModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-xl font-bold text-navy-900">Call Report Details</h3>
              <button 
                onClick={() => setShowReportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="bg-navy-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-navy-500">Date & Time</p>
                    <p className="font-medium text-navy-800">
                      {format(new Date(selectedReport.call_date), 'PPpp')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-navy-500">Member</p>
                    <p className="font-medium text-navy-800">
                      {selectedReport.profiles?.full_name || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-navy-500">Duration</p>
                    <p className="font-medium text-navy-800">
                      {formatDuration(selectedReport.call_duration)} ({Math.round(selectedReport.call_duration / 60)} minutes)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-navy-500">AI Agent</p>
                    <p className="font-medium text-navy-800">
                      {selectedReport.ai_agent_id}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-navy-500">Satisfaction Rating</p>
                    <p className="font-medium text-navy-800">
                      {selectedReport.satisfaction_rating}/5
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-navy-500">Follow-up Required</p>
                    <p className="font-medium text-navy-800">
                      {selectedReport.follow_up_required ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Topics & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="font-medium text-navy-900 mb-2">Topics Discussed</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.topics_discussed.map((topic, index) => (
                      <span 
                        key={index} 
                        className="px-2 py-1 bg-navy-100 text-navy-800 rounded-full text-xs font-medium"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="font-medium text-navy-900 mb-2">Sentiment Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-navy-600">Overall</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getSentimentColor(selectedReport.sentiment_analysis?.overall || 'neutral')}`}>
                        {selectedReport.sentiment_analysis?.overall?.charAt(0).toUpperCase() + selectedReport.sentiment_analysis?.overall?.slice(1) || 'Unknown'}
                      </span>
                    </div>
                    {selectedReport.sentiment_analysis?.keywords && (
                      <div>
                        <span className="text-sm text-navy-600">Keywords</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {selectedReport.sentiment_analysis.keywords.map((keyword, index) => (
                            <span 
                              key={index} 
                              className="px-2 py-1 bg-navy-100 text-navy-800 rounded-full text-xs font-medium"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Call Summary */}
              <div className="bg-navy-50 rounded-lg p-4">
                <h4 className="font-medium text-navy-900 mb-2">Call Summary</h4>
                <p className="text-navy-600">
                  {selectedReport.call_summary}
                </p>
              </div>
              
              {/* Follow-up Notes */}
              {selectedReport.follow_up_required && selectedReport.follow_up_notes && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-red-800">Follow-up Required</h4>
                      <p className="mt-2 text-sm text-red-700">
                        {selectedReport.follow_up_notes}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowReportModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}