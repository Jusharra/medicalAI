import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Trash2, Save } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface TimeSlot {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface AvailabilityManagerProps {
  partnerId: string;
}

export default function AvailabilityManager({ partnerId }: AvailabilityManagerProps) {
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [vacationMode, setVacationMode] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const timeOptions = Array.from({ length: 24 * 4 }, (_, i) => {
    const hour = Math.floor(i / 4);
    const minute = (i % 4) * 15;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  useEffect(() => {
    if (!partnerId) return;
    loadAvailability();
  }, [partnerId]);

  const loadAvailability = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from a partner_availability table
      // For demo purposes, we'll create mock data
      
      // Check if partner has vacation mode enabled
      const { data: partnerData, error: partnerError } = await supabase
        .from('partners')
        .select('vacation_mode')
        .eq('id', partnerId)
        .single();
      
      if (partnerError && partnerError.code !== 'PGRST116') {
        throw partnerError;
      }
      
      setVacationMode(partnerData?.vacation_mode || false);
      
      // Generate mock time slots
      const mockTimeSlots: TimeSlot[] = [];
      
      // Monday to Friday, 9 AM to 5 PM
      for (let day = 0; day < 5; day++) {
        mockTimeSlots.push({
          id: `slot-${day}-1`,
          day_of_week: day,
          start_time: '09:00',
          end_time: '12:00'
        });
        
        mockTimeSlots.push({
          id: `slot-${day}-2`,
          day_of_week: day,
          start_time: '13:00',
          end_time: '17:00'
        });
      }
      
      // Add some weekend slots
      if (Math.random() > 0.5) {
        mockTimeSlots.push({
          id: 'slot-5-1',
          day_of_week: 5, // Saturday
          start_time: '10:00',
          end_time: '14:00'
        });
      }
      
      setTimeSlots(mockTimeSlots);
    } catch (error) {
      console.error('Error loading availability:', error);
      toast.error('Failed to load availability');
    } finally {
      setLoading(false);
    }
  };

  const addTimeSlot = (day: number) => {
    const newSlot: TimeSlot = {
      id: `new-${Date.now()}`,
      day_of_week: day,
      start_time: '09:00',
      end_time: '17:00'
    };
    
    setTimeSlots([...timeSlots, newSlot]);
    setUnsavedChanges(true);
  };

  const removeTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id));
    setUnsavedChanges(true);
  };

  const updateTimeSlot = (id: string, field: 'start_time' | 'end_time', value: string) => {
    setTimeSlots(timeSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ));
    setUnsavedChanges(true);
  };

  const toggleVacationMode = () => {
    setVacationMode(!vacationMode);
    setUnsavedChanges(true);
  };

  const saveChanges = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would update the partner_availability table
      // For demo purposes, we'll just show a success message
      
      // Update vacation mode
      const { error: vacationError } = await supabase
        .from('partners')
        .update({ vacation_mode: vacationMode })
        .eq('id', partnerId);
      
      if (vacationError) throw vacationError;
      
      toast.success('Availability settings saved successfully');
      setUnsavedChanges(false);
    } catch (error) {
      console.error('Error saving availability:', error);
      toast.error('Failed to save availability settings');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Availability...
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(7)].map((_, i) => (
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
          <Calendar className="h-5 w-5 mr-2 text-leaf-600" />
          Availability Management
        </h2>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="vacation-mode"
              checked={vacationMode}
              onChange={toggleVacationMode}
              className="h-4 w-4 text-leaf-600 focus:ring-leaf-500 border-gray-300 rounded"
            />
            <label htmlFor="vacation-mode" className="ml-2 text-sm text-gray-700">
              Vacation Mode
            </label>
          </div>
          
          <Button
            onClick={saveChanges}
            disabled={!unsavedChanges}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {vacationMode && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <Info className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Vacation mode is enabled. No new appointments can be booked during this time.
                Existing appointments will still be shown on your schedule.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {days.map((day, index) => (
          <div key={day} className="border rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-medium text-gray-900">{day}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => addTimeSlot(index)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Time Slot
              </Button>
            </div>
            
            {timeSlots.filter(slot => slot.day_of_week === index).length > 0 ? (
              <div className="space-y-3">
                {timeSlots
                  .filter(slot => slot.day_of_week === index)
                  .map((slot) => (
                    <div key={slot.id} className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <select
                        value={slot.start_time}
                        onChange={(e) => updateTimeSlot(slot.id, 'start_time', e.target.value)}
                        className="rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                      >
                        {timeOptions.map(time => (
                          <option key={`start-${time}`} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      <span>to</span>
                      <select
                        value={slot.end_time}
                        onChange={(e) => updateTimeSlot(slot.id, 'end_time', e.target.value)}
                        className="rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                      >
                        {timeOptions.map(time => (
                          <option key={`end-${time}`} value={time}>
                            {time}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeTimeSlot(slot.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                No availability set for {day}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Info(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}