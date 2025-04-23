import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  User, 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Edit, 
  Plus, 
  Eye, 
  RefreshCw, 
  Calendar, 
  ChevronDown, 
  ChevronUp
} from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Log {
  id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  timestamp: string;
  metadata: any;
  user_email?: string;
  user_role?: string;
}

export default function LogsAuditTrail() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<Log | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 7 days ago
    end: new Date().toISOString().split('T')[0] // today
  });
  const [availableTables, setAvailableTables] = useState<string[]>([]);
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    loadLogs();
    loadAvailableTables();
  }, [page, pageSize, actionFilter, tableFilter, userRoleFilter, dateRange]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Build query with filters
      let query = supabase
        .from('logs')
        .select(`
          *,
          user:user_id (
            email,
            role
          )
        `, { count: 'exact' });
      
      // Apply filters
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }
      
      if (tableFilter) {
        query = query.eq('table_name', tableFilter);
      }
      
      if (userRoleFilter) {
        query = query.eq('user.role', userRoleFilter);
      }
      
      // Apply date range filter
      if (dateRange.start) {
        query = query.gte('timestamp', `${dateRange.start}T00:00:00`);
      }
      
      if (dateRange.end) {
        query = query.lte('timestamp', `${dateRange.end}T23:59:59`);
      }
      
      // Apply pagination
      query = query
        .order('timestamp', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      // Execute query
      const { data, error, count } = await query;
      
      if (error) throw error;
      
      // Transform data to include user email and role
      const transformedData = data?.map(log => ({
        ...log,
        user_email: log.user?.email,
        user_role: log.user?.role
      })) || [];
      
      setLogs(transformedData);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error loading logs:', error);
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableTables = async () => {
    try {
      // Get distinct table names from logs
      const { data, error } = await supabase
        .from('logs')
        .select('table_name')
        .order('table_name')
        .not('table_name', 'is', null);
      
      if (error) throw error;
      
      // Extract unique table names
      const tables = [...new Set(data?.map(log => log.table_name).filter(Boolean))];
      setAvailableTables(tables);
    } catch (error) {
      console.error('Error loading available tables:', error);
      toast.error('Failed to load table filters');
    }
  };

  const handleViewLog = (log: Log) => {
    setSelectedLog(log);
    setShowModal(true);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    // Reset to first page when searching
    setPage(1);
  };

  const handleFilter = (filters: Record<string, string>) => {
    setActionFilter(filters.action || '');
    setTableFilter(filters.table || '');
    setUserRoleFilter(filters.user_role || '');
    // Reset to first page when filtering
    setPage(1);
  };

  const handleDateRangeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
    // Reset to first page when changing date range
    setPage(1);
  };

  const handleExportLogs = async () => {
    try {
      setLoading(true);
      
      // Build query with filters but without pagination
      let query = supabase
        .from('logs')
        .select(`
          *,
          user:user_id (
            email,
            role
          )
        `);
      
      // Apply filters
      if (actionFilter) {
        query = query.eq('action', actionFilter);
      }
      
      if (tableFilter) {
        query = query.eq('table_name', tableFilter);
      }
      
      if (userRoleFilter) {
        query = query.eq('user.role', userRoleFilter);
      }
      
      // Apply date range filter
      if (dateRange.start) {
        query = query.gte('timestamp', `${dateRange.start}T00:00:00`);
      }
      
      if (dateRange.end) {
        query = query.lte('timestamp', `${dateRange.end}T23:59:59`);
      }
      
      // Order by timestamp
      query = query.order('timestamp', { ascending: false });
      
      // Execute query
      const { data, error } = await query;
      
      if (error) throw error;
      
      // Transform data for export
      const exportData = data?.map(log => ({
        id: log.id,
        timestamp: new Date(log.timestamp).toLocaleString(),
        user_email: log.user?.email || 'Unknown',
        user_role: log.user?.role || 'Unknown',
        action: log.action,
        table_name: log.table_name,
        record_id: log.record_id,
        metadata: JSON.stringify(log.metadata)
      }));
      
      // Convert to CSV
      const headers = ['ID', 'Timestamp', 'User Email', 'User Role', 'Action', 'Table', 'Record ID', 'Metadata'];
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          [
            row.id,
            `"${row.timestamp}"`,
            `"${row.user_email}"`,
            row.user_role,
            row.action,
            row.table_name,
            row.record_id,
            `"${row.metadata.replace(/"/g, '""')}"`
          ].join(',')
        )
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Logs exported successfully');
    } catch (error) {
      console.error('Error exporting logs:', error);
      toast.error('Failed to export logs');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpandLog = (logId: string) => {
    setExpandedLogIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create':
        return 'bg-green-100 text-green-800';
      case 'update':
        return 'bg-blue-100 text-blue-800';
      case 'delete':
        return 'bg-red-100 text-red-800';
      case 'login':
        return 'bg-purple-100 text-purple-800';
      case 'logout':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create':
        return <Plus className="h-4 w-4" />;
      case 'update':
        return <Edit className="h-4 w-4" />;
      case 'delete':
        return <Trash2 className="h-4 w-4" />;
      case 'login':
        return <CheckCircle className="h-4 w-4" />;
      case 'logout':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const columns = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      render: (value: string) => (
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-navy-600">{formatTimestamp(value)}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'user_email',
      header: 'User',
      render: (value: string, row: Log) => (
        <div className="flex items-center">
          <User className="h-4 w-4 text-gray-400 mr-2" />
          <div>
            <div className="text-sm font-medium text-navy-900">{value || 'Unknown'}</div>
            <div className="text-xs text-navy-500">{row.user_role || 'Unknown'}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'action',
      header: 'Action',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getActionColor(value)}`}>
          {getActionIcon(value)}
          <span className="ml-1">{value.charAt(0).toUpperCase() + value.slice(1)}</span>
        </span>
      ),
      sortable: true
    },
    {
      key: 'table_name',
      header: 'Table',
      render: (value: string) => (
        <div className="flex items-center">
          <Database className="h-4 w-4 text-gray-400 mr-2" />
          <span className="text-navy-600">{value}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'record_id',
      header: 'Record ID',
      render: (value: string) => (
        <div className="text-sm text-navy-600 font-mono">
          {value ? value.substring(0, 8) + '...' : 'N/A'}
        </div>
      ),
      sortable: true
    },
    {
      key: 'metadata',
      header: 'Details',
      render: (value: any, row: Log) => (
        <div>
          <button
            onClick={() => toggleExpandLog(row.id)}
            className="flex items-center text-navy-600 hover:text-navy-900"
          >
            {expandedLogIds.has(row.id) ? (
              <ChevronUp className="h-4 w-4 mr-1" />
            ) : (
              <ChevronDown className="h-4 w-4 mr-1" />
            )}
            <span>Details</span>
          </button>
          
          {expandedLogIds.has(row.id) && (
            <div className="mt-2 p-2 bg-gray-50 rounded-md text-xs font-mono whitespace-pre-wrap max-w-md max-h-32 overflow-auto">
              {JSON.stringify(value, null, 2)}
            </div>
          )}
        </div>
      )
    }
  ];

  const filterOptions = [
    {
      key: 'action',
      label: 'Action',
      options: [
        { value: 'create', label: 'Create' },
        { value: 'update', label: 'Update' },
        { value: 'delete', label: 'Delete' },
        { value: 'login', label: 'Login' },
        { value: 'logout', label: 'Logout' }
      ]
    },
    {
      key: 'table',
      label: 'Table',
      options: availableTables.map(table => ({ value: table, label: table }))
    },
    {
      key: 'user_role',
      label: 'User Role',
      options: [
        { value: 'admin', label: 'Admin' },
        { value: 'member', label: 'Member' },
        { value: 'partner', label: 'Partner' }
      ]
    }
  ];

  return (
    <>
      {/* Logs Overview */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-gold-500" />
              System Logs & Audit Trail
            </h2>
            <p className="text-navy-600 text-sm">
              Track all backend actions with timestamps, user IDs, and affected tables
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleExportLogs}
              isLoading={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Logs
            </Button>
            <Button
              variant="outline"
              onClick={loadLogs}
              isLoading={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Date Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Start Date
            </label>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="date"
                name="start"
                value={dateRange.start}
                onChange={handleDateRangeChange}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              End Date
            </label>
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <input
                type="date"
                name="end"
                value={dateRange.end}
                onChange={handleDateRangeChange}
                className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
              />
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Logs</div>
              <div className="text-xl font-bold text-navy-900">{totalCount}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Create Actions</div>
              <div className="text-xl font-bold text-navy-900">
                {logs.filter(log => log.action === 'create').length}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Update Actions</div>
              <div className="text-xl font-bold text-navy-900">
                {logs.filter(log => log.action === 'update').length}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Delete Actions</div>
              <div className="text-xl font-bold text-navy-900">
                {logs.filter(log => log.action === 'delete').length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-luxury p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-navy-900">Audit Log Entries</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-navy-600">
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)} - {Math.min(page * pageSize, totalCount)} of {totalCount}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1); // Reset to first page when changing page size
              }}
              className="rounded-md border-gray-200 text-sm"
            >
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
              <option value="100">100 per page</option>
            </select>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                />
                <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            <div className="flex space-x-2">
              <select
                value={actionFilter}
                onChange={(e) => handleFilter({ ...{ action: actionFilter, table: tableFilter, user_role: userRoleFilter }, action: e.target.value })}
                className="rounded-lg border-gray-200 text-sm"
              >
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="login">Login</option>
                <option value="logout">Logout</option>
              </select>
              
              <select
                value={tableFilter}
                onChange={(e) => handleFilter({ ...{ action: actionFilter, table: tableFilter, user_role: userRoleFilter }, table: e.target.value })}
                className="rounded-lg border-gray-200 text-sm"
              >
                <option value="">All Tables</option>
                {availableTables.map(table => (
                  <option key={table} value={table}>{table}</option>
                ))}
              </select>
              
              <select
                value={userRoleFilter}
                onChange={(e) => handleFilter({ ...{ action: actionFilter, table: tableFilter, user_role: userRoleFilter }, user_role: e.target.value })}
                className="rounded-lg border-gray-200 text-sm"
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="member">Member</option>
                <option value="partner">Partner</option>
              </select>
            </div>
          </div>
        </div>

        {/* Logs Table */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
          </div>
        ) : logs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-navy-50">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.key}
                      className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider"
                    >
                      {column.header}
                    </th>
                  ))}
                  <th className="px-6 py-3 text-right text-xs font-medium text-navy-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-navy-50">
                    {columns.map((column) => (
                      <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                        {column.render ? column.render(log[column.key as keyof Log], log) : log[column.key as keyof Log]}
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleViewLog(log)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-navy-900 mb-2">No Logs Found</h3>
            <p className="text-navy-600">
              No logs match your current filters. Try adjusting your search criteria.
            </p>
          </div>
        )}

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
      </div>

      {/* Log Detail Modal */}
      {showModal && selectedLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2 text-navy-600" />
              Log Entry Details
            </h3>
            
            <div className="space-y-6">
              {/* Basic Log Info */}
              <div className="bg-navy-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                  <Activity className="h-5 w-5 mr-2 text-navy-600" />
                  Event Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <div className="mt-1 p-2 bg-white rounded-md">
                      {formatTimestamp(selectedLog.timestamp)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <div className="mt-1 p-2 bg-white rounded-md">
                      <span className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                        {getActionIcon(selectedLog.action)}
                        <span className="ml-1">{selectedLog.action.charAt(0).toUpperCase() + selectedLog.action.slice(1)}</span>
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Table</label>
                    <div className="mt-1 p-2 bg-white rounded-md">{selectedLog.table_name}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Record ID</label>
                    <div className="mt-1 p-2 bg-white rounded-md font-mono">{selectedLog.record_id || 'N/A'}</div>
                  </div>
                </div>
              </div>

              {/* User Info */}
              <div className="bg-navy-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                  <User className="h-5 w-5 mr-2 text-navy-600" />
                  User Information
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User ID</label>
                    <div className="mt-1 p-2 bg-white rounded-md font-mono">{selectedLog.user_id}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <div className="mt-1 p-2 bg-white rounded-md">{selectedLog.user_email || 'Unknown'}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Role</label>
                    <div className="mt-1 p-2 bg-white rounded-md">{selectedLog.user_role || 'Unknown'}</div>
                  </div>
                </div>
              </div>

              {/* Metadata */}
              <div className="bg-navy-50 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                  <Database className="h-5 w-5 mr-2 text-navy-600" />
                  Change Details
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Metadata</label>
                  <div className="mt-1 p-2 bg-white rounded-md">
                    <pre className="text-xs font-mono whitespace-pre-wrap max-h-60 overflow-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowModal(false)}
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