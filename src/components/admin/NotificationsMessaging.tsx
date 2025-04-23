import { useState, useEffect } from 'react';
import { 
  Bell, 
  Send, 
  Users, 
  UserCheck, 
  Briefcase, 
  Calendar, 
  Clock, 
  Mail, 
  MessageSquare, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Edit, 
  Trash, 
  Eye, 
  Plus, 
  Filter, 
  Search, 
  Download, 
  BarChart, 
  Megaphone, 
  Globe, 
  Smartphone
} from 'lucide-react';
import Button from '../ui/Button';
import DataTable from '../ui/DataTable';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import ChartCard from '../ui/ChartCard';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface Message {
  id: string;
  title: string;
  content: string;
  target_audience: 'members' | 'partners' | 'all';
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled';
  scheduled_for: string | null;
  sent_at: string | null;
  created_at: string;
  created_by: string;
  email_delivery: boolean;
  sms_delivery: boolean;
  delivery_stats: {
    delivered: number;
    opened: number;
    clicked: number;
    failed: number;
  };
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  type: 'banner' | 'modal' | 'notification';
  status: 'active' | 'scheduled' | 'expired' | 'draft';
  start_date: string;
  end_date: string;
  target_audience: 'members' | 'partners' | 'all';
  created_at: string;
  created_by: string;
  priority: 'low' | 'medium' | 'high';
  dismissible: boolean;
  views: number;
  dismissals: number;
}

interface DeliveryStats {
  date: string;
  delivered: number;
  opened: number;
  clicked: number;
}

export default function NotificationsMessaging() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create-message' | 'edit-message' | 'view-message' | 'delete-message' | 'create-announcement' | 'edit-announcement' | 'view-announcement' | 'delete-announcement'>('create-message');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [activeTab, setActiveTab] = useState<'messages' | 'announcements' | 'analytics'>('messages');
  const [messageFilter, setMessageFilter] = useState<'all' | 'draft' | 'scheduled' | 'sent' | 'cancelled'>('all');
  const [audienceFilter, setAudienceFilter] = useState<'all' | 'members' | 'partners'>('all');
  const [deliveryStats, setDeliveryStats] = useState<DeliveryStats[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Form state for new/edit message
  const [messageForm, setMessageForm] = useState({
    title: '',
    content: '',
    target_audience: 'all',
    status: 'draft',
    scheduled_for: '',
    email_delivery: true,
    sms_delivery: false
  });

  // Form state for new/edit announcement
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    type: 'banner',
    status: 'draft',
    start_date: '',
    end_date: '',
    target_audience: 'all',
    priority: 'medium',
    dismissible: true
  });

  useEffect(() => {
    loadMessages();
    loadAnnouncements();
    loadDeliveryStats();
  }, []);

  const loadMessages = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from a messages table
      // For this demo, we'll create mock data
      
      const mockMessages: Message[] = Array.from({ length: 15 }, (_, i) => {
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
        
        const scheduledDate = new Date(createdDate);
        scheduledDate.setDate(scheduledDate.getDate() + Math.floor(Math.random() * 7) + 1);
        
        const sentDate = Math.random() > 0.5 ? new Date(scheduledDate) : null;
        
        const status: Message['status'] = sentDate 
          ? 'sent' 
          : Math.random() > 0.7 
            ? 'cancelled' 
            : Math.random() > 0.5 
              ? 'scheduled' 
              : 'draft';
        
        const targetAudience: Message['target_audience'] = Math.random() > 0.6 
          ? 'members' 
          : Math.random() > 0.5 
            ? 'partners' 
            : 'all';
        
        const deliveredCount = Math.floor(Math.random() * 1000) + 100;
        const openedCount = Math.floor(deliveredCount * (Math.random() * 0.7 + 0.2));
        const clickedCount = Math.floor(openedCount * (Math.random() * 0.5 + 0.1));
        const failedCount = Math.floor(Math.random() * 50);
        
        return {
          id: `msg-${i + 1}`,
          title: [
            'Important Platform Update',
            'New Feature Announcement',
            'Upcoming Maintenance',
            'Holiday Schedule Changes',
            'Membership Benefits Update',
            'New Partner Onboarding',
            'Health Tips Newsletter',
            'Seasonal Promotion',
            'Service Expansion Notice',
            'Wellness Challenge Invitation'
          ][Math.floor(Math.random() * 10)],
          content: `This is a sample message content for message ${i + 1}. It contains important information that would be sent to users.`,
          target_audience: targetAudience,
          status,
          scheduled_for: status === 'scheduled' ? scheduledDate.toISOString() : null,
          sent_at: sentDate?.toISOString() || null,
          created_at: createdDate.toISOString(),
          created_by: 'admin-user',
          email_delivery: Math.random() > 0.3,
          sms_delivery: Math.random() > 0.7,
          delivery_stats: {
            delivered: deliveredCount,
            opened: openedCount,
            clicked: clickedCount,
            failed: failedCount
          }
        };
      });
      
      setMessages(mockMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from an announcements table
      // For this demo, we'll create mock data
      
      const mockAnnouncements: Announcement[] = Array.from({ length: 10 }, (_, i) => {
        const createdDate = new Date();
        createdDate.setDate(createdDate.getDate() - Math.floor(Math.random() * 30));
        
        const startDate = new Date(createdDate);
        startDate.setDate(startDate.getDate() + Math.floor(Math.random() * 3));
        
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + Math.floor(Math.random() * 14) + 1);
        
        const status: Announcement['status'] = 
          new Date() < startDate 
            ? 'scheduled' 
            : new Date() > endDate 
              ? 'expired' 
              : Math.random() > 0.8 
                ? 'draft' 
                : 'active';
        
        const targetAudience: Announcement['target_audience'] = Math.random() > 0.6 
          ? 'members' 
          : Math.random() > 0.5 
            ? 'partners' 
            : 'all';
        
        const type: Announcement['type'] = Math.random() > 0.6 
          ? 'banner' 
          : Math.random() > 0.5 
            ? 'modal' 
            : 'notification';
        
        const priority: Announcement['priority'] = Math.random() > 0.7 
          ? 'high' 
          : Math.random() > 0.4 
            ? 'medium' 
            : 'low';
        
        return {
          id: `ann-${i + 1}`,
          title: [
            'System Maintenance Notice',
            'New Feature Release',
            'Important Security Update',
            'Holiday Hours',
            'Terms of Service Update',
            'Privacy Policy Changes',
            'New Partner Integration',
            'Platform Upgrade Complete',
            'Special Promotion',
            'COVID-19 Protocol Update'
          ][Math.floor(Math.random() * 10)],
          content: `This is a sample announcement content for announcement ${i + 1}. It would be displayed to users as a ${type}.`,
          type,
          status,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          target_audience: targetAudience,
          created_at: createdDate.toISOString(),
          created_by: 'admin-user',
          priority,
          dismissible: Math.random() > 0.3,
          views: Math.floor(Math.random() * 5000) + 500,
          dismissals: Math.floor(Math.random() * 2000) + 100
        };
      });
      
      setAnnouncements(mockAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
      toast.error('Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const loadDeliveryStats = () => {
    // Generate mock delivery stats for the last 7 days
    const stats: DeliveryStats[] = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      
      return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        delivered: Math.floor(Math.random() * 500) + 200,
        opened: Math.floor(Math.random() * 300) + 100,
        clicked: Math.floor(Math.random() * 150) + 50
      };
    });
    
    setDeliveryStats(stats);
  };

  const handleCreateMessage = () => {
    setMessageForm({
      title: '',
      content: '',
      target_audience: 'all',
      status: 'draft',
      scheduled_for: '',
      email_delivery: true,
      sms_delivery: false
    });
    setModalMode('create-message');
    setShowModal(true);
  };

  const handleEditMessage = (message: Message) => {
    setSelectedMessage(message);
    setMessageForm({
      title: message.title,
      content: message.content,
      target_audience: message.target_audience,
      status: message.status,
      scheduled_for: message.scheduled_for || '',
      email_delivery: message.email_delivery,
      sms_delivery: message.sms_delivery
    });
    setModalMode('edit-message');
    setShowModal(true);
  };

  const handleViewMessage = (message: Message) => {
    setSelectedMessage(message);
    setModalMode('view-message');
    setShowModal(true);
  };

  const handleDeleteMessage = (message: Message) => {
    setSelectedMessage(message);
    setModalMode('delete-message');
    setShowModal(true);
  };

  const handleCreateAnnouncement = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    setAnnouncementForm({
      title: '',
      content: '',
      type: 'banner',
      status: 'draft',
      start_date: tomorrow.toISOString().split('T')[0],
      end_date: nextWeek.toISOString().split('T')[0],
      target_audience: 'all',
      priority: 'medium',
      dismissible: true
    });
    setModalMode('create-announcement');
    setShowModal(true);
  };

  const handleEditAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      type: announcement.type,
      status: announcement.status,
      start_date: new Date(announcement.start_date).toISOString().split('T')[0],
      end_date: new Date(announcement.end_date).toISOString().split('T')[0],
      target_audience: announcement.target_audience,
      priority: announcement.priority,
      dismissible: announcement.dismissible
    });
    setModalMode('edit-announcement');
    setShowModal(true);
  };

  const handleViewAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setModalMode('view-announcement');
    setShowModal(true);
  };

  const handleDeleteAnnouncement = (announcement: Announcement) => {
    setSelectedAnnouncement(announcement);
    setModalMode('delete-announcement');
    setShowModal(true);
  };

  const handleSaveMessage = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would save to a messages table
      // For this demo, we'll just show a success message
      
      if (modalMode === 'create-message') {
        // Create new message
        const newMessage: Message = {
          id: `msg-${Date.now()}`,
          title: messageForm.title,
          content: messageForm.content,
          target_audience: messageForm.target_audience as Message['target_audience'],
          status: messageForm.status as Message['status'],
          scheduled_for: messageForm.scheduled_for || null,
          sent_at: null,
          created_at: new Date().toISOString(),
          created_by: 'admin-user',
          email_delivery: messageForm.email_delivery,
          sms_delivery: messageForm.sms_delivery,
          delivery_stats: {
            delivered: 0,
            opened: 0,
            clicked: 0,
            failed: 0
          }
        };
        
        setMessages([newMessage, ...messages]);
        toast.success('Message created successfully');
      } else if (modalMode === 'edit-message' && selectedMessage) {
        // Update existing message
        const updatedMessages = messages.map(msg => 
          msg.id === selectedMessage.id 
            ? {
                ...msg,
                title: messageForm.title,
                content: messageForm.content,
                target_audience: messageForm.target_audience as Message['target_audience'],
                status: messageForm.status as Message['status'],
                scheduled_for: messageForm.scheduled_for || null,
                email_delivery: messageForm.email_delivery,
                sms_delivery: messageForm.sms_delivery
              }
            : msg
        );
        
        setMessages(updatedMessages);
        toast.success('Message updated successfully');
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Error saving message:', error);
      toast.error('Failed to save message');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would save to an announcements table
      // For this demo, we'll just show a success message
      
      if (modalMode === 'create-announcement') {
        // Create new announcement
        const newAnnouncement: Announcement = {
          id: `ann-${Date.now()}`,
          title: announcementForm.title,
          content: announcementForm.content,
          type: announcementForm.type as Announcement['type'],
          status: announcementForm.status as Announcement['status'],
          start_date: new Date(announcementForm.start_date).toISOString(),
          end_date: new Date(announcementForm.end_date).toISOString(),
          target_audience: announcementForm.target_audience as Announcement['target_audience'],
          created_at: new Date().toISOString(),
          created_by: 'admin-user',
          priority: announcementForm.priority as Announcement['priority'],
          dismissible: announcementForm.dismissible,
          views: 0,
          dismissals: 0
        };
        
        setAnnouncements([newAnnouncement, ...announcements]);
        toast.success('Announcement created successfully');
      } else if (modalMode === 'edit-announcement' && selectedAnnouncement) {
        // Update existing announcement
        const updatedAnnouncements = announcements.map(ann => 
          ann.id === selectedAnnouncement.id 
            ? {
                ...ann,
                title: announcementForm.title,
                content: announcementForm.content,
                type: announcementForm.type as Announcement['type'],
                status: announcementForm.status as Announcement['status'],
                start_date: new Date(announcementForm.start_date).toISOString(),
                end_date: new Date(announcementForm.end_date).toISOString(),
                target_audience: announcementForm.target_audience as Announcement['target_audience'],
                priority: announcementForm.priority as Announcement['priority'],
                dismissible: announcementForm.dismissible
              }
            : ann
        );
        
        setAnnouncements(updatedAnnouncements);
        toast.success('Announcement updated successfully');
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      setLoading(true);
      
      if (modalMode === 'delete-message' && selectedMessage) {
        // Delete message
        setMessages(messages.filter(msg => msg.id !== selectedMessage.id));
        toast.success('Message deleted successfully');
      } else if (modalMode === 'delete-announcement' && selectedAnnouncement) {
        // Delete announcement
        setAnnouncements(announcements.filter(ann => ann.id !== selectedAnnouncement.id));
        toast.success('Announcement deleted successfully');
      }
      
      setShowModal(false);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    } finally {
      setLoading(false);
    }
  };

  const handleSendNow = async (message: Message) => {
    try {
      setLoading(true);
      
      // Update message status to sent
      const updatedMessages = messages.map(msg => 
        msg.id === message.id 
          ? {
              ...msg,
              status: 'sent' as const,
              sent_at: new Date().toISOString(),
              scheduled_for: null
            }
          : msg
      );
      
      setMessages(updatedMessages);
      toast.success('Message sent successfully');
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelScheduled = async (message: Message) => {
    try {
      setLoading(true);
      
      // Update message status to cancelled
      const updatedMessages = messages.map(msg => 
        msg.id === message.id 
          ? {
              ...msg,
              status: 'cancelled' as const
            }
          : msg
      );
      
      setMessages(updatedMessages);
      toast.success('Scheduled message cancelled');
    } catch (error) {
      console.error('Error cancelling message:', error);
      toast.error('Failed to cancel message');
    } finally {
      setLoading(false);
    }
  };

  const handleActivateAnnouncement = async (announcement: Announcement) => {
    try {
      setLoading(true);
      
      // Update announcement status to active
      const updatedAnnouncements = announcements.map(ann => 
        ann.id === announcement.id 
          ? {
              ...ann,
              status: 'active' as const
            }
          : ann
      );
      
      setAnnouncements(updatedAnnouncements);
      toast.success('Announcement activated');
    } catch (error) {
      console.error('Error activating announcement:', error);
      toast.error('Failed to activate announcement');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAnnouncement = async (announcement: Announcement) => {
    try {
      setLoading(true);
      
      // Update announcement status to expired
      const updatedAnnouncements = announcements.map(ann => 
        ann.id === announcement.id 
          ? {
              ...ann,
              status: 'expired' as const
            }
          : ann
      );
      
      setAnnouncements(updatedAnnouncements);
      toast.success('Announcement deactivated');
    } catch (error) {
      console.error('Error deactivating announcement:', error);
      toast.error('Failed to deactivate announcement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'sent':
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
      case 'expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getAudienceColor = (audience: string) => {
    switch (audience) {
      case 'members':
        return 'bg-purple-100 text-purple-800';
      case 'partners':
        return 'bg-indigo-100 text-indigo-800';
      case 'all':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'banner':
        return 'bg-amber-100 text-amber-800';
      case 'modal':
        return 'bg-violet-100 text-violet-800';
      case 'notification':
        return 'bg-emerald-100 text-emerald-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredMessages = messages.filter(message => {
    const matchesStatus = messageFilter === 'all' || message.status === messageFilter;
    const matchesAudience = audienceFilter === 'all' || message.target_audience === audienceFilter;
    const matchesSearch = message.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         message.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesAudience && matchesSearch;
  });

  const filteredAnnouncements = announcements.filter(announcement => {
    const matchesAudience = audienceFilter === 'all' || announcement.target_audience === audienceFilter;
    const matchesSearch = announcement.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         announcement.content.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesAudience && matchesSearch;
  });

  const messageColumns = [
    {
      key: 'title',
      header: 'Message',
      render: (value: string, row: Message) => (
        <div className="flex flex-col">
          <span className="font-medium text-navy-900">{value}</span>
          <span className="text-xs text-navy-500 mt-1 line-clamp-1">{row.content}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'target_audience',
      header: 'Audience',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getAudienceColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: string, row: Message) => (
        <div className="flex flex-col">
          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(value)}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          {row.scheduled_for && value === 'scheduled' && (
            <span className="text-xs text-navy-500 mt-1">
              {new Date(row.scheduled_for).toLocaleString()}
            </span>
          )}
        </div>
      ),
      sortable: true
    },
    {
      key: 'delivery',
      header: 'Delivery',
      render: (value: any, row: Message) => (
        <div className="flex space-x-2">
          {row.email_delivery && (
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
              Email
            </span>
          )}
          {row.sms_delivery && (
            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              SMS
            </span>
          )}
        </div>
      )
    },
    {
      key: 'stats',
      header: 'Performance',
      render: (value: any, row: Message) => (
        row.status === 'sent' ? (
          <div className="flex flex-col">
            <div className="flex items-center text-xs text-navy-600">
              <span className="font-medium">Delivered:</span>
              <span className="ml-1">{row.delivery_stats.delivered}</span>
            </div>
            <div className="flex items-center text-xs text-navy-600">
              <span className="font-medium">Opened:</span>
              <span className="ml-1">{row.delivery_stats.opened}</span>
              <span className="ml-1 text-gray-500">
                ({Math.round((row.delivery_stats.opened / row.delivery_stats.delivered) * 100)}%)
              </span>
            </div>
          </div>
        ) : (
          <span className="text-xs text-gray-500">Not sent yet</span>
        )
      )
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (value: string) => (
        <span className="text-sm text-navy-600">
          {new Date(value).toLocaleDateString()}
        </span>
      ),
      sortable: true
    }
  ];

  const announcementColumns = [
    {
      key: 'title',
      header: 'Announcement',
      render: (value: string, row: Announcement) => (
        <div className="flex flex-col">
          <span className="font-medium text-navy-900">{value}</span>
          <span className="text-xs text-navy-500 mt-1 line-clamp-1">{row.content}</span>
        </div>
      ),
      sortable: true
    },
    {
      key: 'type',
      header: 'Type',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
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
    },
    {
      key: 'target_audience',
      header: 'Audience',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getAudienceColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (value: string) => (
        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
      sortable: true
    },
    {
      key: 'date_range',
      header: 'Active Period',
      render: (value: any, row: Announcement) => (
        <div className="flex flex-col text-xs text-navy-600">
          <div>From: {new Date(row.start_date).toLocaleDateString()}</div>
          <div>To: {new Date(row.end_date).toLocaleDateString()}</div>
        </div>
      )
    },
    {
      key: 'stats',
      header: 'Performance',
      render: (value: any, row: Announcement) => (
        <div className="flex flex-col">
          <div className="flex items-center text-xs text-navy-600">
            <span className="font-medium">Views:</span>
            <span className="ml-1">{row.views}</span>
          </div>
          <div className="flex items-center text-xs text-navy-600">
            <span className="font-medium">Dismissals:</span>
            <span className="ml-1">{row.dismissals}</span>
            <span className="ml-1 text-gray-500">
              ({Math.round((row.dismissals / (row.views || 1)) * 100)}%)
            </span>
          </div>
        </div>
      )
    }
  ];

  const messageFilterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'draft', label: 'Draft' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'sent', label: 'Sent' },
        { value: 'cancelled', label: 'Cancelled' }
      ]
    },
    {
      key: 'audience',
      label: 'Audience',
      options: [
        { value: 'all', label: 'All Audiences' },
        { value: 'members', label: 'Members' },
        { value: 'partners', label: 'Partners' }
      ]
    }
  ];

  const announcementFilterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Statuses' },
        { value: 'active', label: 'Active' },
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'expired', label: 'Expired' },
        { value: 'draft', label: 'Draft' }
      ]
    },
    {
      key: 'audience',
      label: 'Audience',
      options: [
        { value: 'all', label: 'All Audiences' },
        { value: 'members', label: 'Members' },
        { value: 'partners', label: 'Partners' }
      ]
    },
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'all', label: 'All Types' },
        { value: 'banner', label: 'Banner' },
        { value: 'modal', label: 'Modal' },
        { value: 'notification', label: 'Notification' }
      ]
    }
  ];

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <>
      {/* Overview Section */}
      <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-navy-900 flex items-center">
              <Bell className="h-5 w-5 mr-2 text-gold-500" />
              Notifications & Platform Messaging
            </h2>
            <p className="text-navy-600 text-sm">
              Manage communications with members, partners, and all platform users
            </p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setActiveTab('messages')}
              className={activeTab === 'messages' ? 'bg-navy-50' : ''}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              Messages
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('announcements')}
              className={activeTab === 'announcements' ? 'bg-navy-50' : ''}
            >
              <Megaphone className="h-4 w-4 mr-2" />
              Announcements
            </Button>
            <Button
              variant="outline"
              onClick={() => setActiveTab('analytics')}
              className={activeTab === 'analytics' ? 'bg-navy-50' : ''}
            >
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Total Messages</div>
              <div className="text-xl font-bold text-navy-900">{messages.length}</div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Active Announcements</div>
              <div className="text-xl font-bold text-navy-900">
                {announcements.filter(a => a.status === 'active').length}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Scheduled Messages</div>
              <div className="text-xl font-bold text-navy-900">
                {messages.filter(m => m.status === 'scheduled').length}
              </div>
            </div>
          </div>
          
          <div className="bg-navy-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium text-navy-600">Message Open Rate</div>
              <div className="text-xl font-bold text-navy-900">
                {messages.filter(m => m.status === 'sent').length > 0 
                  ? Math.round(
                      (messages
                        .filter(m => m.status === 'sent')
                        .reduce((sum, m) => sum + m.delivery_stats.opened, 0) /
                      messages
                        .filter(m => m.status === 'sent')
                        .reduce((sum, m) => sum + m.delivery_stats.delivered, 0)) * 100
                    ) 
                  : 0}%
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
            onClick={handleCreateMessage}
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Create New Message
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={handleCreateAnnouncement}
          >
            <Megaphone className="h-5 w-5 mr-2" />
            Create Announcement
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => setActiveTab('analytics')}
          >
            <BarChart className="h-5 w-5 mr-2" />
            View Analytics
          </Button>
          
          <Button 
            variant="outline" 
            className="flex items-center justify-center"
            onClick={() => toast.success('Exporting message data...')}
          >
            <Download className="h-5 w-5 mr-2" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Content based on active tab */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-luxury p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-navy-900">Message Management</h2>
            <Button
              variant="luxury"
              onClick={handleCreateMessage}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Message
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search messages..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <select
                  value={messageFilter}
                  onChange={(e) => setMessageFilter(e.target.value as any)}
                  className="rounded-lg border-gray-200 text-sm"
                >
                  <option value="all">All Statuses</option>
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="sent">Sent</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value as any)}
                  className="rounded-lg border-gray-200 text-sm"
                >
                  <option value="all">All Audiences</option>
                  <option value="members">Members</option>
                  <option value="partners">Partners</option>
                </select>
              </div>
            </div>
          </div>

          {/* Messages Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
            </div>
          ) : filteredMessages.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-navy-50">
                  <tr>
                    {messageColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider"
                      >
                        {column.header}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-navy-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredMessages.map((message) => (
                    <tr key={message.id} className="hover:bg-navy-50">
                      {messageColumns.map((column) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                          {column.render ? column.render(message[column.key as keyof Message], message) : message[column.key as keyof Message]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewMessage(message)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleEditMessage(message)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {message.status === 'draft' && (
                            <button
                              onClick={() => handleSendNow(message)}
                              className="text-green-600 hover:text-green-900"
                              title="Send Now"
                            >
                              <Send className="h-4 w-4" />
                            </button>
                          )}
                          
                          {message.status === 'scheduled' && (
                            <button
                              onClick={() => handleCancelScheduled(message)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Cancel Scheduled"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteMessage(message)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy-900 mb-2">No Messages Found</h3>
              <p className="text-navy-600 mb-6">
                No messages match your current filters. Try adjusting your search criteria or create a new message.
              </p>
              <Button
                variant="luxury"
                onClick={handleCreateMessage}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Message
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'announcements' && (
        <div className="bg-white rounded-xl shadow-luxury p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-navy-900">Announcement Management</h2>
            <Button
              variant="luxury"
              onClick={handleCreateAnnouncement}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Announcement
            </Button>
          </div>

          {/* Search and Filter */}
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search announcements..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                  />
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <select
                  value={audienceFilter}
                  onChange={(e) => setAudienceFilter(e.target.value as any)}
                  className="rounded-lg border-gray-200 text-sm"
                >
                  <option value="all">All Audiences</option>
                  <option value="members">Members</option>
                  <option value="partners">Partners</option>
                </select>
              </div>
            </div>
          </div>

          {/* Announcements Table */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
            </div>
          ) : filteredAnnouncements.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-navy-50">
                  <tr>
                    {announcementColumns.map((column) => (
                      <th
                        key={column.key}
                        className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider"
                      >
                        {column.header}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-right text-xs font-medium text-navy-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnnouncements.map((announcement) => (
                    <tr key={announcement.id} className="hover:bg-navy-50">
                      {announcementColumns.map((column) => (
                        <td key={column.key} className="px-6 py-4 whitespace-nowrap">
                          {column.render ? column.render(announcement[column.key as keyof Announcement], announcement) : announcement[column.key as keyof Announcement]}
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleViewAnnouncement(announcement)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => handleEditAnnouncement(announcement)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          
                          {announcement.status !== 'active' && announcement.status !== 'expired' && (
                            <button
                              onClick={() => handleActivateAnnouncement(announcement)}
                              className="text-green-600 hover:text-green-900"
                              title="Activate"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          {announcement.status === 'active' && (
                            <button
                              onClick={() => handleDeactivateAnnouncement(announcement)}
                              className="text-orange-600 hover:text-orange-900"
                              title="Deactivate"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteAnnouncement(announcement)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete"
                          >
                            <Trash className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-navy-900 mb-2">No Announcements Found</h3>
              <p className="text-navy-600 mb-6">
                No announcements match your current filters. Try adjusting your search criteria or create a new announcement.
              </p>
              <Button
                variant="luxury"
                onClick={handleCreateAnnouncement}
              >
                <Plus className="h-4 w-4 mr-2" />
                Create New Announcement
              </Button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-8">
          {/* Message Delivery Stats */}
          <ChartCard title="Message Delivery Performance" icon={BarChart}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={deliveryStats}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="delivered" name="Delivered" fill="#8884d8" />
                  <Bar dataKey="opened" name="Opened" fill="#82ca9d" />
                  <Bar dataKey="clicked" name="Clicked" fill="#ffc658" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Message Stats by Audience */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Messages by Audience" icon={Users}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Members', value: messages.filter(m => m.target_audience === 'members').length },
                        { name: 'Partners', value: messages.filter(m => m.target_audience === 'partners').length },
                        { name: 'All Users', value: messages.filter(m => m.target_audience === 'all').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Members', value: messages.filter(m => m.target_audience === 'members').length },
                        { name: 'Partners', value: messages.filter(m => m.target_audience === 'partners').length },
                        { name: 'All Users', value: messages.filter(m => m.target_audience === 'all').length }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Messages by Status" icon={Clock}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Draft', value: messages.filter(m => m.status === 'draft').length },
                        { name: 'Scheduled', value: messages.filter(m => m.status === 'scheduled').length },
                        { name: 'Sent', value: messages.filter(m => m.status === 'sent').length },
                        { name: 'Cancelled', value: messages.filter(m => m.status === 'cancelled').length }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {[
                        { name: 'Draft', value: messages.filter(m => m.status === 'draft').length },
                        { name: 'Scheduled', value: messages.filter(m => m.status === 'scheduled').length },
                        { name: 'Sent', value: messages.filter(m => m.status === 'sent').length },
                        { name: 'Cancelled', value: messages.filter(m => m.status === 'cancelled').length }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Announcement Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ChartCard title="Announcement Views" icon={Eye}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart
                    data={announcements.slice(0, 5).map(a => ({
                      name: a.title.length > 20 ? a.title.substring(0, 20) + '...' : a.title,
                      views: a.views,
                      dismissals: a.dismissals
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="views" name="Views" fill="#8884d8" />
                    <Bar dataKey="dismissals" name="Dismissals" fill="#82ca9d" />
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Announcement Engagement Rate" icon={BarChart}>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={announcements.slice(0, 7).map(a => ({
                      name: a.title.length > 15 ? a.title.substring(0, 15) + '...' : a.title,
                      rate: Math.round((1 - a.dismissals / (a.views || 1)) * 100)
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Engagement Rate']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="rate" 
                      name="Engagement Rate" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Delivery Channel Stats */}
          <ChartCard title="Message Delivery Channels" icon={Smartphone}>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={[
                    { 
                      name: 'Email Only', 
                      count: messages.filter(m => m.email_delivery && !m.sms_delivery).length 
                    },
                    { 
                      name: 'SMS Only', 
                      count: messages.filter(m => !m.email_delivery && m.sms_delivery).length 
                    },
                    { 
                      name: 'Email & SMS', 
                      count: messages.filter(m => m.email_delivery && m.sms_delivery).length 
                    }
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" name="Number of Messages" fill="#8884d8" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        </div>
      )}

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6">
            <h3 className="text-xl font-bold mb-4">
              {modalMode === 'create-message' ? 'Create New Message' :
               modalMode === 'edit-message' ? 'Edit Message' :
               modalMode === 'view-message' ? 'Message Details' :
               modalMode === 'delete-message' ? 'Delete Message' :
               modalMode === 'create-announcement' ? 'Create New Announcement' :
               modalMode === 'edit-announcement' ? 'Edit Announcement' :
               modalMode === 'view-announcement' ? 'Announcement Details' :
               'Delete Announcement'}
            </h3>
            
            {/* Create/Edit Message Form */}
            {(modalMode === 'create-message' || modalMode === 'edit-message') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message Title</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                    value={messageForm.title}
                    onChange={(e) => setMessageForm({...messageForm, title: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Message Content</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                    rows={5}
                    value={messageForm.content}
                    onChange={(e) => setMessageForm({...messageForm, content: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={messageForm.target_audience}
                      onChange={(e) => setMessageForm({...messageForm, target_audience: e.target.value as any})}
                    >
                      <option value="all">All Users</option>
                      <option value="members">Members Only</option>
                      <option value="partners">Partners Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={messageForm.status}
                      onChange={(e) => setMessageForm({...messageForm, status: e.target.value as any})}
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                    </select>
                  </div>
                </div>
                
                {messageForm.status === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Schedule For</label>
                    <input
                      type="datetime-local"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={messageForm.scheduled_for}
                      onChange={(e) => setMessageForm({...messageForm, scheduled_for: e.target.value})}
                      required
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Delivery Channels</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center">
                      <input
                        id="email-delivery"
                        type="checkbox"
                        className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                        checked={messageForm.email_delivery}
                        onChange={(e) => setMessageForm({...messageForm, email_delivery: e.target.checked})}
                      />
                      <label htmlFor="email-delivery" className="ml-2 block text-sm text-gray-900">
                        Email Delivery
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="sms-delivery"
                        type="checkbox"
                        className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                        checked={messageForm.sms_delivery}
                        onChange={(e) => setMessageForm({...messageForm, sms_delivery: e.target.checked})}
                      />
                      <label htmlFor="sms-delivery" className="ml-2 block text-sm text-gray-900">
                        SMS Delivery
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveMessage}
                    isLoading={loading}
                  >
                    {modalMode === 'create-message' ? 'Create Message' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* View Message Details */}
            {modalMode === 'view-message' && selectedMessage && (
              <div className="space-y-6">
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4">Message Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedMessage.title}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Content</label>
                      <div className="mt-1 p-2 bg-white rounded-md whitespace-pre-wrap">{selectedMessage.content}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getAudienceColor(selectedMessage.target_audience)}`}>
                            {selectedMessage.target_audience.charAt(0).toUpperCase() + selectedMessage.target_audience.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedMessage.status)}`}>
                            {selectedMessage.status.charAt(0).toUpperCase() + selectedMessage.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Created At</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          {formatDate(selectedMessage.created_at)}
                        </div>
                      </div>
                      {selectedMessage.scheduled_for && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Scheduled For</label>
                          <div className="mt-1 p-2 bg-white rounded-md">
                            {formatDate(selectedMessage.scheduled_for)}
                          </div>
                        </div>
                      )}
                      {selectedMessage.sent_at && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Sent At</label>
                          <div className="mt-1 p-2 bg-white rounded-md">
                            {formatDate(selectedMessage.sent_at)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Delivery Channels</label>
                      <div className="mt-1 p-2 bg-white rounded-md">
                        <div className="flex space-x-2">
                          {selectedMessage.email_delivery && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                              Email
                            </span>
                          )}
                          {selectedMessage.sms_delivery && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              SMS
                            </span>
                          )}
                          {!selectedMessage.email_delivery && !selectedMessage.sms_delivery && (
                            <span className="text-gray-500">No delivery channels selected</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {selectedMessage.status === 'sent' && (
                  <div className="bg-navy-50 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-navy-900 mb-4">Delivery Statistics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="bg-white p-3 rounded-lg text-center">
                        <div className="text-sm text-navy-600">Delivered</div>
                        <div className="text-xl font-semibold text-navy-900">{selectedMessage.delivery_stats.delivered}</div>
                      </div>
                      <div className="bg-white p-3 rounded-lg text-center">
                        <div className="text-sm text-navy-600">Opened</div>
                        <div className="text-xl font-semibold text-navy-900">{selectedMessage.delivery_stats.opened}</div>
                        <div className="text-xs text-navy-500">
                          ({Math.round((selectedMessage.delivery_stats.opened / selectedMessage.delivery_stats.delivered) * 100)}%)
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg text-center">
                        <div className="text-sm text-navy-600">Clicked</div>
                        <div className="text-xl font-semibold text-navy-900">{selectedMessage.delivery_stats.clicked}</div>
                        <div className="text-xs text-navy-500">
                          ({Math.round((selectedMessage.delivery_stats.clicked / selectedMessage.delivery_stats.delivered) * 100)}%)
                        </div>
                      </div>
                      <div className="bg-white p-3 rounded-lg text-center">
                        <div className="text-sm text-navy-600">Failed</div>
                        <div className="text-xl font-semibold text-navy-900">{selectedMessage.delivery_stats.failed}</div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="flex justify-between">
                  <div className="space-x-3">
                    {selectedMessage.status === 'draft' && (
                      <Button
                        variant="outline"
                        onClick={() => handleSendNow(selectedMessage)}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Send Now
                      </Button>
                    )}
                    {selectedMessage.status === 'scheduled' && (
                      <Button
                        variant="outline"
                        onClick={() => handleCancelScheduled(selectedMessage)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Cancel Scheduled
                      </Button>
                    )}
                    {(selectedMessage.status === 'draft' || selectedMessage.status === 'scheduled') && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setMessageForm({
                            title: selectedMessage.title,
                            content: selectedMessage.content,
                            target_audience: selectedMessage.target_audience,
                            status: selectedMessage.status,
                            scheduled_for: selectedMessage.scheduled_for || '',
                            email_delivery: selectedMessage.email_delivery,
                            sms_delivery: selectedMessage.sms_delivery
                          });
                          setModalMode('edit-message');
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Message
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
            
            {/* Delete Message Confirmation */}
            {modalMode === 'delete-message' && selectedMessage && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the message <span className="font-semibold">"{selectedMessage.title}"</span>?
                  This action cannot be undone.
                </p>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Deleting this message will remove it permanently from the system.
                        {selectedMessage.status === 'sent' && ' This will not recall messages that have already been sent.'}
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
                    Delete Message
                  </Button>
                </div>
              </div>
            )}
            
            {/* Create/Edit Announcement Form */}
            {(modalMode === 'create-announcement' || modalMode === 'edit-announcement') && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Announcement Title</label>
                  <input
                    type="text"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                    value={announcementForm.title}
                    onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Announcement Content</label>
                  <textarea
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                    rows={5}
                    value={announcementForm.content}
                    onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Announcement Type</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={announcementForm.type}
                      onChange={(e) => setAnnouncementForm({...announcementForm, type: e.target.value as any})}
                    >
                      <option value="banner">Banner (Top of page)</option>
                      <option value="modal">Modal (Pop-up)</option>
                      <option value="notification">Notification (Toast)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={announcementForm.status}
                      onChange={(e) => setAnnouncementForm({...announcementForm, status: e.target.value as any})}
                    >
                      <option value="draft">Draft</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="active">Active</option>
                    </select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={announcementForm.start_date}
                      onChange={(e) => setAnnouncementForm({...announcementForm, start_date: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={announcementForm.end_date}
                      onChange={(e) => setAnnouncementForm({...announcementForm, end_date: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={announcementForm.target_audience}
                      onChange={(e) => setAnnouncementForm({...announcementForm, target_audience: e.target.value as any})}
                    >
                      <option value="all">All Users</option>
                      <option value="members">Members Only</option>
                      <option value="partners">Partners Only</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Priority</label>
                    <select
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-gold-500 focus:ring-gold-500 sm:text-sm"
                      value={announcementForm.priority}
                      onChange={(e) => setAnnouncementForm({...announcementForm, priority: e.target.value as any})}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center">
                    <input
                      id="dismissible"
                      type="checkbox"
                      className="h-4 w-4 text-gold-600 focus:ring-gold-500 border-gray-300 rounded"
                      checked={announcementForm.dismissible}
                      onChange={(e) => setAnnouncementForm({...announcementForm, dismissible: e.target.checked})}
                    />
                    <label htmlFor="dismissible" className="ml-2 block text-sm text-gray-900">
                      Allow users to dismiss this announcement
                    </label>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveAnnouncement}
                    isLoading={loading}
                  >
                    {modalMode === 'create-announcement' ? 'Create Announcement' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
            
            {/* View Announcement Details */}
            {modalMode === 'view-announcement' && selectedAnnouncement && (
              <div className="space-y-6">
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4">Announcement Information</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Title</label>
                      <div className="mt-1 p-2 bg-white rounded-md">{selectedAnnouncement.title}</div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Content</label>
                      <div className="mt-1 p-2 bg-white rounded-md whitespace-pre-wrap">{selectedAnnouncement.content}</div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Type</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(selectedAnnouncement.type)}`}>
                            {selectedAnnouncement.type.charAt(0).toUpperCase() + selectedAnnouncement.type.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Status</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedAnnouncement.status)}`}>
                            {selectedAnnouncement.status.charAt(0).toUpperCase() + selectedAnnouncement.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Priority</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(selectedAnnouncement.priority)}`}>
                            {selectedAnnouncement.priority.charAt(0).toUpperCase() + selectedAnnouncement.priority.slice(1)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Target Audience</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getAudienceColor(selectedAnnouncement.target_audience)}`}>
                            {selectedAnnouncement.target_audience.charAt(0).toUpperCase() + selectedAnnouncement.target_audience.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Dismissible</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          {selectedAnnouncement.dismissible ? 'Yes' : 'No'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Start Date</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          {formatDate(selectedAnnouncement.start_date)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">End Date</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          {formatDate(selectedAnnouncement.end_date)}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Created At</label>
                        <div className="mt-1 p-2 bg-white rounded-md">
                          {formatDate(selectedAnnouncement.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-navy-900 mb-4">Performance Statistics</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-sm text-navy-600">Total Views</div>
                      <div className="text-xl font-semibold text-navy-900">{selectedAnnouncement.views}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-sm text-navy-600">Dismissals</div>
                      <div className="text-xl font-semibold text-navy-900">{selectedAnnouncement.dismissals}</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg text-center">
                      <div className="text-sm text-navy-600">Engagement Rate</div>
                      <div className="text-xl font-semibold text-navy-900">
                        {selectedAnnouncement.views 
                          ? Math.round((1 - selectedAnnouncement.dismissals / selectedAnnouncement.views) * 100) 
                          : 0}%
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <div className="space-x-3">
                    {selectedAnnouncement.status !== 'active' && selectedAnnouncement.status !== 'expired' && (
                      <Button
                        variant="outline"
                        onClick={() => handleActivateAnnouncement(selectedAnnouncement)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                    )}
                    {selectedAnnouncement.status === 'active' && (
                      <Button
                        variant="outline"
                        onClick={() => handleDeactivateAnnouncement(selectedAnnouncement)}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Deactivate
                      </Button>
                    )}
                    {(selectedAnnouncement.status === 'draft' || selectedAnnouncement.status === 'scheduled') && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setAnnouncementForm({
                            title: selectedAnnouncement.title,
                            content: selectedAnnouncement.content,
                            type: selectedAnnouncement.type,
                            status: selectedAnnouncement.status,
                            start_date: new Date(selectedAnnouncement.start_date).toISOString().split('T')[0],
                            end_date: new Date(selectedAnnouncement.end_date).toISOString().split('T')[0],
                            target_audience: selectedAnnouncement.target_audience,
                            priority: selectedAnnouncement.priority,
                            dismissible: selectedAnnouncement.dismissible
                          });
                          setModalMode('edit-announcement');
                        }}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Announcement
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
            
            {/* Delete Announcement Confirmation */}
            {modalMode === 'delete-announcement' && selectedAnnouncement && (
              <div>
                <p className="text-gray-700 mb-4">
                  Are you sure you want to delete the announcement <span className="font-semibold">"{selectedAnnouncement.title}"</span>?
                  This action cannot be undone.
                </p>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertTriangle className="h-5 w-5 text-yellow-400" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-700">
                        Deleting this announcement will remove it permanently from the system.
                        {selectedAnnouncement.status === 'active' && ' This will immediately remove it from all user interfaces.'}
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
                    Delete Announcement
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