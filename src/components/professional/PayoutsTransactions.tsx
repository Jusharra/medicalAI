import { useState, useEffect } from 'react';
import { DollarSign, Download, Calendar, ArrowDown, ArrowUp, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import { toast } from 'react-hot-toast';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  type: 'payout' | 'earning';
  status: 'completed' | 'pending' | 'failed';
  description: string;
}

interface PayoutsTransactionsProps {
  partnerId: string;
}

export default function PayoutsTransactions({ partnerId }: PayoutsTransactionsProps) {
  const [currentBalance, setCurrentBalance] = useState(0);
  const [lastPayout, setLastPayout] = useState<Transaction | null>(null);
  const [nextPayoutDate, setNextPayoutDate] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | '30days' | '90days'>('30days');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'payout' | 'earning'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');

  useEffect(() => {
    if (!partnerId) return;
    loadPayoutData();
  }, [partnerId, dateRange, typeFilter, statusFilter]);

  const loadPayoutData = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from a payouts/transactions table
      // For demo purposes, we'll create mock data
      
      // Generate mock transactions
      const mockTransactions: Transaction[] = [];
      
      // Current date for calculations
      const now = new Date();
      
      // Generate earnings (10-20)
      const earningsCount = Math.floor(Math.random() * 11) + 10;
      for (let i = 0; i < earningsCount; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - Math.floor(Math.random() * 120)); // Random date within last 120 days
        
        mockTransactions.push({
          id: `earn-${i}`,
          date: date.toISOString(),
          amount: Math.floor(Math.random() * 300) + 100, // $100-$400
          type: 'earning',
          status: 'completed',
          description: `Service: ${['Consultation', 'Follow-up', 'Wellness Check', 'Specialist Referral'][Math.floor(Math.random() * 4)]}`
        });
      }
      
      // Generate payouts (3-5)
      const payoutsCount = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < payoutsCount; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (i + 1) * 30); // Roughly monthly payouts
        
        // Calculate payout amount (sum of earnings in that period)
        const payoutAmount = mockTransactions
          .filter(t => t.type === 'earning' && new Date(t.date) > date && new Date(t.date) <= new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000))
          .reduce((sum, t) => sum + t.amount, 0);
        
        mockTransactions.push({
          id: `payout-${i}`,
          date: date.toISOString(),
          amount: payoutAmount || Math.floor(Math.random() * 1000) + 500, // Fallback if no earnings
          type: 'payout',
          status: i === 0 ? 'pending' : 'completed',
          description: `Monthly payout - ${date.toLocaleString('default', { month: 'long' })}`
        });
      }
      
      // Sort by date (newest first)
      mockTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Apply filters
      let filteredTransactions = mockTransactions;
      
      if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= thirtyDaysAgo);
      } else if (dateRange === '90days') {
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        filteredTransactions = filteredTransactions.filter(t => new Date(t.date) >= ninetyDaysAgo);
      }
      
      if (typeFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.type === typeFilter);
      }
      
      if (statusFilter !== 'all') {
        filteredTransactions = filteredTransactions.filter(t => t.status === statusFilter);
      }
      
      // Calculate current balance (sum of earnings minus sum of completed payouts)
      const totalEarnings = mockTransactions
        .filter(t => t.type === 'earning')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalPayouts = mockTransactions
        .filter(t => t.type === 'payout' && t.status === 'completed')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const balance = totalEarnings - totalPayouts;
      
      // Find last payout
      const lastPayoutTransaction = mockTransactions
        .filter(t => t.type === 'payout' && t.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] || null;
      
      // Calculate next payout date (15th of next month)
      const nextPayout = new Date(now);
      nextPayout.setDate(15);
      if (now.getDate() >= 15) {
        nextPayout.setMonth(nextPayout.getMonth() + 1);
      }
      
      setCurrentBalance(balance);
      setLastPayout(lastPayoutTransaction);
      setNextPayoutDate(nextPayout.toISOString());
      setTransactions(filteredTransactions);
    } catch (error) {
      console.error('Error loading payout data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = () => {
    // In a real app, this would initiate a withdrawal process
    toast.success('Withdrawal request submitted');
  };

  const handleExport = () => {
    // In a real app, this would generate a CSV or PDF
    toast.success('Exporting transaction history...');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Payout Data...
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-24 bg-gray-100 rounded-lg"></div>
          <div className="h-64 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
          <DollarSign className="h-5 w-5 mr-2 text-leaf-600" />
          Payouts & Transactions
        </h2>
        
        <div className="flex space-x-3">
          <Button
            variant="outline"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Current Balance</p>
          <p className="text-2xl font-semibold text-gray-900">${currentBalance.toFixed(2)}</p>
          <div className="mt-4">
            <Button
              onClick={handleWithdraw}
              disabled={currentBalance <= 0}
              className="w-full"
            >
              Withdraw Now
            </Button>
          </div>
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Last Payout</p>
          {lastPayout ? (
            <>
              <p className="text-2xl font-semibold text-gray-900">${lastPayout.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(lastPayout.date).toLocaleDateString()} • {lastPayout.status}
              </p>
            </>
          ) : (
            <p className="text-lg text-gray-500">No previous payouts</p>
          )}
        </div>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <p className="text-sm text-gray-600 mb-1">Next Scheduled Payout</p>
          {nextPayoutDate ? (
            <>
              <p className="text-2xl font-semibold text-gray-900">
                {new Date(nextPayoutDate).toLocaleDateString()}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Estimated: ${currentBalance.toFixed(2)}
              </p>
            </>
          ) : (
            <p className="text-lg text-gray-500">No scheduled payouts</p>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date Range
              </label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
              >
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Transaction Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="earning">Earnings</option>
                <option value="payout">Payouts</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
              >
                <option value="all">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions.length > 0 ? (
              transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {transaction.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.type === 'earning' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {transaction.type === 'earning' ? (
                        <ArrowUp className="h-3 w-3 mr-1" />
                      ) : (
                        <ArrowDown className="h-3 w-3 mr-1" />
                      )}
                      {transaction.type === 'earning' ? 'Earning' : 'Payout'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                    <span className={transaction.type === 'earning' ? 'text-green-600' : 'text-blue-600'}>
                      {transaction.type === 'earning' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                  No transactions found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}