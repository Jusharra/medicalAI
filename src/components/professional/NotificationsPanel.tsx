import { useState, useEffect } from 'react';
import { Bell, Calendar, MessageSquare, DollarSign, Info, X, CheckCircle, AlertCircle, Filter, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import Button from '../ui/Button';

interface Notification {
  id: string;
  type: 'appointment' | 'message' | 'payment' | 'platform';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

interface NotificationsPanelProps {
  partnerId: string;
}

export default function NotificationsPanel({ partnerId }: NotificationsPanelProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'appointments' | 'messages' | 'payments' | 'platform'>('all');
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    loadNotifications();
  }, [partnerId]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from a notifications table
      // For demo purposes, we'll create mock data
      
      const now = new Date();
      const mockNotifications: Notification[] = [
        {
          id: '1',
          type: 'appointment',
          title: 'New Appointment',
          message: 'John Doe has scheduled a consultation for tomorrow at 2:00 PM. Please review and confirm the appointment.',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
          read: false,
          actionUrl: '/appointments',
          actionText: 'View Appointment'
        },
        {
          id: '2',
          type: 'appointment',
          title: 'Appointment Rescheduled',
          message: 'Sarah Johnson has rescheduled her appointment to Friday at 10:00 AM. The previous appointment was scheduled for Thursday at 3:00 PM.',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          read: true,
          actionUrl: '/appointments',
          actionText: 'View Details'
        },
        {
          id: '3',
          type: 'message',
          title: 'New Message',
          message: 'You have a new message from Michael Brown regarding his treatment plan. He has some questions about the medication you prescribed.',
          timestamp: new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
          read: false,
          actionUrl: '/messages',
          actionText: 'Read Message'
        },
        {
          id: '4',
          type: 'payment',
          title: 'Payout Processed',
          message: 'Your monthly payout of $1,250.75 has been processed and will be deposited within 1-2 business days. Thank you for your partnership.',
          timestamp: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          read: true,
          actionUrl: '/payouts',
          actionText: 'View Payout'
        },
        {
          id: '5',
          type: 'platform',
          title: 'System Update',
          message: 'The platform will be undergoing maintenance on Sunday from 2:00 AM to 4:00 AM EDT. During this time, the system may be temporarily unavailable.',
          timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          read: true
        },
        {
          id: '6',
          type: 'message',
          title: 'Admin Message',
          message: 'Please update your availability for next month by the end of this week. This will help us better manage patient scheduling and ensure optimal care delivery.',
          timestamp: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          read: false,
          actionUrl: '/availability',
          actionText: 'Update Availability'
        },
        {
          id: '7',
          type: 'appointment',
          title: 'Appointment Cancelled',
          message: 'David Wilson has cancelled his appointment scheduled for tomorrow. The slot is now available for other patients.',
          timestamp: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
          read: true
        },
        {
          id: '8',
          type: 'payment',
          title: 'New Earning',
          message: 'You earned $150 from a completed consultation with Emily Thompson. The payment has been added to your account balance.',
          timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          read: true,
          actionUrl: '/payouts',
          actionText: 'View Details'
        }
      ];
      
      setNotifications(mockNotifications);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    ));
  };

  const dismissNotification = (id: string) => {
    setNotifications(notifications.filter(notification => notification.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(notification => ({ ...notification, read: true })));
    toast.success('All notifications marked as read');
  };

  const viewNotificationDetails = (notification: Notification) => {
    setSelectedNotification(notification);
    setShowDetailModal(true);
    
    // Mark as read when viewed
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Calendar className="h-5 w-5 text-blue-500" />;
      case 'message':
        return <MessageSquare className="h-5 w-5 text-green-500" />;
      case 'payment':
        return <DollarSign className="h-5 w-5 text-purple-500" />;
      case 'platform':
        return <Info className="h-5 w-5 text-orange-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.read;
    return notification.type === filter;
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Notifications...
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
        <div className="flex items-center mb-4 sm:mb-0">
          <Bell className="h-5 w-5 mr-2 text-leaf-600" />
          <h2 className="text-xl font-semibold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <span className="ml-2 bg-leaf-600 text-white text-xs font-bold rounded-full h-5 min-w-[20px] flex items-center justify-center px-1">
              {unreadCount}
            </span>
          )}
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'all'
                ? 'bg-leaf-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'unread'
                ? 'bg-leaf-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
          <button
            onClick={() => setFilter('appointments')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'appointments'
                ? 'bg-leaf-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Appointments
          </button>
          <button
            onClick={() => setFilter('messages')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'messages'
                ? 'bg-leaf-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Messages
          </button>
        </div>
      </div>

      {unreadCount > 0 && (
        <div className="flex justify-end mb-4">
          <button
            onClick={markAllAsRead}
            className="text-sm text-leaf-600 hover:text-leaf-700"
          >
            Mark all as read
          </button>
        </div>
      )}

      <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`relative border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                notification.read ? 'bg-white' : 'bg-leaf-50 border-leaf-200'
              }`}
              onClick={() => viewNotificationDetails(notification)}
            >
              <div className="flex">
                <div className="flex-shrink-0 mr-4">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between">
                    <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
                  
                  {!notification.read && (
                    <div className="mt-2 flex justify-between items-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        New
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="text-xs text-leaf-600 hover:text-leaf-700"
                      >
                        Mark as read
                      </button>
                    </div>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissNotification(notification.id);
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? "You don't have any notifications."
                : filter === 'unread'
                ? "You don't have any unread notifications."
                : `You don't have any ${filter} notifications.`}
            </p>
          </div>
        )}
      </div>

      {/* Notification Detail Modal */}
      {showDetailModal && selectedNotification && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                {getNotificationIcon(selectedNotification.type)}
                <h3 className="text-xl font-semibold text-gray-900 ml-2">{selectedNotification.title}</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">
                {format(new Date(selectedNotification.timestamp), 'MMMM d, yyyy h:mm a')}
              </p>
              <p className="text-gray-700">{selectedNotification.message}</p>
            </div>
            
            <div className="flex justify-end space-x-3">
              {selectedNotification.actionUrl && selectedNotification.actionText && (
                <Button
                  variant="outline"
                  onClick={() => {
                    toast.success(`Navigating to ${selectedNotification.actionUrl}`);
                    setShowDetailModal(false);
                  }}
                >
                  {selectedNotification.actionText}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
              <Button
                onClick={() => setShowDetailModal(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}