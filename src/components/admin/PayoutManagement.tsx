import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  Download, 
  Calendar, 
  ArrowDown, 
  ArrowUp, 
  Filter, 
  ChevronDown, 
  ChevronUp, 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText,
  Users,
  Settings,
  Zap,
  Percent,
  FileDown
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth';

interface Transaction {
  id: string;
  amount: number;
  type: 'payout' | 'earning';
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
  description: string;
  partner_id?: string;
}

interface Partner {
  id: string;
  name: string;
  email: string;
  practice_name: string;
  status: string;
}

interface PayoutRule {
  id: string;
  name: string;
  description: string;
  fee_percentage: number;
  minimum_payout: number;
  payout_schedule: 'weekly' | 'biweekly' | 'monthly';
  active: boolean;
}

interface ScheduledPayout {
  id: string;
  partner_id: string;
  partner_name: string;
  amount: number;
  scheduled_date: string;
  status: 'scheduled' | 'processing' | 'completed' | 'failed';
}

export default function PayoutManagement() {
  const { user } = useAuthStore();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<'all' | '30days' | '90days'>('30days');
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'payout' | 'earning'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'failed'>('all');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
  const [processingWithdrawal, setProcessingWithdrawal] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [lastPayout, setLastPayout] = useState<Transaction | null>(null);
  const [nextPayoutDate, setNextPayoutDate] = useState<string | null>(null);
  
  // New state for partner payouts
  const [partners, setPartners] = useState<Partner[]>([]);
  const [scheduledPayouts, setScheduledPayouts] = useState<ScheduledPayout[]>([]);
  const [payoutRules, setPayoutRules] = useState<PayoutRule[]>([]);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [selectedRule, setSelectedRule] = useState<PayoutRule | null>(null);
  const [showManualPayoutModal, setShowManualPayoutModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<string>('');
  const [manualPayoutAmount, setManualPayoutAmount] = useState<number>(0);

  useEffect(() => {
    loadPayoutData();
    loadPartners();
  }, [dateRange, typeFilter, statusFilter]);

  useEffect(() => {
    // Only load scheduled payouts after partners are loaded
    if (partners.length > 0) {
      loadScheduledPayouts();
    }
  }, [partners]);

  useEffect(() => {
    loadPayoutRules();
  }, []);

  const loadPayoutData = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      
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
          amount: Math.floor(Math.random() * 300) + 100, // $100-$400
          type: 'earning',
          status: 'completed',
          description: `Service: ${['Consultation', 'Follow-up', 'Wellness Check', 'Specialist Referral'][Math.floor(Math.random() * 4)]}`,
          created_at: date.toISOString()
        });
      }
      
      // Generate payouts (3-5)
      const payoutsCount = Math.floor(Math.random() * 3) + 3;
      for (let i = 0; i < payoutsCount; i++) {
        const date = new Date(now);
        date.setDate(now.getDate() - (i + 1) * 30); // Roughly monthly payouts
        
        // Calculate payout amount (sum of earnings in that period)
        const payoutAmount = mockTransactions
          .filter(t => t.type === 'earning' && new Date(t.created_at) > date && new Date(t.created_at) <= new Date(date.getTime() + 30 * 24 * 60 * 60 * 1000))
          .reduce((sum, t) => sum + t.amount, 0);
        
        mockTransactions.push({
          id: `payout-${i}`,
          amount: payoutAmount || Math.floor(Math.random() * 1000) + 500, // Fallback if no earnings
          type: 'payout',
          status: i === 0 ? 'pending' : 'completed',
          description: `Monthly payout - ${date.toLocaleString('default', { month: 'long' })}`,
          created_at: date.toISOString()
        });
      }
      
      // Sort by date (newest first)
      mockTransactions.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      // Apply filters
      let filteredTransactions = mockTransactions;
      
      if (dateRange === '30days') {
        const thirtyDaysAgo = new Date(now);
        thirtyDaysAgo.setDate(now.getDate() - 30);
        filteredTransactions = filteredTransactions.filter(t => new Date(t.created_at) >= thirtyDaysAgo);
      } else if (dateRange === '90days') {
        const ninetyDaysAgo = new Date(now);
        ninetyDaysAgo.setDate(now.getDate() - 90);
        filteredTransactions = filteredTransactions.filter(t => new Date(t.created_at) >= ninetyDaysAgo);
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
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
      
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

  const loadPartners = async () => {
    try {
      // In a real app, this would fetch from the partners table
      // For demo purposes, we'll create mock data
      const mockPartners: Partner[] = [
        {
          id: 'partner-1',
          name: 'Dr. Sarah Chen',
          email: 'dr.chen@vitaleconcierge.com',
          practice_name: 'Bay Area Wellness Center',
          status: 'active'
        },
        {
          id: 'partner-2',
          name: 'Dr. Michael Rodriguez',
          email: 'dr.rodriguez@vitaleconcierge.com',
          practice_name: 'Rodriguez Family Practice',
          status: 'active'
        },
        {
          id: 'partner-3',
          name: 'Dr. Emily Thompson',
          email: 'dr.thompson@vitaleconcierge.com',
          practice_name: 'Thompson Medical Group',
          status: 'active'
        },
        {
          id: 'partner-4',
          name: 'Dr. James Wilson',
          email: 'dr.wilson@vitaleconcierge.com',
          practice_name: 'Wilson Internal Medicine',
          status: 'active'
        },
        {
          id: 'partner-5',
          name: 'Dr. David Kim',
          email: 'dr.kim@vitaleconcierge.com',
          practice_name: 'Kim Cardiology Associates',
          status: 'active'
        }
      ];
      
      setPartners(mockPartners);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error('Failed to load partners');
    }
  };

  const loadScheduledPayouts = async () => {
    try {
      // In a real app, this would fetch from a scheduled_payouts table
      // For demo purposes, we'll create mock data
      const now = new Date();
      const mockScheduledPayouts: ScheduledPayout[] = [];
      
      // Check if partners array is empty
      if (partners.length === 0) {
        setScheduledPayouts(mockScheduledPayouts);
        return;
      }
      
      // Generate scheduled payouts for each partner
      partners.forEach((partner, index) => {
        const scheduledDate = new Date(now);
        scheduledDate.setDate(15); // 15th of current month
        
        // If today is after the 15th, schedule for next month
        if (now.getDate() > 15) {
          scheduledDate.setMonth(scheduledDate.getMonth() + 1);
        }
        
        // Add some variety to the dates
        scheduledDate.setDate(scheduledDate.getDate() + (index % 3));
        
        mockScheduledPayouts.push({
          id: `scheduled-${index}`,
          partner_id: partner.id,
          partner_name: partner.name,
          amount: Math.floor(Math.random() * 2000) + 500, // $500-$2500
          scheduled_date: scheduledDate.toISOString(),
          status: ['scheduled', 'processing', 'completed'][Math.floor(Math.random() * 3)] as any
        });
      });
      
      // Add some past payouts
      for (let i = 0; i < Math.min(5, partners.length); i++) {
        const pastDate = new Date(now);
        pastDate.setMonth(pastDate.getMonth() - 1);
        pastDate.setDate(15 + (i % 5));
        
        mockScheduledPayouts.push({
          id: `past-${i}`,
          partner_id: partners[i % partners.length].id,
          partner_name: partners[i % partners.length].name,
          amount: Math.floor(Math.random() * 2000) + 500, // $500-$2500
          scheduled_date: pastDate.toISOString(),
          status: 'completed'
        });
      }
      
      setScheduledPayouts(mockScheduledPayouts);
    } catch (error) {
      console.error('Error loading scheduled payouts:', error);
      toast.error('Failed to load scheduled payouts');
    }
  };

  const loadPayoutRules = async () => {
    try {
      // In a real app, this would fetch from a payout_rules table
      // For demo purposes, we'll create mock data
      const mockPayoutRules: PayoutRule[] = [
        {
          id: 'rule-1',
          name: 'Standard Payout',
          description: 'Standard monthly payout for all partners',
          fee_percentage: 10,
          minimum_payout: 100,
          payout_schedule: 'monthly',
          active: true
        },
        {
          id: 'rule-2',
          name: 'Premium Partner',
          description: 'Reduced fees for premium partners',
          fee_percentage: 5,
          minimum_payout: 50,
          payout_schedule: 'biweekly',
          active: true
        },
        {
          id: 'rule-3',
          name: 'High Volume',
          description: 'Special terms for high volume partners',
          fee_percentage: 3,
          minimum_payout: 200,
          payout_schedule: 'weekly',
          active: false
        }
      ];
      
      setPayoutRules(mockPayoutRules);
    } catch (error) {
      console.error('Error loading payout rules:', error);
      toast.error('Failed to load payout rules');
    }
  };

  const handleWithdraw = () => {
    setWithdrawAmount(currentBalance);
    setShowWithdrawModal(true);
  };

  const processWithdrawal = async () => {
    if (withdrawAmount <= 0 || withdrawAmount > currentBalance) return;
    
    try {
      setProcessingWithdrawal(true);
      
      // In a real app, this would call a Stripe API or similar
      // For demo purposes, we'll simulate a successful withdrawal
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Create a new transaction record - note we're not setting partner_id
      const { error } = await supabase
        .from('transactions')
        .insert([{
          amount: withdrawAmount,
          type: 'payout',
          status: 'completed',
          description: 'Admin withdrawal'
        }]);
      
      if (error) {
        console.warn('Error creating transaction record:', error);
        // Continue anyway for demo purposes
      }
      
      toast.success(`Successfully processed withdrawal of $${withdrawAmount.toFixed(2)}`);
      
      // Update local state
      setCurrentBalance(currentBalance - withdrawAmount);
      setLastPayout({
        id: `payout-${Date.now()}`,
        amount: withdrawAmount,
        type: 'payout',
        status: 'completed',
        description: 'Admin withdrawal',
        created_at: new Date().toISOString()
      });
      
      // Add the new transaction to the list
      setTransactions([
        {
          id: `payout-${Date.now()}`,
          amount: withdrawAmount,
          type: 'payout',
          status: 'completed',
          description: 'Admin withdrawal',
          created_at: new Date().toISOString()
        },
        ...transactions
      ]);
      
      setShowWithdrawModal(false);
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast.error('Failed to process withdrawal');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const handleExportTransactions = () => {
    try {
      // Convert transactions to CSV
      const headers = ['Date', 'Type', 'Amount', 'Status', 'Description'];
      const csvContent = [
        headers.join(','),
        ...transactions.map(t => [
          new Date(t.created_at).toLocaleDateString(),
          t.type,
          t.amount.toFixed(2),
          t.status,
          `"${t.description.replace(/"/g, '""')}"`
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Transactions exported successfully');
    } catch (error) {
      console.error('Error exporting transactions:', error);
      toast.error('Failed to export transactions');
    }
  };

  const handleEditRule = (rule: PayoutRule) => {
    setSelectedRule({...rule});
    setShowRulesModal(true);
  };

  const handleSaveRule = async () => {
    if (!selectedRule) return;
    
    try {
      // In a real app, this would update the database
      // For demo purposes, we'll just update the local state
      setPayoutRules(payoutRules.map(rule => 
        rule.id === selectedRule.id ? selectedRule : rule
      ));
      
      toast.success('Payout rule updated successfully');
      setShowRulesModal(false);
    } catch (error) {
      console.error('Error updating payout rule:', error);
      toast.error('Failed to update payout rule');
    }
  };

  const handleManualPayout = () => {
    setSelectedPartner('');
    setManualPayoutAmount(0);
    setShowManualPayoutModal(true);
  };

  const processManualPayout = async () => {
    if (!selectedPartner || manualPayoutAmount <= 0) return;
    
    try {
      setProcessingWithdrawal(true);
      
      // In a real app, this would call a payment API
      // For demo purposes, we'll simulate a successful payout
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const partner = partners.find(p => p.id === selectedPartner);
      
      // Create a new transaction record
      const { error } = await supabase
        .from('transactions')
        .insert([{
          partner_id: selectedPartner,
          amount: manualPayoutAmount,
          type: 'payout',
          status: 'completed',
          description: `Manual payout to ${partner?.name || 'partner'}`
        }]);
      
      if (error) {
        console.warn('Error creating transaction record:', error);
        // Continue anyway for demo purposes
      }
      
      toast.success(`Successfully processed payout of $${manualPayoutAmount.toFixed(2)} to ${partner?.name || 'partner'}`);
      
      // Update scheduled payouts
      setScheduledPayouts([
        {
          id: `manual-${Date.now()}`,
          partner_id: selectedPartner,
          partner_name: partner?.name || 'Unknown Partner',
          amount: manualPayoutAmount,
          scheduled_date: new Date().toISOString(),
          status: 'completed'
        },
        ...scheduledPayouts
      ]);
      
      setShowManualPayoutModal(false);
      
      // Refresh data
      loadScheduledPayouts();
    } catch (error) {
      console.error('Error processing manual payout:', error);
      toast.error('Failed to process payout');
    } finally {
      setProcessingWithdrawal(false);
    }
  };

  const handleExportPayouts = () => {
    try {
      // Convert payouts to CSV
      const headers = ['Partner', 'Amount', 'Scheduled Date', 'Status'];
      const csvContent = [
        headers.join(','),
        ...scheduledPayouts.map(p => [
          `"${p.partner_name.replace(/"/g, '""')}"`,
          p.amount.toFixed(2),
          new Date(p.scheduled_date).toLocaleDateString(),
          p.status
        ].join(','))
      ].join('\n');
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `partner_payouts_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Payouts exported successfully');
    } catch (error) {
      console.error('Error exporting payouts:', error);
      toast.error('Failed to export payouts');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'scheduled':
      case 'processing':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
      case 'scheduled':
      case 'processing':
        return <Clock className="h-4 w-4" />;
      case 'failed':
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <DollarSign className="h-5 w-5 mr-2 text-gold-500" />
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
    <>
      {/* Admin Earnings Section */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-gold-500" />
              Admin Earnings
            </h2>
            <p className="text-navy-600 text-sm">
              Manage your earnings and withdrawals
            </p>
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
                  {new Date(lastPayout.created_at).toLocaleDateString()} • {lastPayout.status}
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
      </div>

      {/* Partner Payout Management Section */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <Users className="h-5 w-5 mr-2 text-gold-500" />
              Partner Payout Management
            </h2>
            <p className="text-navy-600 text-sm">
              Manage scheduled payouts and process manual payments
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleExportPayouts}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export Payouts
            </Button>
            <Button
              onClick={handleManualPayout}
            >
              <Zap className="h-4 w-4 mr-2" />
              Manual Payout
            </Button>
          </div>
        </div>

        {/* Scheduled Payouts Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Partner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Scheduled Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scheduledPayouts.length > 0 ? (
                scheduledPayouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {payout.partner_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payout.scheduled_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(payout.status)}`}>
                        {getStatusIcon(payout.status)}
                        <span className="ml-1">{payout.status.charAt(0).toUpperCase() + payout.status.slice(1)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      ${payout.amount.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {payout.status === 'scheduled' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedPartner(payout.partner_id);
                            setManualPayoutAmount(payout.amount);
                            setShowManualPayoutModal(true);
                          }}
                        >
                          Process Now
                        </Button>
                      )}
                      {payout.status === 'completed' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // In a real app, this would show receipt details
                            toast.success('Viewing payout receipt');
                          }}
                        >
                          View Receipt
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No scheduled payouts found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Rules Section */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gold-500" />
              Payout Rules & Fees
            </h2>
            <p className="text-navy-600 text-sm">
              Configure payout schedules and fee structures
            </p>
          </div>
        </div>

        {/* Rules Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rule Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fee %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min. Payout
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schedule
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payoutRules.map((rule) => (
                <tr key={rule.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {rule.description}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {rule.fee_percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${rule.minimum_payout}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                    {rule.payout_schedule}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      rule.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {rule.active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditRule(rule)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transactions Section */}
      <div className="bg-white rounded-xl shadow-luxury p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <h2 className="text-xl font-semibold text-navy-900 mb-4 md:mb-0">
            Transaction History
          </h2>
          
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleExportTransactions}
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
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
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
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
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
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
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
                      {new Date(transaction.created_at).toLocaleDateString()}
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
                        {getStatusIcon(transaction.status)}
                        <span className="ml-1">{transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}</span>
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
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                    No transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-gold-500" />
              Process Withdrawal
            </h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                You are about to withdraw funds from your admin account:
              </p>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Available Balance:</span>
                    <span className="font-semibold text-gray-900">${currentBalance.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Withdrawal Amount
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500">$</span>
                </div>
                <input
                  type="number"
                  min="0"
                  max={currentBalance}
                  step="0.01"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(parseFloat(e.target.value) || 0)}
                  className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                />
              </div>
              {withdrawAmount > currentBalance && (
                <p className="mt-1 text-sm text-red-600">
                  Amount exceeds available balance
                </p>
              )}
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Method
              </label>
              <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                <CreditCard className="h-5 w-5 text-gray-400" />
                <span className="text-gray-700">Bank Account (Stripe Connect)</span>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowWithdrawModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={processWithdrawal}
                isLoading={processingWithdrawal}
                disabled={withdrawAmount <= 0 || withdrawAmount > currentBalance}
              >
                Process Withdrawal
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payout Rules Modal */}
      {showRulesModal && selectedRule && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Settings className="h-5 w-5 mr-2 text-gold-500" />
              Edit Payout Rule
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  value={selectedRule.name}
                  onChange={(e) => setSelectedRule({...selectedRule, name: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={selectedRule.description}
                  onChange={(e) => setSelectedRule({...selectedRule, description: e.target.value})}
                  rows={2}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fee Percentage
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={selectedRule.fee_percentage}
                    onChange={(e) => setSelectedRule({...selectedRule, fee_percentage: parseFloat(e.target.value) || 0})}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 pr-8"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum Payout
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={selectedRule.minimum_payout}
                    onChange={(e) => setSelectedRule({...selectedRule, minimum_payout: parseInt(e.target.value) || 0})}
                    className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Schedule
                </label>
                <select
                  value={selectedRule.payout_schedule}
                  onChange={(e) => setSelectedRule({...selectedRule, payout_schedule: e.target.value as any})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                >
                  <option value="weekly">Weekly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active"
                  checked={selectedRule.active}
                  onChange={(e) => setSelectedRule({...selectedRule, active: e.target.checked})}
                  className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                />
                <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                  Active
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowRulesModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRule}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Payout Modal */}
      {showManualPayoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-gold-500" />
              Process Manual Payout
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Partner
                </label>
                <select
                  value={selectedPartner}
                  onChange={(e) => setSelectedPartner(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                >
                  <option value="">Select a partner</option>
                  {partners.map(partner => (
                    <option key={partner.id} value={partner.id}>
                      {partner.name} - {partner.practice_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payout Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500">$</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={manualPayoutAmount}
                    onChange={(e) => setManualPayoutAmount(parseFloat(e.target.value) || 0)}
                    className="pl-7 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-700">Bank Transfer (ACH)</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowManualPayoutModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={processManualPayout}
                isLoading={processingWithdrawal}
                disabled={!selectedPartner || manualPayoutAmount <= 0}
              >
                Process Payout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}