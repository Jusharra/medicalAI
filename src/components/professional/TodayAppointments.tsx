import { useState, useEffect } from 'react';
import { Clock, Video, Calendar, X, Eye, User } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface Appointment {
  id: string;
  scheduled_for: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'rescheduled';
  notes: string | null;
  profile: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  service: {
    name: string;
    duration: string;
  };
}

interface TodayAppointmentsProps {
  partnerId: string;
}

export default function TodayAppointments({ partnerId }: TodayAppointmentsProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    if (!partnerId) return;
    loadAppointments();
  }, [partnerId, filter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on filter
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      let endDate = new Date(today);
      if (filter === 'week') {
        endDate.setDate(today.getDate() + 7);
      } else if (filter === 'month') {
        endDate.setMonth(today.getMonth() + 1);
      } else {
        endDate.setDate(today.getDate() + 1);
      }
      
      // Use a simpler query that doesn't rely on foreign key relationships
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          scheduled_for,
          status,
          notes,
          profile_id,
          service_id,
          service:service_id (
            name,
            duration
          )
        `)
        .eq('partner_id', partnerId)
        .gte('scheduled_for', today.toISOString())
        .lt('scheduled_for', endDate.toISOString())
        .in('status', ['pending', 'confirmed'])
        .order('scheduled_for', { ascending: true });
      
      if (error) throw error;
      
      // Fetch profiles separately
      const profileIds = data?.map(app => app.profile_id).filter(Boolean) || [];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', profileIds);
      
      if (profilesError) throw profilesError;
      
      // Combine the data
      const appointmentsWithProfiles = data?.map(appointment => {
        const profile = profilesData?.find(p => p.id === appointment.profile_id);
        return {
          ...appointment,
          profile: profile || {
            id: appointment.profile_id,
            full_name: 'Unknown Patient',
            avatar_url: null
          }
        };
      }) || [];
      
      setAppointments(appointmentsWithProfiles);
    } catch (error) {
      console.error('Error loading appointments:', error);
      toast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCall = (appointmentId: string) => {
    // In a real app, this would launch a video call interface
    toast.success('Joining video call...');
  };

  const handleReschedule = (appointmentId: string) => {
    // In a real app, this would open a reschedule modal
    toast.success('Opening reschedule interface...');
  };

  const handleCancel = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);
      
      if (error) throw error;
      
      toast.success('Appointment cancelled successfully');
      setAppointments(appointments.filter(app => app.id !== appointmentId));
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  };

  const handleViewDetails = (appointmentId: string) => {
    // In a real app, this would open a details modal or navigate to details page
    toast.success('Viewing appointment details...');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rescheduled':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Clock className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Appointments...
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
          <Clock className="h-5 w-5 mr-2 text-leaf-600" />
          {filter === 'today' ? "Today's Schedule" : 
           filter === 'week' ? "This Week's Schedule" : 
           "This Month's Schedule"}
        </h2>
        
        <div className="flex space-x-2">
          <Button 
            variant={filter === 'today' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => setFilter('today')}
          >
            Today
          </Button>
          <Button 
            variant={filter === 'week' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => setFilter('week')}
          >
            This Week
          </Button>
          <Button 
            variant={filter === 'month' ? 'primary' : 'outline'} 
            size="sm"
            onClick={() => setFilter('month')}
          >
            This Month
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-4">
                  {appointment.profile?.avatar_url ? (
                    <img
                      src={appointment.profile.avatar_url}
                      alt={appointment.profile.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center">
                    <p className="font-medium text-gray-900">{appointment.profile?.full_name || 'Unknown Patient'}</p>
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(appointment.status)}`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-4 w-4 mr-1" />
                    {format(new Date(appointment.scheduled_for), 'h:mm a')} • {appointment.service?.name || 'Consultation'} ({appointment.service?.duration || '30 min'})
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleJoinCall(appointment.id)}
                  className="flex-1 sm:flex-none"
                >
                  <Video className="h-4 w-4 mr-2" />
                  Join Call
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReschedule(appointment.id)}
                  className="flex-1 sm:flex-none"
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Reschedule
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancel(appointment.id)}
                  className="flex-1 sm:flex-none text-red-600 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(appointment.id)}
                  className="flex-1 sm:flex-none"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Details
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments</h3>
            <p className="text-gray-600">
              {filter === 'today' ? "You don't have any appointments scheduled for today." : 
               filter === 'week' ? "You don't have any appointments scheduled for this week." : 
               "You don't have any appointments scheduled for this month."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}