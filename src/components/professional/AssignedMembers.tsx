import { useState, useEffect } from 'react';
import { Users, MessageSquare, Eye, Search, User, Filter, ArrowRight, Calendar, Phone, Mail, X } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Member {
  id: string;
  full_name: string;
  avatar_url: string | null;
  email: string;
  is_primary: boolean;
  last_appointment?: string;
  next_appointment?: string;
  phone?: string;
}

interface AssignedMembersProps {
  partnerId: string;
}

export default function AssignedMembers({ partnerId }: AssignedMembersProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'primary' | 'recent'>('all');

  useEffect(() => {
    if (!partnerId) return;
    loadMembers();
  }, [partnerId]);

  const loadMembers = async () => {
    try {
      setLoading(true);
      
      // Get all care team members for this partner
      const { data: careTeamData, error: careTeamError } = await supabase
        .from('care_team_members')
        .select(`
          id,
          is_primary,
          profile_id
        `)
        .eq('partner_id', partnerId);
      
      if (careTeamError) throw careTeamError;
      
      // Get profiles for these members
      const profileIds = careTeamData?.map(item => item.profile_id).filter(Boolean) || [];
      
      if (profileIds.length === 0) {
        setMembers([]);
        return;
      }
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, email')
        .in('id', profileIds);
      
      if (profilesError) throw profilesError;
      
      // Get last and next appointments for each member
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('profile_id, scheduled_for, status')
        .in('profile_id', profileIds)
        .in('status', ['completed', 'confirmed', 'pending'])
        .order('scheduled_for', { ascending: true });
      
      if (appointmentsError) throw appointmentsError;
      
      // Process and combine data
      const memberMap = new Map<string, { last_appointment?: string, next_appointment?: string }>();
      
      const now = new Date();
      
      appointmentsData?.forEach(app => {
        const appDate = new Date(app.scheduled_for);
        const profileId = app.profile_id;
        
        if (!memberMap.has(profileId)) {
          memberMap.set(profileId, {});
        }
        
        const memberData = memberMap.get(profileId)!;
        
        if (app.status === 'completed' || (appDate < now && app.status !== 'cancelled')) {
          // Track the most recent past appointment
          if (!memberData.last_appointment || new Date(memberData.last_appointment) < appDate) {
            memberData.last_appointment = app.scheduled_for;
          }
        } else if (appDate >= now && app.status !== 'cancelled') {
          // Track the earliest upcoming appointment
          if (!memberData.next_appointment || new Date(memberData.next_appointment) > appDate) {
            memberData.next_appointment = app.scheduled_for;
          }
        }
      });
      
      // Combine all data
      const combinedMembers = profilesData?.map(profile => {
        const careTeamMember = careTeamData?.find(ctm => ctm.profile_id === profile.id);
        const appointmentData = memberMap.get(profile.id) || {};
        
        return {
          id: profile.id,
          full_name: profile.full_name || 'Unknown',
          avatar_url: profile.avatar_url,
          email: profile.email,
          is_primary: careTeamMember?.is_primary || false,
          last_appointment: appointmentData.last_appointment,
          next_appointment: appointmentData.next_appointment,
          phone: '+1 (555) 123-' + Math.floor(1000 + Math.random() * 9000) // Mock phone number
        };
      }) || [];
      
      setMembers(combinedMembers);
    } catch (error) {
      console.error('Error loading members:', error);
      toast.error('Failed to load assigned members');
    } finally {
      setLoading(false);
    }
  };

  const handleViewProfile = (member: Member) => {
    setSelectedMember(member);
    setShowModal(true);
  };

  const handleMessage = (member: Member) => {
    // In a real app, this would open a messaging interface
    toast.success(`Opening message thread with ${member.full_name}`);
  };

  const handleScheduleAppointment = (member: Member) => {
    toast.success(`Opening scheduler for ${member.full_name}`);
  };

  const filteredMembers = members.filter(member => {
    // Apply search filter
    const matchesSearch = 
      member.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply category filter
    let matchesFilter = true;
    if (filter === 'primary') {
      matchesFilter = member.is_primary;
    } else if (filter === 'recent') {
      matchesFilter = !!member.last_appointment && 
        new Date(member.last_appointment) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    }
    
    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Users className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Assigned Members...
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[...Array(4)].map((_, i) => (
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
          <Users className="h-5 w-5 mr-2 text-leaf-600" />
          Assigned Members
        </h2>
        
        <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-200 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === 'all'
                  ? 'bg-leaf-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('primary')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === 'primary'
                  ? 'bg-leaf-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Primary
            </button>
            <button
              onClick={() => setFilter('recent')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === 'recent'
                  ? 'bg-leaf-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Recent
            </button>
          </div>
        </div>
      </div>

      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4">
                <div className="flex items-center mb-3">
                  <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {member.avatar_url ? (
                      <img
                        src={member.avatar_url}
                        alt={member.full_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div className="ml-3">
                    <div className="flex items-center">
                      <h3 className="font-medium text-gray-900">{member.full_name}</h3>
                      {member.is_primary && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                </div>
                
                <div className="space-y-1 mb-4 text-sm">
                  {member.last_appointment && (
                    <p className="text-gray-600">
                      <span className="font-medium">Last Visit:</span> {new Date(member.last_appointment).toLocaleDateString()}
                    </p>
                  )}
                  {member.next_appointment && (
                    <p className="text-gray-600">
                      <span className="font-medium">Next Visit:</span> {new Date(member.next_appointment).toLocaleDateString()}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewProfile(member)}
                    className="flex-1"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMessage(member)}
                    className="flex-1"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Members Found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'No members match your search criteria.' : 'You have no assigned members yet.'}
          </p>
        </div>
      )}

      {/* Member Profile Modal */}
      {showModal && selectedMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {selectedMember.avatar_url ? (
                    <img
                      src={selectedMember.avatar_url}
                      alt={selectedMember.full_name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div className="ml-4">
                  <h3 className="text-xl font-semibold text-gray-900">{selectedMember.full_name}</h3>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {selectedMember.is_primary && (
                      <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                        Primary Patient
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Contact Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <Mail className="h-5 w-5 text-gray-400 mr-3" />
                    <span>{selectedMember.email}</span>
                  </div>
                  <div className="flex items-center">
                    <Phone className="h-5 w-5 text-gray-400 mr-3" />
                    <span>{selectedMember.phone}</span>
                  </div>
                </div>
              </div>

              {/* Appointment History */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Appointment History</h4>
                <div className="space-y-2">
                  {selectedMember.last_appointment && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Appointment:</span>
                      <span className="font-medium">{new Date(selectedMember.last_appointment).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selectedMember.next_appointment && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Next Appointment:</span>
                      <span className="font-medium">{new Date(selectedMember.next_appointment).toLocaleDateString()}</span>
                    </div>
                  )}
                  {!selectedMember.last_appointment && !selectedMember.next_appointment && (
                    <p className="text-gray-500 text-center">No appointment history available</p>
                  )}
                </div>
              </div>

              {/* Health Information */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Health Information</h4>
                <p className="text-gray-500 text-center">
                  Detailed health information is available in the patient's medical record.
                </p>
              </div>

              <div className="flex justify-between space-x-3">
                <Button
                  variant="outline"
                  onClick={() => handleScheduleAppointment(selectedMember)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Appointment
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleMessage(selectedMember)}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Message
                </Button>
                <Button
                  onClick={() => setShowModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}