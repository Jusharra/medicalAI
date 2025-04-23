import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { Calendar, Clock, MapPin, DollarSign, Users, Check, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface LocationState {
  service: {
    id: string;
    name: string;
    description: string;
    price: number;
    duration: string;
    category: string;
  };
  provider: {
    id: string;
    name: string;
    practice_name: string;
    practice_address: {
      city: string;
      state: string;
    };
    consultation_fee: number;
    video_consultation: boolean;
    in_person_consultation: boolean;
  };
}

export default function AppointmentBooking() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [consultationType, setConsultationType] = useState<'video' | 'in_person'>('video');
  const [notes, setNotes] = useState('');

  const { service, provider } = location.state as LocationState;

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }

    if (!service || !provider) {
      navigate('/appointments');
      return;
    }
  }, [user, service, provider, navigate]);

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select a date and time');
      return;
    }

    try {
      setLoading(true);

      // Create appointment record
      const { data: appointment, error: appointmentError } = await supabase
        .from('appointments')
        .insert({
          profile_id: user?.id,
          service_id: service.id,
          partner_id: provider.id, // Store the partner_id
          scheduled_for: `${selectedDate}T${selectedTime}`,
          status: 'pending',
          notes: notes || null
        })
        .select()
        .single();

      if (appointmentError) throw appointmentError;

      // Create a mock payment process instead of using Stripe
      // This simulates a successful payment without calling the external API
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update appointment status to confirmed
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointment.id);
        
      if (updateError) throw updateError;

      toast.success('Appointment booked successfully!');
      navigate('/bookings');

    } catch (error) {
      console.error('Error booking appointment:', error);
      toast.error('Failed to book appointment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getAvailableTimes = () => {
    // In a real app, this would fetch available times from the backend
    return [
      '09:00',
      '10:00',
      '11:00',
      '14:00',
      '15:00',
      '16:00'
    ];
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-luxury p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy-900">
              Confirm Your Appointment
            </h1>
            <p className="text-navy-600 mt-1">
              Please review and confirm your booking details
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
        </div>

        {/* Service Details */}
        <div className="bg-navy-50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Service Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-navy-600">Service</p>
              <p className="font-medium text-navy-900">{service.name}</p>
            </div>
            <div>
              <p className="text-sm text-navy-600">Duration</p>
              <p className="font-medium text-navy-900">{service.duration}</p>
            </div>
            <div>
              <p className="text-sm text-navy-600">Category</p>
              <p className="font-medium text-navy-900">{service.category}</p>
            </div>
            <div>
              <p className="text-sm text-navy-600">Price</p>
              <p className="font-medium text-navy-900">${service.price}</p>
            </div>
          </div>
        </div>

        {/* Provider Details */}
        <div className="bg-navy-50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Provider Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-navy-600">Provider</p>
              <p className="font-medium text-navy-900">{provider.name}</p>
            </div>
            <div>
              <p className="text-sm text-navy-600">Practice</p>
              <p className="font-medium text-navy-900">{provider.practice_name}</p>
            </div>
            <div>
              <p className="text-sm text-navy-600">Location</p>
              <p className="font-medium text-navy-900">
                {provider.practice_address.city}, {provider.practice_address.state}
              </p>
            </div>
            <div>
              <p className="text-sm text-navy-600">Consultation Fee</p>
              <p className="font-medium text-navy-900">${provider.consultation_fee}</p>
            </div>
          </div>
        </div>

        {/* Appointment Details */}
        <div className="space-y-6 mb-8">
          <h2 className="text-lg font-semibold text-navy-900">Appointment Details</h2>

          {/* Consultation Type */}
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">
              Consultation Type
            </label>
            <div className="grid grid-cols-2 gap-4">
              {provider.video_consultation && (
                <button
                  onClick={() => setConsultationType('video')}
                  className={`p-4 rounded-lg border-2 text-left ${
                    consultationType === 'video'
                      ? 'border-gold-500 bg-gold-50'
                      : 'border-gray-200 hover:border-gold-200'
                  }`}
                >
                  <div className="font-medium text-navy-900">Video Consultation</div>
                  <div className="text-sm text-navy-600">Meet online via video call</div>
                </button>
              )}
              {provider.in_person_consultation && (
                <button
                  onClick={() => setConsultationType('in_person')}
                  className={`p-4 rounded-lg border-2 text-left ${
                    consultationType === 'in_person'
                      ? 'border-gold-500 bg-gold-50'
                      : 'border-gray-200 hover:border-gold-200'
                  }`}
                >
                  <div className="font-medium text-navy-900">In-Person Visit</div>
                  <div className="text-sm text-navy-600">Visit the practice location</div>
                </button>
              )}
            </div>
          </div>

          {/* Date Selection */}
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">
              Appointment Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
            />
          </div>

          {/* Time Selection */}
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">
              Preferred Time
            </label>
            <div className="grid grid-cols-3 gap-4">
              {getAvailableTimes().map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedTime(time)}
                  className={`p-3 rounded-lg border text-center ${
                    selectedTime === time
                      ? 'border-gold-500 bg-gold-50 text-navy-900'
                      : 'border-gray-200 text-navy-600 hover:border-gold-200'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-gold-500 focus:border-transparent"
              placeholder="Any specific concerns or requests..."
            />
          </div>
        </div>

        {/* Price Summary */}
        <div className="bg-navy-50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold text-navy-900 mb-4">Price Summary</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-navy-600">Service Fee</span>
              <span className="font-medium text-navy-900">${service.price}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-navy-600">Consultation Fee</span>
              <span className="font-medium text-navy-900">${provider.consultation_fee}</span>
            </div>
            <div className="border-t border-gray-200 pt-2 mt-2">
              <div className="flex justify-between font-semibold">
                <span className="text-navy-900">Total</span>
                <span className="text-navy-900">${service.price + provider.consultation_fee}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
          >
            Cancel
          </Button>
          <Button
            variant="luxury"
            onClick={handleBookAppointment}
            isLoading={loading}
          >
            Confirm Booking
            <Check className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}