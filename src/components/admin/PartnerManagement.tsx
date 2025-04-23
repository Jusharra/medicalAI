import { useState, useEffect } from 'react';
import { Users, Search, Filter, Download, Plus, Eye, Edit, Trash, CheckCircle, XCircle, MapPin, Phone, Mail, Clock, Package, Truck, Shield, Activity, Star, UserCheck, UserX } from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Partner {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  practice_name: string;
  practice_address: {
    street?: string;
    city: string;
    state: string;
    zip?: string;
  };
  specialties: string[];
  profile_image: string | null;
  consultation_fee: number;
  video_consultation: boolean;
  in_person_consultation: boolean;
  rating: number;
  created_at: string;
}

interface Pharmacy {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  hours: string;
  services: string;
  insurance_accepted: string;
  delivery_available: boolean;
  delivery_radius: number;
  status: string;
  created_at: string;
}

interface PartnerStats {
  total_patients: number;
  active_patients: number;
  appointments_completed: number;
  appointments_upcoming: number;
  average_rating: number;
  revenue_generated: number;
}

interface PharmacyStats {
  total_patients: number;
  prescriptions_filled: number;
  delivery_rate: number;
  average_delivery_time: number;
}

export default function PartnerManagement() {
  const [activeTab, setActiveTab] = useState<'partners' | 'pharmacies'>('partners');
  const [partners, setPartners] = useState<Partner[]>([]);
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedPharmacy, setSelectedPharmacy] = useState<Pharmacy | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | 'approve' | 'suspend'>('view');
  const [partnerStats, setPartnerStats] = useState<PartnerStats | null>(null);
  const [pharmacyStats, setPharmacyStats] = useState<PharmacyStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (activeTab === 'partners') {
      loadPartners();
    } else {
      loadPharmacies();
    }
  }, [activeTab]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Error loading partners:', error);
      toast.error('Failed to load partners');
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacies = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('pharmacies')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setPharmacies(data || []);
    } catch (error) {
      console.error('Error loading pharmacies:', error);
      toast.error('Failed to load pharmacies');
    } finally {
      setLoading(false);
    }
  };

  const loadPartnerStats = async (partnerId: string) => {
    try {
      setLoading(true);
      
      // Get care team members count (patients)
      const { count: totalPatients, error: patientsError } = await supabase
        .from('care_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId);
      
      if (patientsError) throw patientsError;
      
      // Get appointments count
      const { count: completedAppointments, error: completedError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .eq('status', 'completed');
      
      if (completedError) throw completedError;
      
      const { count: upcomingAppointments, error: upcomingError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('partner_id', partnerId)
        .in('status', ['pending', 'confirmed']);
      
      if (upcomingError) throw upcomingError;
      
      // Calculate other stats
      const activePatients = Math.floor((totalPatients || 0) * 0.8); // Assuming 80% are active
      const averageRating = selectedPartner?.rating || 0;
      const revenueGenerated = (completedAppointments || 0) * (selectedPartner?.consultation_fee || 0);
      
      setPartnerStats({
        total_patients: totalPatients || 0,
        active_patients: activePatients,
        appointments_completed: completedAppointments || 0,
        appointments_upcoming: upcomingAppointments || 0,
        average_rating: averageRating,
        revenue_generated: revenueGenerated
      });
    } catch (error) {
      console.error('Error loading partner stats:', error);
      toast.error('Failed to load partner statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadPharmacyStats = async (pharmacyId: string) => {
    try {
      setLoading(true);
      
      // Get care team members count (patients)
      const { count: totalPatients, error: patientsError } = await supabase
        .from('care_team_members')
        .select('*', { count: 'exact', head: true })
        .eq('pharmacy_id', pharmacyId);
      
      if (patientsError) throw patientsError;
      
      // For demo purposes, generate some mock stats
      const prescriptionsFilled = Math.floor(Math.random() * 500) + 100;
      const deliveryRate = selectedPharmacy?.delivery_available ? Math.floor(Math.random() * 30) + 70 : 0; // 70-100% if delivery available
      const averageDeliveryTime = selectedPharmacy?.delivery_available ? Math.floor(Math.random() * 24) + 24 : 0; // 24-48 hours if delivery available
      
      setPharmacyStats({
        total_patients: totalPatients || 0,
        prescriptions_filled: prescriptionsFilled,
        delivery_rate: deliveryRate,
        average_delivery_time: averageDeliveryTime
      });
    } catch (error) {
      console.error('Error loading pharmacy stats:', error);
      toast.error('Failed to load pharmacy statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleViewPartner = async (partner: Partner) => {
    setSelectedPartner(partner);
    setModalMode('view');
    await loadPartnerStats(partner.id);
    setShowModal(true);
  };

  const handleEditPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeletePartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setModalMode('delete');
    setShowModal(true);
  };

  const handleApprovePartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setModalMode('approve');
    setShowModal(true);
  };

  const handleSuspendPartner = (partner: Partner) => {
    setSelectedPartner(partner);
    setModalMode('suspend');
    setShowModal(true);
  };

  const handleViewPharmacy = async (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setModalMode('view');
    await loadPharmacyStats(pharmacy.id);
    setShowModal(true);
  };

  const handleEditPharmacy = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeletePharmacy = (pharmacy: Pharmacy) => {
    setSelectedPharmacy(pharmacy);
    setModalMode('delete');
    setShowModal(true);
  };

  const handleAddPartner = () => {
    setSelectedPartner({
      id: '',
      name: '',
      email: '',
      phone: '',
      status: 'active',
      practice_name: '',
      practice_address: {
        city: '',
        state: ''
      },
      specialties: [],
      profile_image: null,
      consultation_fee: 0,
      video_consultation: true,
      in_person_consultation: true,
      rating: 5.0,
      created_at: new Date().toISOString()
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleAddPharmacy = () => {
    setSelectedPharmacy({
      id: '',
      name: '',
      address: '',
      phone: '',
      email: '',
      hours: '',
      services: '',
      insurance_accepted: '',
      delivery_available: false,
      delivery_radius: 0,
      status: 'active',
      created_at: new Date().toISOString()
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSavePartner = async () => {
    if (!selectedPartner) return;

    try {
      setLoading(true);
      
      if (selectedPartner.id) {
        // Update existing partner
        const { error } = await supabase
          .from('partners')
          .update({
            name: selectedPartner.name,
            email: selectedPartner.email,
            phone: selectedPartner.phone,
            status: selectedPartner.status,
            practice_name: selectedPartner.practice_name,
            practice_address: selectedPartner.practice_address,
            specialties: selectedPartner.specialties,
            consultation_fee: selectedPartner.consultation_fee,
            video_consultation: selectedPartner.video_consultation,
            in_person_consultation: selectedPartner.in_person_consultation
          })
          .eq('id', selectedPartner.id);
        
        if (error) throw error;
        toast.success('Partner updated successfully');
      } else {
        // Create new partner
        const { error } = await supabase
          .from('partners')
          .insert([{
            name: selectedPartner.name,
            email: selectedPartner.email,
            phone: selectedPartner.phone,
            status: selectedPartner.status,
            practice_name: selectedPartner.practice_name,
            practice_address: selectedPartner.practice_address,
            specialties: selectedPartner.specialties,
            consultation_fee: selectedPartner.consultation_fee,
            video_consultation: selectedPartner.video_consultation,
            in_person_consultation: selectedPartner.in_person_consultation
          }]);
        
        if (error) throw error;
        toast.success('Partner created successfully');
      }
      
      setShowModal(false);
      loadPartners();
    } catch (error) {
      console.error('Error saving partner:', error);
      toast.error('Failed to save partner');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePharmacy = async () => {
    if (!selectedPharmacy) return;

    try {
      setLoading(true);
      
      if (selectedPharmacy.id) {
        // Update existing pharmacy
        const { error } = await supabase
          .from('pharmacies')
          .update({
            name: selectedPharmacy.name,
            address: selectedPharmacy.address,
            phone: selectedPharmacy.phone,
            email: selectedPharmacy.email,
            hours: selectedPharmacy.hours,
            services: selectedPharmacy.services,
            insurance_accepted: selectedPharmacy.insurance_accepted,
            delivery_available: selectedPharmacy.delivery_available,
            delivery_radius: selectedPharmacy.delivery_radius,
            status: selectedPharmacy.status
          })
          .eq('id', selectedPharmacy.id);
        
        if (error) throw error;
        toast.success('Pharmacy updated successfully');
      } else {
        // Create new pharmacy
        const { error } = await supabase
          .from('pharmacies')
          .insert([{
            name: selectedPharmacy.name,
            address: selectedPharmacy.address,
            phone: selectedPharmacy.phone,
            email: selectedPharmacy.email,
            hours: selectedPharmacy.hours,
            services: selectedPharmacy.services,
            insurance_accepted: selectedPharmacy.insurance_accepted,
            delivery_available: selectedPharmacy.delivery_available,
            delivery_radius: selectedPharmacy.delivery_radius,
            status: selectedPharmacy.status
          }]);
        
        if (error) throw error;
        toast.success('Pharmacy created successfully');
      }
      
      setShowModal(false);
      loadPharmacies();
    } catch (error) {
      console.error('Error saving pharmacy:', error);
      toast.error('Failed to save pharmacy');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'partners' && selectedPartner) {
        const { error } = await supabase
          .from('partners')
          .delete()
          .eq('id', selectedPartner.id);
        
        if (error) throw error;
        toast.success('Partner deleted successfully');
        loadPartners();
      } else if (activeTab === 'pharmacies' && selectedPharmacy) {
        const { error } = await supabase
          .from('pharmacies')
          .delete()
          .eq('id', selectedPharmacy.id);
        
        if (error) throw error;
        toast.success('Pharmacy deleted successfully');
        loadPharmacies();
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Error deleting:', error);
      toast.error(`Failed to delete ${activeTab === 'partners' ? 'partner' : 'pharmacy'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmApprove = async () => {
    if (!selectedPartner) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('partners')
        .update({ status: 'active' })
        .eq('id', selectedPartner.id);
      
      if (error) throw error;
      
      toast.success('Partner approved successfully');
      setShowModal(false);
      loadPartners();
    } catch (error) {
      console.error('Error approving partner:', error);
      toast.error('Failed to approve partner');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSuspend = async () => {
    if (!selectedPartner) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('partners')
        .update({ status: 'suspended' })
        .eq('id', selectedPartner.id);
      
      if (error) throw error;
      
      toast.success('Partner suspended successfully');
      setShowModal(false);
      loadPartners();
    } catch (error) {
      console.error('Error suspending partner:', error);
      toast.error('Failed to suspend partner');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilter = (filters: Record<string, string>) => {
    setStatusFilter(filters.status || '');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'suspended':
        return 'bg-red-100 text-red-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = 
      partner.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.practice_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || partner.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const filteredPharmacies = pharmacies.filter(pharmacy => {
    const matchesSearch = 
      pharmacy.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pharmacy.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pharmacy.address.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !statusFilter || pharmacy.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const partnerColumns = [
    {
      key: 'name',
      header: 'Partner',
      render: (value: string, row: Partner) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center overflow-hidden">
            {row.profile_image ? (
              <img src={row.profile_image} alt={value} className="h-full w-full object-cover" />
            ) : (
              <Users className="h-5 w-5 text-navy-600" />
            )}
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-navy-900">{value}</div>
            <div className="text-sm text-navy-500">{row.practice_name}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'email',
      header: 'Contact',
      render: (value: string, row: Partner) => (
        <div>
          <div className="text-sm text-navy-900">{value}</div>
          <div className="text-sm text-navy-500">{row.phone}</div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'specialties',
      header: 'Specialties',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value && value.slice(0, 2).map((specialty, index) => (
            <span key={index} className="px-2 py-1 text-xs rounded-full bg-navy-100 text-navy-800">
              {specialty}
            </span>
          ))}
          {value && value.length > 2 && (
            <span className="px-2 py-1 text-xs rounded-full bg-navy-100 text-navy-800">
              +{value.length - 2} more
            </span>
          )}
        </div>
      ),
      sortable: false
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (value: number) => (
        <div className="flex items-center">
          <Star className="h-4 w-4 text-yellow-400 fill-current" />
          <span className="ml-1 text-sm font-medium">{value.toFixed(1)}</span>
        </div>
      ),
      sortable: true
    }
  ];

  const pharmacyColumns = [
    {
      key: 'name',
      header: 'Pharmacy',
      render: (value: string) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
            <Package className="h-5 w-5 text-navy-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-navy-900">{value}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'address',
      header: 'Location',
      render: (value: string) => (
        <div className="flex items-center">
          <MapPin className="h-4 w-4 text-navy-500 mr-1 flex-shrink-0" />
          <span className="text-sm text-navy-900 truncate max-w-[200px]">{value}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (_: any, row: Pharmacy) => (
        <div>
          <div className="flex items-center text-sm text-navy-900">
            <Phone className="h-4 w-4 text-navy-500 mr-1 flex-shrink-0" />
            <span>{row.phone}</span>
          </div>
          <div className="flex items-center text-sm text-navy-500">
            <Mail className="h-4 w-4 text-navy-500 mr-1 flex-shrink-0" />
            <span>{row.email}</span>
          </div>
        </div>
      ),
      sortable: false
    },
    {
      key: 'delivery_available',
      header: 'Delivery',
      render: (value: boolean, row: Pharmacy) => (
        <div>
          {value ? (
            <div className="flex items-center">
              <Truck className="h-4 w-4 text-green-500 mr-1" />
              <span className="text-sm text-navy-900">{row.delivery_radius} miles</span>
            </div>
          ) : (
            <div className="flex items-center">
              <XCircle className="h-4 w-4 text-red-500 mr-1" />
              <span className="text-sm text-navy-900">Not available</span>
            </div>
          )}
        </div>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      sortable: true
    }
  ];

  const partnerFilterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'pending', label: 'Pending' },
        { value: 'suspended', label: 'Suspended' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  const pharmacyFilterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
      ]
    }
  ];

  return (
    <>
      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-luxury p-4 mb-6">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('partners')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'partners'
                ? 'bg-navy-600 text-white'
                : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
            }`}
          >
            Healthcare Partners
          </button>
          <button
            onClick={() => setActiveTab('pharmacies')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'pharmacies'
                ? 'bg-navy-600 text-white'
                : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
            }`}
          >
            Pharmacies
          </button>
        </div>
      </div>

      {/* Partners Table */}
      {activeTab === 'partners' && (
        <DataTable
          columns={partnerColumns}
          data={filteredPartners}
          title="Partner Management"
          subtitle="Approve or suspend partner access, manage healthcare providers"
          searchPlaceholder="Search partners..."
          onSearch={handleSearch}
          onFilter={handleFilter}
          onExport={() => toast.success('Exporting partner data')}
          onView={handleViewPartner}
          onEdit={handleEditPartner}
          onDelete={handleDeletePartner}
          onAdd={handleAddPartner}
          addButtonText="Add Partner"
          filterOptions={partnerFilterOptions}
          extraActions={[
            {
              icon: <UserCheck className="h-4 w-4" />,
              label: "Approve",
              onClick: handleApprovePartner
            },
            {
              icon: <UserX className="h-4 w-4" />,
              label: "Suspend",
              onClick: handleSuspendPartner
            }
          ]}
        />
      )}

      {/* Pharmacies Table */}
      {activeTab === 'pharmacies' && (
        <DataTable
          columns={pharmacyColumns}
          data={filteredPharmacies}
          title="Pharmacy Management"
          subtitle="Manage pharmacy services, delivery status, and coverage areas"
          searchPlaceholder="Search pharmacies..."
          onSearch={handleSearch}
          onFilter={handleFilter}
          onExport={() => toast.success('Exporting pharmacy data')}
          onView={handleViewPharmacy}
          onEdit={handleEditPharmacy}
          onDelete={handleDeletePharmacy}
          onAdd={handleAddPharmacy}
          addButtonText="Add Pharmacy"
          filterOptions={pharmacyFilterOptions}
        />
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'view' ? 
                (activeTab === 'partners' ? 'Partner Details' : 'Pharmacy Details') : 
               modalMode === 'edit' ? 
                (activeTab === 'partners' ? 
                  (selectedPartner?.id ? 'Edit Partner' : 'Add Partner') : 
                  (selectedPharmacy?.id ? 'Edit Pharmacy' : 'Add Pharmacy')) : 
               modalMode === 'delete' ? 
                (activeTab === 'partners' ? 'Delete Partner' : 'Delete Pharmacy') :
               modalMode === 'approve' ? 'Approve Partner' :
               'Suspend Partner'}
            </h3>
            
            {/* View Partner */}
            {modalMode === 'view' && activeTab === 'partners' && selectedPartner && (
              <div className="space-y-6">
                {/* Partner Profile */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-20 w-20 bg-navy-100 rounded-full flex items-center justify-center overflow-hidden">
                      {selectedPartner.profile_image ? (
                        <img src={selectedPartner.profile_image} alt={selectedPartner.name} className="h-full w-full object-cover" />
                      ) : (
                        <Users className="h-10 w-10 text-navy-600" />
                      )}
                    </div>
                    <div className="ml-6 flex-1">
                      <h4 className="text-xl font-semibold text-navy-900">{selectedPartner.name}</h4>
                      <p className="text-navy-600">{selectedPartner.practice_name}</p>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-navy-500">Email</p>
                          <p className="text-navy-900">{selectedPartner.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Phone</p>
                          <p className="text-navy-900">{selectedPartner.phone}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Location</p>
                          <p className="text-navy-900">
                            {selectedPartner.practice_address.city}, {selectedPartner.practice_address.state}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Status</p>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedPartner.status)}`}>
                            {selectedPartner.status.charAt(0).toUpperCase() + selectedPartner.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Specialties & Services */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4">Specialties & Services</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-navy-500 mb-2">Specialties</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPartner.specialties?.map((specialty, index) => (
                          <span key={index} className="px-2 py-1 text-xs rounded-full bg-navy-100 text-navy-800">
                            {specialty}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-navy-500 mb-2">Consultation Options</p>
                      <div className="space-y-2">
                        <div className="flex items-center">
                          {selectedPartner.video_consultation ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className="text-navy-900">Video Consultations</span>
                        </div>
                        <div className="flex items-center">
                          {selectedPartner.in_person_consultation ? (
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500 mr-2" />
                          )}
                          <span className="text-navy-900">In-Person Consultations</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-sm text-navy-500 mb-2">Consultation Fee</p>
                      <p className="text-navy-900">${selectedPartner.consultation_fee.toFixed(2)}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-navy-500 mb-2">Rating</p>
                      <div className="flex items-center">
                        <Star className="h-5 w-5 text-yellow-400 fill-current" />
                        <span className="ml-1 text-navy-900">{selectedPartner.rating.toFixed(1)}/5.0</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {partnerStats && (
                  <div className="bg-navy-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-navy-900 mb-4">Performance Metrics</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-white p-3 rounded-lg text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">{partnerStats.total_patients}</div>
                        <div className="text-sm text-navy-600">Total Patients</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg text-center">
                        <Activity className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">{partnerStats.active_patients}</div>
                        <div className="text-sm text-navy-600">Active Patients</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg text-center">
                        <CheckCircle className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">{partnerStats.appointments_completed}</div>
                        <div className="text-sm text-navy-600">Completed Appointments</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg text-center">
                        <Clock className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">{partnerStats.appointments_upcoming}</div>
                        <div className="text-sm text-navy-600">Upcoming Appointments</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg text-center">
                        <Star className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">{partnerStats.average_rating.toFixed(1)}</div>
                        <div className="text-sm text-navy-600">Average Rating</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg text-center">
                        <DollarSign className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">${partnerStats.revenue_generated.toFixed(2)}</div>
                        <div className="text-sm text-navy-600">Revenue Generated</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <div className="space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalMode('edit');
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Partner
                    </Button>
                    {selectedPartner.status !== 'active' ? (
                      <Button
                        variant="outline"
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          setModalMode('approve');
                        }}
                      >
                        <UserCheck className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          setModalMode('suspend');
                        }}
                      >
                        <UserX className="h-4 w-4 mr-2" />
                        Suspend
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {/* View Pharmacy */}
            {modalMode === 'view' && activeTab === 'pharmacies' && selectedPharmacy && (
              <div className="space-y-6">
                {/* Pharmacy Profile */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 h-20 w-20 bg-navy-100 rounded-full flex items-center justify-center">
                      <Package className="h-10 w-10 text-navy-600" />
                    </div>
                    <div className="ml-6 flex-1">
                      <h4 className="text-xl font-semibold text-navy-900">{selectedPharmacy.name}</h4>
                      
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-navy-500">Address</p>
                          <p className="text-navy-900">{selectedPharmacy.address}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Contact</p>
                          <p className="text-navy-900">{selectedPharmacy.phone}</p>
                          <p className="text-navy-900">{selectedPharmacy.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Hours</p>
                          <p className="text-navy-900">{selectedPharmacy.hours}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Status</p>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedPharmacy.status)}`}>
                            {selectedPharmacy.status.charAt(0).toUpperCase() + selectedPharmacy.status.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Services & Coverage */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4">Services & Coverage</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-navy-500 mb-2">Services Offered</p>
                      <p className="text-navy-900">{selectedPharmacy.services}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-navy-500 mb-2">Insurance Accepted</p>
                      <p className="text-navy-900">{selectedPharmacy.insurance_accepted}</p>
                    </div>
                    
                    <div>
                      <p className="text-sm text-navy-500 mb-2">Delivery Service</p>
                      <div className="flex items-center">
                        {selectedPharmacy.delivery_available ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                            <span className="text-navy-900">Available (within {selectedPharmacy.delivery_radius} miles)</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-4 w-4 text-red-500 mr-2" />
                            <span className="text-navy-900">Not available</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Performance Metrics */}
                {pharmacyStats && (
                  <div className="bg-navy-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-navy-900 mb-4">Performance Metrics</h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg text-center">
                        <Users className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">{pharmacyStats.total_patients}</div>
                        <div className="text-sm text-navy-600">Total Patients</div>
                      </div>
                      
                      <div className="bg-white p-3 rounded-lg text-center">
                        <Package className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                        <div className="text-2xl font-semibold text-navy-900">{pharmacyStats.prescriptions_filled}</div>
                        <div className="text-sm text-navy-600">Prescriptions Filled</div>
                      </div>
                      
                      {selectedPharmacy.delivery_available && (
                        <>
                          <div className="bg-white p-3 rounded-lg text-center">
                            <Truck className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                            <div className="text-2xl font-semibold text-navy-900">{pharmacyStats.delivery_rate}%</div>
                            <div className="text-sm text-navy-600">Delivery Rate</div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg text-center">
                            <Clock className="h-5 w-5 mx-auto mb-1 text-navy-600" />
                            <div className="text-2xl font-semibold text-navy-900">{pharmacyStats.average_delivery_time}h</div>
                            <div className="text-sm text-navy-600">Avg. Delivery Time</div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setModalMode('edit');
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Pharmacy
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {/* Edit Partner */}
            {modalMode === 'edit' && activeTab === 'partners' && selectedPartner && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.name}
                      onChange={(e) => setSelectedPartner({...selectedPartner, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Practice Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.practice_name}
                      onChange={(e) => setSelectedPartner({...selectedPartner, practice_name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.email}
                      onChange={(e) => setSelectedPartner({...selectedPartner, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.phone}
                      onChange={(e) => setSelectedPartner({...selectedPartner, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">City</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.practice_address.city}
                      onChange={(e) => setSelectedPartner({
                        ...selectedPartner, 
                        practice_address: {
                          ...selectedPartner.practice_address,
                          city: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">State</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.practice_address.state}
                      onChange={(e) => setSelectedPartner({
                        ...selectedPartner, 
                        practice_address: {
                          ...selectedPartner.practice_address,
                          state: e.target.value
                        }
                      })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Consultation Fee ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.consultation_fee}
                      onChange={(e) => setSelectedPartner({...selectedPartner, consultation_fee: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPartner.status}
                      onChange={(e) => setSelectedPartner({...selectedPartner, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Specialties (comma-separated)</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                    value={selectedPartner.specialties?.join(', ') || ''}
                    onChange={(e) => setSelectedPartner({
                      ...selectedPartner, 
                      specialties: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                    })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="video_consultation"
                      checked={selectedPartner.video_consultation}
                      onChange={(e) => setSelectedPartner({...selectedPartner, video_consultation: e.target.checked})}
                      className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
                    />
                    <label htmlFor="video_consultation" className="ml-2 block text-sm text-gray-900">
                      Offers Video Consultations
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="in_person_consultation"
                      checked={selectedPartner.in_person_consultation}
                      onChange={(e) => setSelectedPartner({...selectedPartner, in_person_consultation: e.target.checked})}
                      className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
                    />
                    <label htmlFor="in_person_consultation" className="ml-2 block text-sm text-gray-900">
                      Offers In-Person Consultations
                    </label>
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePartner}
                    isLoading={loading}
                  >
                    {selectedPartner.id ? 'Save Changes' : 'Create Partner'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Edit Pharmacy */}
            {modalMode === 'edit' && activeTab === 'pharmacies' && selectedPharmacy && (
              <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPharmacy.name}
                      onChange={(e) => setSelectedPharmacy({...selectedPharmacy, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input
                      type="email"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPharmacy.email}
                      onChange={(e) => setSelectedPharmacy({...selectedPharmacy, email: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <input
                      type="tel"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPharmacy.phone}
                      onChange={(e) => setSelectedPharmacy({...selectedPharmacy, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                      value={selectedPharmacy.status}
                      onChange={(e) => setSelectedPharmacy({...selectedPharmacy, status: e.target.value})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                    value={selectedPharmacy.address}
                    onChange={(e) => setSelectedPharmacy({...selectedPharmacy, address: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Hours</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                    value={selectedPharmacy.hours}
                    onChange={(e) => setSelectedPharmacy({...selectedPharmacy, hours: e.target.value})}
                    placeholder="e.g., Mon-Fri: 9am-7pm, Sat: 10am-5pm, Sun: Closed"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Services</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                    rows={3}
                    value={selectedPharmacy.services}
                    onChange={(e) => setSelectedPharmacy({...selectedPharmacy, services: e.target.value})}
                    placeholder="e.g., Prescription filling, Compounding, Immunizations, Health screenings"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Insurance Accepted</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                    rows={2}
                    value={selectedPharmacy.insurance_accepted}
                    onChange={(e) => setSelectedPharmacy({...selectedPharmacy, insurance_accepted: e.target.value})}
                    placeholder="e.g., Blue Cross, Aetna, Cigna, Medicare, Medicaid"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="delivery_available"
                      checked={selectedPharmacy.delivery_available}
                      onChange={(e) => setSelectedPharmacy({...selectedPharmacy, delivery_available: e.target.checked})}
                      className="h-4 w-4 text-navy-600 focus:ring-navy-500 border-gray-300 rounded"
                    />
                    <label htmlFor="delivery_available" className="ml-2 block text-sm text-gray-900">
                      Offers Delivery Service
                    </label>
                  </div>
                  
                  {selectedPharmacy.delivery_available && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Delivery Radius (miles)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-navy-500 focus:ring-navy-500 sm:text-sm"
                        value={selectedPharmacy.delivery_radius}
                        onChange={(e) => setSelectedPharmacy({...selectedPharmacy, delivery_radius: parseFloat(e.target.value) || 0})}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePharmacy}
                    isLoading={loading}
                  >
                    {selectedPharmacy.id ? 'Save Changes' : 'Create Pharmacy'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Delete Confirmation */}
            {modalMode === 'delete' && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete this {activeTab === 'partners' ? 'partner' : 'pharmacy'}?
                  This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmDelete}
                    isLoading={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete {activeTab === 'partners' ? 'Partner' : 'Pharmacy'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* Approve Confirmation */}
            {modalMode === 'approve' && selectedPartner && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to approve <span className="font-semibold">{selectedPartner.name}</span>?
                  This will grant them access to the platform and allow them to interact with patients.
                </p>
                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <UserCheck className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-green-700">
                        The partner will be notified via email about their approval.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmApprove}
                    isLoading={loading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve Partner
                  </Button>
                </div>
              </div>
            )}
            
            {/* Suspend Confirmation */}
            {modalMode === 'suspend' && selectedPartner && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to suspend <span className="font-semibold">{selectedPartner.name}</span>?
                  This will temporarily revoke their access to the platform.
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <UserX className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        The partner will be notified via email about their suspension.
                        Existing patients will be notified that this provider is temporarily unavailable.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmSuspend}
                    isLoading={loading}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white"
                  >
                    Suspend Partner
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}