import { useState, useEffect } from 'react';
import { Activity, Search, Filter, Download, Plus, Eye, Edit, Trash, Tag, DollarSign, Clock, MapPin, BarChart, CheckCircle, XCircle, Users, ArrowUpDown, Briefcase, Zap, Sparkles } from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: string;
  image_url: string | null;
  active: boolean;
  created_at: string;
}

interface ServiceStats {
  total_bookings: number;
  revenue_generated: number;
  active_bookings: number;
  average_rating: number;
}

interface ServicePartner {
  id: string;
  name: string;
  practice_name: string;
  specialties: string[];
}

export default function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [modalMode, setModalMode] = useState<'view' | 'edit' | 'delete' | 'assign' | 'stats'>('view');
  const [serviceStats, setServiceStats] = useState<ServiceStats | null>(null);
  const [availablePartners, setAvailablePartners] = useState<ServicePartner[]>([]);
  const [assignedPartners, setAssignedPartners] = useState<ServicePartner[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });
      
      if (error) throw error;
      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast.error('Failed to load services');
    } finally {
      setLoading(false);
    }
  };

  const loadServiceStats = async (serviceId: string) => {
    try {
      setLoading(true);
      
      // Get appointment count
      const { count: bookingsCount, error: bookingsError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId);
      
      if (bookingsError) throw bookingsError;
      
      // Get active bookings
      const { count: activeBookingsCount, error: activeError } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('service_id', serviceId)
        .in('status', ['pending', 'confirmed']);
      
      if (activeError) throw activeError;
      
      // Get revenue data
      const { data: revenueData, error: revenueError } = await supabase
        .from('appointments')
        .select('service_id')
        .eq('service_id', serviceId)
        .eq('status', 'completed');
      
      if (revenueError) throw revenueError;
      
      const selectedServicePrice = selectedService?.price || 0;
      const totalRevenue = (revenueData?.length || 0) * selectedServicePrice;
      
      // Set stats
      setServiceStats({
        total_bookings: bookingsCount || 0,
        revenue_generated: totalRevenue,
        active_bookings: activeBookingsCount || 0,
        average_rating: 4.7 // Placeholder - would come from reviews in a real app
      });
    } catch (error) {
      console.error('Error loading service stats:', error);
      toast.error('Failed to load service statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadServicePartners = async (serviceId: string) => {
    try {
      setLoading(true);
      
      // In a real app, you would have a service_partners junction table
      // For this demo, we'll just load all partners and simulate assignment
      
      const { data: partners, error: partnersError } = await supabase
        .from('partners')
        .select('id, name, practice_name, specialties')
        .eq('status', 'active');
      
      if (partnersError) throw partnersError;
      
      // Simulate assigned partners (in a real app, this would be from a junction table)
      const assignedIds = new Set();
      const assigned: ServicePartner[] = [];
      const available: ServicePartner[] = [];
      
      // Randomly assign some partners to this service for demo purposes
      partners?.forEach(partner => {
        if (Math.random() > 0.7) {
          assignedIds.add(partner.id);
          assigned.push(partner);
        } else {
          available.push(partner);
        }
      });
      
      setAssignedPartners(assigned || []);
      setAvailablePartners(available || []);
    } catch (error) {
      console.error('Error loading service partners:', error);
      toast.error('Failed to load service partners');
    } finally {
      setLoading(false);
    }
  };

  const handleViewService = async (service: Service) => {
    setSelectedService(service);
    setModalMode('view');
    await loadServiceStats(service.id);
    setShowModal(true);
  };

  const handleEditService = (service: Service) => {
    setSelectedService(service);
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeleteService = (service: Service) => {
    setSelectedService(service);
    setModalMode('delete');
    setShowModal(true);
  };

  const handleAssignService = async (service: Service) => {
    setSelectedService(service);
    await loadServicePartners(service.id);
    setModalMode('assign');
    setShowModal(true);
  };

  const handleViewStats = async (service: Service) => {
    setSelectedService(service);
    await loadServiceStats(service.id);
    setModalMode('stats');
    setShowModal(true);
  };

  const handleToggleServiceStatus = async (service: Service) => {
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('services')
        .update({ active: !service.active })
        .eq('id', service.id);
      
      if (error) throw error;
      
      toast.success(`Service ${service.active ? 'deactivated' : 'activated'} successfully`);
      
      // Update local state
      setServices(services.map(s => 
        s.id === service.id ? { ...s, active: !s.active } : s
      ));
    } catch (error) {
      console.error('Error toggling service status:', error);
      toast.error('Failed to update service status');
    } finally {
      setLoading(false);
    }
  };

  const handleAddService = () => {
    setSelectedService({
      id: '',
      name: '',
      description: '',
      price: 0,
      duration: '',
      category: '',
      image_url: null,
      active: true,
      created_at: new Date().toISOString()
    });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleSaveService = async () => {
    if (!selectedService) return;

    try {
      setLoading(true);
      
      if (selectedService.id) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({
            name: selectedService.name,
            description: selectedService.description,
            price: selectedService.price,
            duration: selectedService.duration,
            category: selectedService.category,
            image_url: selectedService.image_url,
            active: selectedService.active
          })
          .eq('id', selectedService.id);
        
        if (error) throw error;
        toast.success('Service updated successfully');
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert([{
            name: selectedService.name,
            description: selectedService.description,
            price: selectedService.price,
            duration: selectedService.duration,
            category: selectedService.category,
            image_url: selectedService.image_url,
            active: selectedService.active
          }]);
        
        if (error) throw error;
        toast.success('Service created successfully');
      }
      
      setShowModal(false);
      loadServices();
    } catch (error) {
      console.error('Error saving service:', error);
      toast.error('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedService) return;

    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', selectedService.id);
      
      if (error) throw error;
      
      toast.success('Service deleted successfully');
      setShowModal(false);
      loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
      toast.error('Failed to delete service');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignPartner = async (partnerId: string) => {
    if (!selectedService) return;

    try {
      setLoading(true);
      
      // In a real app, you would insert into a service_partners junction table
      // For this demo, we'll just show a success message
      
      toast.success('Partner assigned to service successfully');
      
      // Update local state for UI
      const partnerToMove = availablePartners.find(p => p.id === partnerId);
      if (partnerToMove) {
        setAssignedPartners([...assignedPartners, partnerToMove]);
        setAvailablePartners(availablePartners.filter(p => p.id !== partnerId));
      }
    } catch (error) {
      console.error('Error assigning partner:', error);
      toast.error('Failed to assign partner');
    } finally {
      setLoading(false);
    }
  };

  const handleUnassignPartner = async (partnerId: string) => {
    if (!selectedService) return;

    try {
      setLoading(true);
      
      // In a real app, you would delete from a service_partners junction table
      // For this demo, we'll just show a success message
      
      toast.success('Partner unassigned from service successfully');
      
      // Update local state for UI
      const partnerToMove = assignedPartners.find(p => p.id === partnerId);
      if (partnerToMove) {
        setAvailablePartners([...availablePartners, partnerToMove]);
        setAssignedPartners(assignedPartners.filter(p => p.id !== partnerId));
      }
    } catch (error) {
      console.error('Error unassigning partner:', error);
      toast.error('Failed to unassign partner');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilter = (filters: Record<string, string>) => {
    setCategoryFilter(filters.category || '');
    setStatusFilter(filters.status || '');
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'medical':
        return 'bg-blue-100 text-blue-800';
      case 'wellness':
        return 'bg-green-100 text-green-800';
      case 'aesthetic':
        return 'bg-purple-100 text-purple-800';
      case 'medical_cosmetic':
        return 'bg-pink-100 text-pink-800';
      case 'spa':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredServices = services.filter(service => {
    const matchesSearch = 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || service.category === categoryFilter;
    const matchesStatus = !statusFilter || 
      (statusFilter === 'active' && service.active) || 
      (statusFilter === 'inactive' && !service.active);
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      header: 'Service',
      render: (value: string, row: Service) => (
        <div className="flex items-center">
          <div className="flex-shrink-0 h-10 w-10 bg-navy-100 rounded-full flex items-center justify-center">
            <Activity className="h-5 w-5 text-navy-600" />
          </div>
          <div className="ml-4">
            <div className="text-sm font-medium text-navy-900">{value}</div>
            <div className="text-sm text-navy-500 truncate max-w-xs">{row.description.substring(0, 50)}{row.description.length > 50 ? '...' : ''}</div>
          </div>
        </div>
      ),
      sortable: true
    },
    {
      key: 'category',
      header: 'Category',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(value)}`}>
          {value.replace('_', ' ').charAt(0).toUpperCase() + value.replace('_', ' ').slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'price',
      header: 'Price',
      render: (value: number) => (
        <div className="flex items-center">
          <DollarSign className="h-4 w-4 text-gray-500 mr-1" />
          <span className="font-medium">{value.toFixed(2)}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'duration',
      header: 'Duration',
      render: (value: string) => (
        <div className="flex items-center">
          <Clock className="h-4 w-4 text-gray-500 mr-1" />
          <span>{value}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'active',
      header: 'Status',
      render: (value: boolean) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
      sortable: true
    }
  ];

  const filterOptions = [
    {
      key: 'category',
      label: 'Category',
      options: [
        { value: 'medical', label: 'Medical' },
        { value: 'wellness', label: 'Wellness' },
        { value: 'aesthetic', label: 'Aesthetic' },
        { value: 'medical_cosmetic', label: 'Medical Cosmetic' },
        { value: 'spa', label: 'Spa' }
      ]
    },
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
      {/* Service Stats Overview */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <Activity className="h-5 w-5 mr-2 text-gold-500" />
              Service Overview
            </h2>
            <p className="text-navy-600 text-sm">
              Manage your concierge services and track performance
            </p>
          </div>
          <Button
            variant="luxury"
            onClick={handleAddService}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add New Service
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Services</div>
              <div className="text-xl font-bold text-navy-900">{services.length}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Active Services</div>
              <div className="text-xl font-bold text-navy-900">
                {services.filter(s => s.active).length}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Categories</div>
              <div className="text-xl font-bold text-navy-900">
                {new Set(services.map(s => s.category)).size}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Avg. Price</div>
              <div className="text-xl font-bold text-navy-900">
                ${services.length > 0 
                  ? (services.reduce((sum, s) => sum + s.price, 0) / services.length).toFixed(2)
                  : '0.00'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <h2 className="text-xl font-semibold text-navy-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={handleAddService}
          >
            <Plus className="h-5 w-5 mr-2" />
            Add New Service
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Importing services...')}
          >
            <Download className="h-5 w-5 mr-2" />
            Import Services
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Generating report...')}
          >
            <BarChart className="h-5 w-5 mr-2" />
            Service Report
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Bulk update initiated...')}
          >
            <Zap className="h-5 w-5 mr-2" />
            Bulk Update
          </Button>
        </div>
      </div>

      {/* Service Table */}
      <DataTable
        columns={columns}
        data={filteredServices}
        title="Service Management"
        subtitle="Add/edit/delete concierge services, set availability, and track usage"
        searchPlaceholder="Search services..."
        onSearch={handleSearch}
        onFilter={handleFilter}
        onExport={() => toast.success('Exporting service data')}
        onView={handleViewService}
        onEdit={handleEditService}
        onDelete={handleDeleteService}
        onAdd={handleAddService}
        addButtonText="Add Service"
        filterOptions={filterOptions}
        extraActions={[
          {
            icon: <Users className="h-4 w-4" />,
            label: "Assign Partners",
            onClick: handleAssignService
          },
          {
            icon: <BarChart className="h-4 w-4" />,
            label: "View Stats",
            onClick: handleViewStats
          },
          {
            icon: <ArrowUpDown className="h-4 w-4" />,
            label: "Toggle Status",
            onClick: handleToggleServiceStatus
          }
        ]}
      />

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'view' ? 'Service Details' : 
               modalMode === 'edit' ? (selectedService?.id ? 'Edit Service' : 'Add Service') : 
               modalMode === 'delete' ? 'Delete Service' :
               modalMode === 'assign' ? 'Assign Partners' :
               'Service Statistics'}
            </h3>
            
            {modalMode === 'view' && selectedService && (
              <div className="space-y-6">
                {/* Service Details */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-navy-600" />
                    Service Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedService.name}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCategoryColor(selectedService.category)}`}>
                          {selectedService.category.replace('_', ' ').charAt(0).toUpperCase() + selectedService.category.replace('_', ' ').slice(1)}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price</label>
                      <div className="mt-1 p-2 bg-white rounded-md">${selectedService.price.toFixed(2)}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Duration</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedService.duration}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          selectedService.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {selectedService.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Created At</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        {new Date(selectedService.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <div className="mt-1 p-2 bg-white rounded-md">{selectedService.description}</div>
                  </div>
                  {selectedService.image_url && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700">Image</label>
                      <div className="mt-1">
                        <img 
                          src={selectedService.image_url} 
                          alt={selectedService.name} 
                          className="h-40 w-auto object-cover rounded-md"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Service Stats */}
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4 flex items-center">
                    <BarChart className="h-5 w-5 mr-2 text-navy-600" />
                    Service Performance
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-navy-600">Total Bookings</div>
                      <div className="text-2xl font-semibold text-navy-900">{serviceStats?.total_bookings || 0}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-navy-600">Active Bookings</div>
                      <div className="text-2xl font-semibold text-navy-900">{serviceStats?.active_bookings || 0}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-navy-600">Revenue Generated</div>
                      <div className="text-2xl font-semibold text-navy-900">${serviceStats?.revenue_generated.toFixed(2) || '0.00'}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="text-sm text-navy-600">Average Rating</div>
                      <div className="text-2xl font-semibold text-navy-900">{serviceStats?.average_rating.toFixed(1) || '0.0'}</div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <div className="space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalMode('edit');
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Service
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setModalMode('assign');
                        loadServicePartners(selectedService.id);
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Assign Partners
                    </Button>
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
            
            {modalMode === 'edit' && selectedService && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Name</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedService.name}
                    onChange={(e) => setSelectedService({...selectedService, name: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    rows={3}
                    value={selectedService.description}
                    onChange={(e) => setSelectedService({...selectedService, description: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedService.price}
                      onChange={(e) => setSelectedService({...selectedService, price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedService.duration}
                      onChange={(e) => setSelectedService({...selectedService, duration: e.target.value})}
                      placeholder="e.g. 60 minutes"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedService.category}
                      onChange={(e) => setSelectedService({...selectedService, category: e.target.value})}
                    >
                      <option value="">Select Category</option>
                      <option value="medical">Medical</option>
                      <option value="wellness">Wellness</option>
                      <option value="aesthetic">Aesthetic</option>
                      <option value="medical_cosmetic">Medical Cosmetic</option>
                      <option value="spa">Spa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                      value={selectedService.active ? 'active' : 'inactive'}
                      onChange={(e) => setSelectedService({...selectedService, active: e.target.value === 'active'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Image URL</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-leaf-500 focus:ring-leaf-500 sm:text-sm"
                    value={selectedService.image_url || ''}
                    onChange={(e) => setSelectedService({...selectedService, image_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">Enter a URL for the service image (optional)</p>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveService}
                    isLoading={loading}
                  >
                    {selectedService.id ? 'Save Changes' : 'Create Service'}
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'delete' && selectedService && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the service <span className="font-semibold">{selectedService.name}</span>?
                  This action cannot be undone.
                </p>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <XCircle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Deleting this service will remove it from all appointments and availability.
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
                    onClick={handleConfirmDelete}
                    isLoading={loading}
                    className="bg-red-600 hover:bg-red-700 text-white"
                  >
                    Delete Service
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'assign' && selectedService && (
              <div className="space-y-4">
                <p className="text-gray-700">
                  Assign partners to <span className="font-semibold">{selectedService.name}</span>:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Assigned Partners */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Assigned Partners</h4>
                    {assignedPartners.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {assignedPartners.map((partner) => (
                          <div key={partner.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-navy-900">{partner.name}</p>
                              <p className="text-sm text-navy-600">{partner.practice_name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {partner.specialties?.slice(0, 2).map(specialty => (
                                  <span key={specialty} className="bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full text-xs">
                                    {specialty}
                                  </span>
                                ))}
                                {partner.specialties?.length > 2 && (
                                  <span className="bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full text-xs">
                                    +{partner.specialties.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUnassignPartner(partner.id)}
                              className="text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No partners assigned</p>
                    )}
                  </div>
                  
                  {/* Available Partners */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Available Partners</h4>
                    {availablePartners.length > 0 ? (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {availablePartners.map((partner) => (
                          <div key={partner.id} className="bg-gray-50 rounded-lg p-3 flex justify-between items-center">
                            <div>
                              <p className="font-medium text-navy-900">{partner.name}</p>
                              <p className="text-sm text-navy-600">{partner.practice_name}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {partner.specialties?.slice(0, 2).map(specialty => (
                                  <span key={specialty} className="bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full text-xs">
                                    {specialty}
                                  </span>
                                ))}
                                {partner.specialties?.length > 2 && (
                                  <span className="bg-navy-100 text-navy-800 px-2 py-0.5 rounded-full text-xs">
                                    +{partner.specialties.length - 2} more
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAssignPartner(partner.id)}
                              className="text-green-600 hover:bg-green-50"
                            >
                              Assign
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No available partners</p>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
            
            {modalMode === 'stats' && selectedService && (
              <div className="space-y-6">
                <h4 className="font-medium text-gray-900">
                  Performance Statistics for {selectedService.name}
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-navy-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-navy-600">Booking Statistics</h5>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Total Bookings</span>
                          <span className="font-semibold text-navy-900">{serviceStats?.total_bookings || 0}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Active Bookings</span>
                          <span className="font-semibold text-navy-900">{serviceStats?.active_bookings || 0}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Completion Rate</span>
                          <span className="font-semibold text-navy-900">
                            {serviceStats?.total_bookings 
                              ? ((serviceStats.total_bookings - serviceStats.active_bookings) / serviceStats.total_bookings * 100).toFixed(1) 
                              : 0}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-navy-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h5 className="text-sm font-medium text-navy-600">Financial Performance</h5>
                    </div>
                    <div className="space-y-4">
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Revenue Generated</span>
                          <span className="font-semibold text-navy-900">${serviceStats?.revenue_generated.toFixed(2) || '0.00'}</span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Average Revenue/Booking</span>
                          <span className="font-semibold text-navy-900">
                            ${serviceStats?.total_bookings 
                              ? (serviceStats.revenue_generated / serviceStats.total_bookings).toFixed(2) 
                              : '0.00'}
                          </span>
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-navy-600">Customer Rating</span>
                          <span className="font-semibold text-navy-900">{serviceStats?.average_rating.toFixed(1) || '0.0'}/5.0</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Close
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