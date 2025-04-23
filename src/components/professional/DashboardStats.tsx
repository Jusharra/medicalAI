import { useState, useEffect } from 'react';
import { Users, Calendar, DollarSign, Star } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface DashboardStatsProps {
  partnerId: string;
}

interface Stats {
  totalPatients: number;
  todayAppointments: number;
  currentBalance: number;
  averageRating: number;
}

export default function DashboardStats({ partnerId }: DashboardStatsProps) {
  const [stats, setStats] = useState<Stats>({
    totalPatients: 0,
    todayAppointments: 0,
    currentBalance: 0,
    averageRating: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!partnerId) return;
    loadStats();
  }, [partnerId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get total patients (care team members)
      const { count: patientsCount, error: patientsError } = await supabase
        .from('care_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId);
      
      if (patientsError) throw patientsError;
      
      // Get today's appointments
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const { count: appointmentsCount, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', tomorrow.toISOString());
      
      if (appointmentsError) throw appointmentsError;
      
      // Get current balance (mock data for now)
      // In a real app, this would come from a payments/payouts table
      const currentBalance = 1250.75;
      
      // Get average rating
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('rating')
        .eq('id', partnerId)
        .single();
      
      if (partnerError) throw partnerError;
      
      setStats({
        totalPatients: patientsCount || 0,
        todayAppointments: appointmentsCount || 0,
        currentBalance,
        averageRating: partnerData?.rating || 0
      });
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      toast.error('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
            <div className="h-10 w-10 bg-gray-200 rounded-lg mb-4"></div>
            <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-blue-100">
            <Users className="h-6 w-6 text-luxury-500" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-body">Total Patients</p>
            <p className="text-2xl font-semibold text-heading">
              {stats.totalPatients}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-green-100">
            <Calendar className="h-6 w-6 text-luxury-500" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-body">Today's Appointments</p>
            <p className="text-2xl font-semibold text-heading">
              {stats.todayAppointments}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-purple-100">
            <DollarSign className="h-6 w-6 text-luxury-500" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-body">Current Balance</p>
            <p className="text-2xl font-semibold text-heading">
              ${stats.currentBalance.toFixed(2)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
        <div className="flex items-center">
          <div className="p-3 rounded-lg bg-yellow-100">
            <Star className="h-6 w-6 text-luxury-500" />
          </div>
          <div className="ml-4">
            <p className="text-sm text-body">Average Rating</p>
            <p className="text-2xl font-semibold text-heading">
              {stats.averageRating.toFixed(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}