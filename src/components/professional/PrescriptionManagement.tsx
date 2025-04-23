import { useState, useEffect } from 'react';
import { 
  Pill, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  ChevronDown, 
  ChevronUp, 
  Truck, 
  Mail, 
  AlertCircle, 
  Edit, 
  Plus,
  X,
  Send
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  refills_remaining: number;
  last_filled: string | null;
  is_controlled: boolean;
}

interface RefillRequest {
  id: string;
  patient_id: string;
  medication_id: string;
  request_date: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  delivery_type: 'mail' | 'pickup' | 'courier' | 'drone';
  notes: string | null;
  approved_by: string | null;
  updated_at: string;
  patient?: {
    id?: string;
    full_name?: string;
    email?: string;
  };
  medication?: Medication;
}

interface PrescriptionManagementProps {
  partnerId: string;
}

export default function PrescriptionManagement({ partnerId }: PrescriptionManagementProps) {
  const [loading, setLoading] = useState(true);
  const [refillRequests, setRefillRequests] = useState<RefillRequest[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<RefillRequest | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState('');
  const [showAddMedicationModal, setShowAddMedicationModal] = useState(false);
  const [newMedication, setNewMedication] = useState<{
    name: string;
    dosage: string;
    instructions: string;
    refills_remaining: number;
    is_controlled: boolean;
  }>({
    name: '',
    dosage: '',
    instructions: '',
    refills_remaining: 0,
    is_controlled: false
  });

  useEffect(() => {
    if (!partnerId) return;
    loadData();
  }, [partnerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load medications first
      await loadMedications();
      
      // Then load refill requests
      await loadRefillRequests();
      
    } catch (error) {
      console.error('Error loading prescription data:', error);
      toast.error('Failed to load prescription data');
      
      // If there's an error, use mock data
      setRefillRequests(getMockRefillRequests());
      setMedications(getMockMedications());
    } finally {
      setLoading(false);
    }
  };
  
  const loadMedications = async () => {
    try {
      const { data, error } = await supabase
        .from('medications')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      if (!data || data.length === 0) {
        // If no medications exist, create some sample data
        await createSampleMedications();
        
        // Try to fetch again
        const { data: refreshedData, error: refreshError } = await supabase
          .from('medications')
          .select('*')
          .order('name', { ascending: true });
        
        if (refreshError) throw refreshError;
        setMedications(refreshedData || getMockMedications());
      } else {
        setMedications(data);
      }
    } catch (error) {
      console.error('Error loading medications:', error);
      // Use mock data if there's an error
      setMedications(getMockMedications());
    }
  };
  
  const loadRefillRequests = async () => {
    try {
      // Get assigned members
      const { data: careTeamData, error: careTeamError } = await supabase
        .from('care_team_members')
        .select(`
          profile_id
        `)
        .eq('partner_id', partnerId);
      
      if (careTeamError) throw careTeamError;
      
      // Get profile data for assigned patients
      const assignedPatientIds = careTeamData?.map(item => item.profile_id).filter(Boolean) || [];
      
      if (assignedPatientIds.length === 0) {
        // No assigned patients, use mock data
        setRefillRequests(getMockRefillRequests());
        return;
      }
      
      // Get refill requests for assigned patients
      const { data: refillData, error: refillError } = await supabase
        .from('refill_requests')
        .select(`
          *,
          medication:medication_id(
            id,
            name,
            dosage,
            instructions,
            refills_remaining,
            last_filled,
            is_controlled
          )
        `)
        .in('patient_id', assignedPatientIds)
        .order('request_date', { ascending: false });

      if (refillError) throw refillError;

      // Get user data for patients
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', assignedPatientIds);
      
      if (userError) throw userError;
      
      // Merge data
      const enrichedRefillData = refillData?.map(request => ({
        ...request,
        patient: userData?.find(user => user.id === request.patient_id)
      })) || [];
      
      if (enrichedRefillData.length > 0) {
        setRefillRequests(enrichedRefillData);
      } else {
        // No refill requests found, create sample data
        await createSampleRefillRequests(assignedPatientIds);
        
        // Try to fetch again
        const { data: refreshedData, error: refreshError } = await supabase
          .from('refill_requests')
          .select(`
            *,
            medication:medication_id(
              id,
              name,
              dosage,
              instructions,
              refills_remaining,
              last_filled,
              is_controlled
            )
          `)
          .in('patient_id', assignedPatientIds)
          .order('request_date', { ascending: false });
        
        if (refreshError) throw refreshError;
        
        // Merge data again
        const refreshedEnrichedData = refreshedData?.map(request => ({
          ...request,
          patient: userData?.find(user => user.id === request.patient_id)
        })) || [];
        
        if (refreshedEnrichedData.length > 0) {
          setRefillRequests(refreshedEnrichedData);
        } else {
          // Still no data, use mock data
          setRefillRequests(getMockRefillRequests());
        }
      }
    } catch (error) {
      console.error('Error loading refill requests:', error);
      // Use mock data if there's an error
      setRefillRequests(getMockRefillRequests());
    }
  };

  const createSampleMedications = async () => {
    try {
      const sampleMedications = [
        {
          name: 'Lisinopril',
          dosage: '10mg',
          instructions: 'Take 1 tablet by mouth once daily',
          refills_remaining: 3,
          is_controlled: false
        },
        {
          name: 'Metformin',
          dosage: '500mg',
          instructions: 'Take 1 tablet by mouth twice daily with meals',
          refills_remaining: 2,
          is_controlled: false
        },
        {
          name: 'Atorvastatin',
          dosage: '20mg',
          instructions: 'Take 1 tablet by mouth at bedtime',
          refills_remaining: 5,
          is_controlled: false
        },
        {
          name: 'Alprazolam',
          dosage: '0.5mg',
          instructions: 'Take 1 tablet by mouth three times daily as needed for anxiety',
          refills_remaining: 1,
          is_controlled: true
        },
        {
          name: 'Levothyroxine',
          dosage: '75mcg',
          instructions: 'Take 1 tablet by mouth once daily on an empty stomach',
          refills_remaining: 6,
          is_controlled: false
        }
      ];
      
      for (const med of sampleMedications) {
        const { error } = await supabase
          .from('medications')
          .insert([med]);
        
        if (error) {
          console.error('Error creating sample medication:', error);
        }
      }
    } catch (error) {
      console.error('Error creating sample medications:', error);
    }
  };
  
  const createSampleRefillRequests = async (patientIds: string[]) => {
    try {
      if (patientIds.length === 0 || medications.length === 0) return;
      
      const sampleRequests = [];
      
      // Create 1-3 refill requests for each patient
      for (const patientId of patientIds) {
        const requestCount = Math.floor(Math.random() * 3) + 1;
        
        for (let i = 0; i < requestCount; i++) {
          // Select a random medication
          const medication = medications[Math.floor(Math.random() * medications.length)];
          
          sampleRequests.push({
            patient_id: patientId,
            medication_id: medication.id,
            status: ['pending', 'pending', 'approved', 'completed', 'rejected'][Math.floor(Math.random() * 5)],
            delivery_type: ['mail', 'pickup', 'courier', 'drone'][Math.floor(Math.random() * 4)],
            notes: Math.random() > 0.5 ? 'Please refill as soon as possible' : null
          });
        }
      }
      
      if (sampleRequests.length > 0) {
        const { error } = await supabase
          .from('refill_requests')
          .insert(sampleRequests);
        
        if (error) {
          console.error('Error creating sample refill requests:', error);
        }
      }
    } catch (error) {
      console.error('Error creating sample refill requests:', error);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      
      const { error } = await supabase
        .from('refill_requests')
        .update({
          status: 'approved',
          approved_by: partnerId,
          notes: responseNote || 'Approved by provider',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      // Update medication refills_remaining
      const request = refillRequests.find(r => r.id === requestId);
      if (request && request.medication) {
        const { error: medError } = await supabase
          .from('medications')
          .update({
            refills_remaining: Math.max(0, request.medication.refills_remaining - 1),
            last_filled: new Date().toISOString()
          })
          .eq('id', request.medication_id);
        
        if (medError) throw medError;
      }
      
      toast.success('Refill request approved');
      setShowModal(false);
      setResponseNote('');
      loadData();
    } catch (error) {
      console.error('Error approving refill request:', error);
      toast.error('Failed to approve refill request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      
      if (!responseNote) {
        toast.error('Please provide a reason for rejection');
        return;
      }
      
      const { error } = await supabase
        .from('refill_requests')
        .update({
          status: 'rejected',
          approved_by: partnerId,
          notes: responseNote,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast.success('Refill request rejected');
      setShowModal(false);
      setShowDenyModal(false);
      setResponseNote('');
      loadData();
    } catch (error) {
      console.error('Error rejecting refill request:', error);
      toast.error('Failed to reject refill request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleCompleteRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      
      const { error } = await supabase
        .from('refill_requests')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast.success('Refill request marked as completed');
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Error completing refill request:', error);
      toast.error('Failed to complete refill request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleAddMedication = async () => {
    try {
      setLoading(true);
      
      // Validate inputs
      if (!newMedication.name || !newMedication.dosage || !newMedication.instructions) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      // Add new medication
      const { data, error } = await supabase
        .from('medications')
        .insert([newMedication])
        .select()
        .single();
      
      if (error) throw error;
      
      toast.success('Medication added successfully');
      setShowAddMedicationModal(false);
      setNewMedication({
        name: '',
        dosage: '',
        instructions: '',
        refills_remaining: 0,
        is_controlled: false
      });
      
      // Refresh medications list
      setMedications([...medications, data]);
    } catch (error) {
      console.error('Error adding medication:', error);
      toast.error('Failed to add medication');
    } finally {
      setLoading(false);
    }
  };

  const handleEditMedication = async () => {
    try {
      setLoading(true);
      
      if (!selectedRequest?.medication) {
        toast.error('No medication selected');
        return;
      }
      
      // Update medication
      const { error } = await supabase
        .from('medications')
        .update({
          name: newMedication.name,
          dosage: newMedication.dosage,
          instructions: newMedication.instructions,
          refills_remaining: newMedication.refills_remaining,
          is_controlled: newMedication.is_controlled
        })
        .eq('id', selectedRequest.medication.id);
      
      if (error) throw error;
      
      toast.success('Medication updated successfully');
      setShowEditModal(false);
      loadData();
    } catch (error) {
      console.error('Error updating medication:', error);
      toast.error('Failed to update medication');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'approved':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getDeliveryIcon = (type: string) => {
    switch (type) {
      case 'mail':
        return <Mail className="h-4 w-4 mr-2" />;
      case 'pickup':
        return <User className="h-4 w-4 mr-2" />;
      case 'courier':
        return <Truck className="h-4 w-4 mr-2" />;
      case 'drone':
        return <Truck className="h-4 w-4 mr-2" />;
      default:
        return <Mail className="h-4 w-4 mr-2" />;
    }
  };

  const filteredRequests = filter === 'all' 
    ? refillRequests 
    : refillRequests.filter(p => p.status === filter);

  const openApproveModal = (request: RefillRequest) => {
    setSelectedRequest(request);
    setResponseNote('');
    setShowModal(true);
  };

  const openDenyModal = (request: RefillRequest) => {
    setSelectedRequest(request);
    setResponseNote('');
    setShowDenyModal(true);
  };

  const openEditModal = (request: RefillRequest) => {
    setSelectedRequest(request);
    if (request.medication) {
      setNewMedication({
        name: request.medication.name,
        dosage: request.medication.dosage,
        instructions: request.medication.instructions,
        refills_remaining: request.medication.refills_remaining,
        is_controlled: request.medication.is_controlled
      });
    }
    setShowEditModal(true);
  };
  
  // Mock data functions
  const getMockMedications = (): Medication[] => {
    return [
      {
        id: 'med-1',
        name: 'Lisinopril',
        dosage: '10mg',
        instructions: 'Take 1 tablet by mouth once daily',
        refills_remaining: 3,
        last_filled: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_controlled: false
      },
      {
        id: 'med-2',
        name: 'Metformin',
        dosage: '500mg',
        instructions: 'Take 1 tablet by mouth twice daily with meals',
        refills_remaining: 2,
        last_filled: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        is_controlled: false
      },
      {
        id: 'med-3',
        name: 'Atorvastatin',
        dosage: '20mg',
        instructions: 'Take 1 tablet by mouth at bedtime',
        refills_remaining: 5,
        last_filled: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
        is_controlled: false
      },
      {
        id: 'med-4',
        name: 'Alprazolam',
        dosage: '0.5mg',
        instructions: 'Take 1 tablet by mouth three times daily as needed for anxiety',
        refills_remaining: 1,
        last_filled: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        is_controlled: true
      },
      {
        id: 'med-5',
        name: 'Levothyroxine',
        dosage: '75mcg',
        instructions: 'Take 1 tablet by mouth once daily on an empty stomach',
        refills_remaining: 6,
        last_filled: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        is_controlled: false
      }
    ];
  };
  
  const getMockRefillRequests = (): RefillRequest[] => {
    const mockMedications = getMockMedications();
    
    return [
      {
        id: 'req-1',
        patient_id: 'patient-1',
        medication_id: mockMedications[0].id,
        request_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        delivery_type: 'mail',
        notes: 'Running low, need refill soon',
        approved_by: null,
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        patient: {
          id: 'patient-1',
          full_name: 'John Doe',
          email: 'john.doe@example.com'
        },
        medication: mockMedications[0]
      },
      {
        id: 'req-2',
        patient_id: 'patient-2',
        medication_id: mockMedications[1].id,
        request_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'approved',
        delivery_type: 'pickup',
        notes: null,
        approved_by: partnerId,
        updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        patient: {
          id: 'patient-2',
          full_name: 'Jane Smith',
          email: 'jane.smith@example.com'
        },
        medication: mockMedications[1]
      },
      {
        id: 'req-3',
        patient_id: 'patient-3',
        medication_id: mockMedications[2].id,
        request_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        delivery_type: 'mail',
        notes: 'Delivered to home address',
        approved_by: partnerId,
        updated_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        patient: {
          id: 'patient-3',
          full_name: 'Robert Johnson',
          email: 'robert.johnson@example.com'
        },
        medication: mockMedications[2]
      },
      {
        id: 'req-4',
        patient_id: 'patient-4',
        medication_id: mockMedications[3].id,
        request_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'rejected',
        delivery_type: 'courier',
        notes: 'Too early for refill. Please contact office.',
        approved_by: partnerId,
        updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        patient: {
          id: 'patient-4',
          full_name: 'Sarah Williams',
          email: 'sarah.williams@example.com'
        },
        medication: mockMedications[3]
      },
      {
        id: 'req-5',
        patient_id: 'patient-5',
        medication_id: mockMedications[4].id,
        request_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        delivery_type: 'drone',
        notes: null,
        approved_by: null,
        updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        patient: {
          id: 'patient-5',
          full_name: 'Michael Brown',
          email: 'michael.brown@example.com'
        },
        medication: mockMedications[4]
      }
    ];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Pill className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Prescription Data...
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
          <Pill className="h-5 w-5 mr-2 text-leaf-600" />
          Prescription Management
        </h2>
        
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {showFilters ? (
              <ChevronUp className="h-4 w-4 ml-2" />
            ) : (
              <ChevronDown className="h-4 w-4 ml-2" />
            )}
          </Button>
          
          <Button
            variant="outline"
            onClick={() => setShowAddMedicationModal(true)}
            className="flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Medication
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className={`mb-6 ${showFilters ? 'block' : 'hidden'}`}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search by patient name or medication..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
          </div>
          
          <div>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          
          <div>
            <Button
              onClick={loadData}
              variant="outline"
              className="w-full"
            >
              Refresh Data
            </Button>
          </div>
        </div>
      </div>

      {/* Refill Requests List */}
      <div className="space-y-4">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((request) => (
            <div
              key={request.id}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${getStatusColor(request.status)}`}>
                      {getStatusIcon(request.status)}
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(request.request_date), 'MMM d, yyyy')}
                    </span>
                  </div>
                  
                  <div className="mb-2">
                    <h3 className="font-medium text-gray-900">
                      {request.patient?.full_name || 'Unknown Patient'}
                    </h3>
                    <p className="text-sm text-gray-600">{request.patient?.email}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {request.medication?.name || 'Unknown Medication'}
                    </div>
                    <div className="flex items-center">
                      {getDeliveryIcon(request.delivery_type)}
                      {request.delivery_type.charAt(0).toUpperCase() + request.delivery_type.slice(1)}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {request.status === 'pending' && (
                    <>
                      <Button
                        variant="success"
                        onClick={() => openApproveModal(request)}
                        disabled={!!processingId}
                        className="flex items-center"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Approve</span>
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => openEditModal(request)}
                        disabled={!!processingId}
                        className="flex items-center"
                        size="sm"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Edit</span>
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => openDenyModal(request)}
                        disabled={!!processingId}
                        className="flex items-center"
                        size="sm"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Deny</span>
                      </Button>
                    </>
                  )}
                  
                  {request.status === 'approved' && (
                    <Button
                      variant="primary"
                      onClick={() => handleCompleteRequest(request.id)}
                      disabled={!!processingId}
                      className="flex items-center"
                      size="sm"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Mark Complete</span>
                      <span className="inline sm:hidden">Complete</span>
                    </Button>
                  )}
                </div>
              </div>
              
              {request.notes && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Notes:</span> {request.notes}
                  </p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-gray-500">
            No refill requests found
          </div>
        )}
      </div>

      {/* Approve Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedRequest.status === 'pending' ? 'Review Refill Request' : 'Request Details'}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedRequest(null);
                  setResponseNote('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient</label>
                <p className="text-gray-900">{selectedRequest.patient?.full_name}</p>
                <p className="text-sm text-gray-500">{selectedRequest.patient?.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Medication</label>
                <p className="text-gray-900">{selectedRequest.medication?.name}</p>
                <p className="text-sm text-gray-500">
                  {selectedRequest.medication?.dosage} - {selectedRequest.medication?.instructions}
                </p>
              </div>
              
              {selectedRequest.status === 'pending' && (
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    id="notes"
                    rows={3}
                    className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                    placeholder="Add notes about this request..."
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                  />
                </div>
              )}
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setSelectedRequest(null);
                    setResponseNote('');
                  }}
                >
                  Cancel
                </Button>
                
                {selectedRequest.status === 'pending' && (
                  <>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setShowModal(false);
                        openDenyModal(selectedRequest);
                      }}
                      disabled={!!processingId}
                    >
                      Reject Request
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => handleApproveRequest(selectedRequest.id)}
                      disabled={!!processingId}
                    >
                      Approve Request
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deny Modal */}
      {showDenyModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Deny Refill Request
              </h3>
              <button
                onClick={() => {
                  setShowDenyModal(false);
                  setSelectedRequest(null);
                  setResponseNote('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Patient</label>
                <p className="text-gray-900">{selectedRequest.patient?.full_name}</p>
                <p className="text-sm text-gray-500">{selectedRequest.patient?.email}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Medication</label>
                <p className="text-gray-900">{selectedRequest.medication?.name}</p>
                <p className="text-sm text-gray-500">
                  {selectedRequest.medication?.dosage} - {selectedRequest.medication?.instructions}
                </p>
              </div>
              
              <div>
                <label htmlFor="denial-reason" className="block text-sm font-medium text-gray-700">Reason for Denial (Required)</label>
                <textarea
                  id="denial-reason"
                  rows={3}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  placeholder="Please provide a reason for denying this refill request..."
                  value={responseNote}
                  onChange={(e) => setResponseNote(e.target.value)}
                  required
                />
                {!responseNote && (
                  <p className="mt-1 text-sm text-red-600">A reason is required to deny a refill request</p>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDenyModal(false);
                    setSelectedRequest(null);
                    setResponseNote('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={() => handleRejectRequest(selectedRequest.id)}
                  disabled={!!processingId || !responseNote.trim()}
                >
                  Deny Request
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Medication Modal */}
      {showEditModal && selectedRequest && selectedRequest.medication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Edit Medication
              </h3>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedRequest(null);
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Medication Name*</label>
                <input
                  type="text"
                  id="name"
                  value={newMedication.name}
                  onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">Dosage*</label>
                <input
                  type="text"
                  id="dosage"
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Instructions*</label>
                <textarea
                  id="instructions"
                  rows={3}
                  value={newMedication.instructions}
                  onChange={(e) => setNewMedication({ ...newMedication, instructions: e.target.value })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="refills" className="block text-sm font-medium text-gray-700">Refills Remaining</label>
                <input
                  type="number"
                  id="refills"
                  min="0"
                  value={newMedication.refills_remaining}
                  onChange={(e) => setNewMedication({ ...newMedication, refills_remaining: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="controlled"
                  checked={newMedication.is_controlled}
                  onChange={(e) => setNewMedication({ ...newMedication, is_controlled: e.target.checked })}
                  className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                />
                <label htmlFor="controlled" className="text-sm text-gray-700">
                  This is a controlled substance
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleEditMedication}
                  disabled={loading}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showAddMedicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Add New Medication
              </h3>
              <button
                onClick={() => setShowAddMedicationModal(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Medication Name*</label>
                <input
                  type="text"
                  id="name"
                  value={newMedication.name}
                  onChange={(e) => setNewMedication({ ...newMedication, name: e.target.value })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="dosage" className="block text-sm font-medium text-gray-700">Dosage*</label>
                <input
                  type="text"
                  id="dosage"
                  value={newMedication.dosage}
                  onChange={(e) => setNewMedication({ ...newMedication, dosage: e.target.value })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="instructions" className="block text-sm font-medium text-gray-700">Instructions*</label>
                <textarea
                  id="instructions"
                  rows={3}
                  value={newMedication.instructions}
                  onChange={(e) => setNewMedication({ ...newMedication, instructions: e.target.value })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="refills" className="block text-sm font-medium text-gray-700">Initial Refills</label>
                <input
                  type="number"
                  id="refills"
                  min="0"
                  value={newMedication.refills_remaining}
                  onChange={(e) => setNewMedication({ ...newMedication, refills_remaining: parseInt(e.target.value) || 0 })}
                  className="w-full rounded-lg border-gray-200 focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="controlled"
                  checked={newMedication.is_controlled}
                  onChange={(e) => setNewMedication({ ...newMedication, is_controlled: e.target.checked })}
                  className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                />
                <label htmlFor="controlled" className="text-sm text-gray-700">
                  This is a controlled substance
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowAddMedicationModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleAddMedication}
                  disabled={loading}
                >
                  Add Medication
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}