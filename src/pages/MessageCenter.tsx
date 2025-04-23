import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { 
  MessageSquare, 
  Send, 
  User, 
  Clock, 
  Search, 
  Paperclip, 
  ChevronDown, 
  ChevronUp,
  Filter,
  LayoutDashboard,
  Gift,
  Calendar,
  Receipt,
  Settings,
  Tag,
  Activity,
  Users,
  Pill,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Button from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read: boolean;
  sender?: {
    full_name: string;
    avatar_url: string | null;
    role: string;
  };
}

interface Conversation {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export default function MessageCenter() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'admin' | 'partner'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    loadConversations();
    
    // Set sidebar state based on screen size
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    // Initial check
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [user, navigate]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from a messages/conversations table
      // For demo purposes, we'll create mock data
      
      // Create mock conversations with admin and care team
      const mockConversations: Conversation[] = [
        {
          id: 'admin-team',
          full_name: 'Admin Team',
          avatar_url: null,
          role: 'admin',
          last_message: 'Welcome to Vitalé Health Concierge! How can we assist you today?',
          last_message_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
          unread_count: 0
        }
      ];
      
      // Get care team members
      const { data: careTeamData, error: careTeamError } = await supabase
        .from('care_team_members')
        .select(`
          partner:partners (
            id,
            name,
            profile_image,
            practice_name
          )
        `)
        .eq('profile_id', user.id)
        .not('partner_id', 'is', null);
      
      if (careTeamError) throw careTeamError;
      
      // Add care team members to conversations
      careTeamData?.forEach((member, index) => {
        if (member.partner) {
          mockConversations.push({
            id: member.partner.id,
            full_name: member.partner.name,
            avatar_url: member.partner.profile_image,
            role: 'partner',
            last_message: (index === 0) 
              ? "I have reviewed your latest health assessment. Would you like to schedule a follow-up?"
              : "Hello! I am available to answer any questions you might have.",
            last_message_time: new Date(Date.now() - (index + 1) * 24 * 60 * 60 * 1000).toISOString(), // 1-3 days ago
            unread_count: index === 0 ? 1 : 0
          });
        }
      });
      
      setConversations(mockConversations);
      
      // Set first conversation as active if none is selected
      if (!activeConversation && mockConversations.length > 0) {
        setActiveConversation(mockConversations[0].id);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast.error('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from a messages table
      // For demo purposes, we'll create mock data
      
      const mockMessages: Message[] = [];
      const conversation = conversations.find(c => c.id === conversationId);
      
      if (conversation) {
        // Generate between 3-8 messages
        const messageCount = Math.floor(Math.random() * 6) + 3;
        
        for (let i = 0; i < messageCount; i++) {
          const isFromUser = i % 2 === 0;
          const timestamp = new Date(Date.now() - (messageCount - i) * 3 * 60 * 60 * 1000);
          
          let messageContent: string;
          if (conversation.role === 'admin') {
            if (isFromUser) {
              messageContent = i === 0 
                ? "Hello, I have a question about my membership benefits." 
                : "Thank you for the information. Could you also tell me about the wellness programs?";
            } else {
              messageContent = i === 1 
                ? "Of course! As a premium member, you have access to our exclusive wellness retreats, priority booking with specialists, and 24/7 concierge support. Is there a specific benefit you would like to know more about?" 
                : "Our wellness programs include personalized fitness plans, nutrition counseling, and stress management workshops. Would you like me to schedule a consultation with one of our wellness experts?";
            }
          } else {
            if (isFromUser) {
              messageContent = i === 0 
                ? "Hi Dr. " + conversation.full_name.split(' ')[1] + ", I have been experiencing some mild headaches recently." 
                : "They usually occur in the afternoon and last for about an hour. I have been working longer hours lately.";
            } else {
              messageContent = i === 1 
                ? "I am sorry to hear that. Headaches can often be related to stress and screen time. Are you taking regular breaks during work hours?" 
                : "I recommend trying the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds. Also, ensure you are staying hydrated. Would you like to schedule a quick virtual check-in?";
            }
          }
          
          mockMessages.push({
            id: `msg-${conversationId}-${i}`,
            sender_id: isFromUser ? user.id : conversationId,
            recipient_id: isFromUser ? conversationId : user.id,
            content: messageContent,
            created_at: timestamp.toISOString(),
            read: true,
            sender: {
              full_name: isFromUser ? 'You' : conversation.full_name,
              avatar_url: isFromUser ? null : conversation.avatar_url,
              role: isFromUser ? 'member' : conversation.role
            }
          });
        }
        
        // Add unread message if conversation has unread count
        if (conversation.unread_count > 0) {
          mockMessages.push({
            id: `msg-${conversationId}-${messageCount}`,
            sender_id: conversationId,
            recipient_id: user.id,
            content: conversation.role === 'admin' 
              ? "Just checking in to see if you have any other questions about our services or if there is anything else I can help you with today." 
              : "I have some availability next week if you would like to schedule that check-in. Let me know what works for you.",
            created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
            read: false,
            sender: {
              full_name: conversation.full_name,
              avatar_url: conversation.avatar_url,
              role: conversation.role
            }
          });
        }
      }
      
      setMessages(mockMessages);
      
      // Mark conversation as read
      if (conversation && conversation.unread_count > 0) {
        setConversations(conversations.map(c => 
          c.id === conversationId ? { ...c, unread_count: 0 } : c
        ));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    // In a real app, this would send to the backend
    const newMsg: Message = {
      id: `msg-new-${Date.now()}`,
      sender_id: user.id,
      recipient_id: activeConversation,
      content: newMessage,
      created_at: new Date().toISOString(),
      read: true,
      sender: {
        full_name: 'You',
        avatar_url: null,
        role: 'member'
      }
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
    
    // Simulate response after a delay
    setTimeout(() => {
      const conversation = conversations.find(c => c.id === activeConversation);
      
      if (conversation) {
        const responseMsg: Message = {
          id: `msg-response-${Date.now()}`,
          sender_id: activeConversation,
          recipient_id: user.id,
          content: conversation.role === 'admin' 
            ? "Thank you for your message. Our team will get back to you shortly with more information." 
            : "Thanks for your message. I will review this and follow up with you soon.",
          created_at: new Date().toISOString(),
          read: true,
          sender: {
            full_name: conversation.full_name,
            avatar_url: conversation.avatar_url,
            role: conversation.role
          }
        };
        
        setMessages(prev => [...prev, responseMsg]);
      }
    }, 1000);
  };

  const filteredConversations = conversations.filter(conversation => {
    // Filter by search term
    const matchesSearch = conversation.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Filter by type
    const matchesFilter = 
      filter === 'all' ? true :
      filter === 'unread' ? conversation.unread_count > 0 :
      filter === 'admin' ? conversation.role === 'admin' :
      filter === 'partner' ? conversation.role === 'partner' :
      true;
    
    return matchesSearch && matchesFilter;
  });

  // Check if the current path matches the link path
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  // Define the toggleSidebar function
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Overlay for mobile when sidebar is open */}
      {isSidebarOpen && window.innerWidth < 1024 && (
        <div className="sidebar-overlay" onClick={toggleSidebar}></div>
      )}
      
      {/* Sidebar */}
      <aside 
        className={`bg-[#0A1628] fixed inset-y-0 left-0 z-50 transform ${
          isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-20'
        } transition-all duration-300 ease-in-out`}
      >
        <div className="flex flex-col h-full">
          {/* Sidebar Header with Toggle Button */}
          <div className="p-4 border-b border-[#1E3A5F] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-[#1E3A5F] p-2 rounded-lg">
                <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" className="w-8 h-8 object-contain" />
              </div>
              {isSidebarOpen && <span className="text-lg font-semibold text-white">Member Portal</span>}
            </div>
            <button 
              onClick={toggleSidebar}
              className="text-gray-400 hover:text-white"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
            </button>
          </div>

          {/* Sidebar Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-2">
              <li>
                <Link
                  to="/dashboard"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/dashboard') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <LayoutDashboard className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Dashboard</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/rewards"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/rewards') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Gift className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Member Rewards</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/appointments"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/appointments') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Calendar className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Appointments</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/purchases"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/purchases') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Receipt className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Past Purchases</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/bookings"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/bookings') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Clock className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Upcoming Bookings</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/preferences"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/preferences') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Settings className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Service Preferences</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/promotions"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/promotions') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Tag className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Promotions</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/health-alerts"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/health-alerts') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Activity className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Health Alerts</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/team"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/team') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Users className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Concierge Team</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/messages"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/messages') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <MessageSquare className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Message Center</span>}
                </Link>
              </li>
              <li>
                <Link
                  to="/pharmacy"
                  className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg ${
                    isActive('/pharmacy') ? 'bg-[#1E3A5F] text-[#00F0FF]' : 'text-white hover:bg-[#1E3A5F] hover:text-white'
                  }`}
                >
                  <Pill className="h-5 w-5 min-w-5" />
                  {isSidebarOpen && <span className="ml-3">Pharmacy</span>}
                </Link>
              </li>
            </ul>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-[#1E3A5F]">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-red-400 hover:bg-[#1E3A5F] hover:text-red-300 rounded-lg"
            >
              <LogOut className="h-5 w-5 min-w-5" />
              {isSidebarOpen && <span className="ml-3">Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
        {/* Mobile Header */}
        <header className="bg-white border-b border-gray-200 p-4 flex lg:hidden items-center justify-between sticky top-0 z-40">
          <div className="flex items-center space-x-2">
            <div className="bg-[#0A1628] p-2 rounded-lg">
              <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" className="h-5 w-5 object-contain" />
            </div>
            <span className="text-lg font-semibold text-heading">Member Portal</span>
          </div>
          <button 
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Toggle sidebar"
          >
            {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </header>

        {/* Content Area */}
        <main className="p-4 sm:p-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            {/* Header */}
            <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <MessageSquare className="h-8 w-8 text-gold-500" />
                <h1 className="text-2xl font-display font-bold text-navy-900">Message Center</h1>
              </div>
              <p className="text-navy-600 mb-6">
                Communicate with your healthcare team and administrative staff
              </p>
            </div>

            {/* Message Interface */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="flex h-[600px]">
                {/* Conversation List */}
                <div className="w-full md:w-1/3 border-r border-gray-200 overflow-y-auto">
                  <div className="p-4">
                    <div className="relative mb-4">
                      <input
                        type="text"
                        placeholder="Search conversations..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                      />
                      <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                    </div>
                    
                    <div className="flex space-x-2 overflow-x-auto pb-2">
                      <button
                        onClick={() => setFilter('all')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                          filter === 'all'
                            ? 'bg-gold-gradient text-navy-900'
                            : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                        }`}
                      >
                        All
                      </button>
                      <button
                        onClick={() => setFilter('unread')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                          filter === 'unread'
                            ? 'bg-gold-gradient text-navy-900'
                            : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                        }`}
                      >
                        Unread
                      </button>
                      <button
                        onClick={() => setFilter('admin')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                          filter === 'admin'
                            ? 'bg-gold-gradient text-navy-900'
                            : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                        }`}
                      >
                        Admin
                      </button>
                      <button
                        onClick={() => setFilter('partner')}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                          filter === 'partner'
                            ? 'bg-gold-gradient text-navy-900'
                            : 'bg-navy-50 text-navy-600 hover:bg-navy-100'
                        }`}
                      >
                        Healthcare Providers
                      </button>
                    </div>
                    
                    <div className="space-y-2">
                      {filteredConversations.length > 0 ? (
                        filteredConversations.map((conversation) => (
                          <button
                            key={conversation.id}
                            onClick={() => setActiveConversation(conversation.id)}
                            className={`w-full flex items-center p-3 rounded-lg text-left ${
                              activeConversation === conversation.id
                                ? 'bg-navy-50 border border-navy-200'
                                : 'hover:bg-gray-50'
                            }`}
                          >
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {conversation.avatar_url ? (
                                <img
                                  src={conversation.avatar_url}
                                  alt={conversation.full_name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <User className="h-5 w-5 text-gray-400" />
                              )}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                              <div className="flex justify-between items-center">
                                <p className="font-medium text-navy-900 truncate">{conversation.full_name}</p>
                                <span className="text-xs text-gray-500">
                                  {format(new Date(conversation.last_message_time), 'MMM d')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 truncate">{conversation.last_message}</p>
                            </div>
                            {conversation.unread_count > 0 && (
                              <span className="ml-2 bg-gold-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                                {conversation.unread_count}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          No conversations found
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message Thread */}
                <div className="hidden md:flex flex-col w-2/3">
                  {activeConversation ? (
                    <>
                      {/* Conversation Header */}
                      <div className="p-4 border-b border-gray-200">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                            {conversations.find(c => c.id === activeConversation)?.avatar_url ? (
                              <img
                                src={conversations.find(c => c.id === activeConversation)?.avatar_url || ''}
                                alt={conversations.find(c => c.id === activeConversation)?.full_name || ''}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <User className="h-5 w-5 text-gray-400" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="font-medium text-navy-900">
                              {conversations.find(c => c.id === activeConversation)?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {conversations.find(c => c.id === activeConversation)?.role === 'admin' 
                                ? 'Administrative Team' 
                                : 'Healthcare Provider'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
                        <div className="space-y-4">
                          {messages.map((message) => (
                            <div
                              key={message.id}
                              className={`flex ${
                                message.sender_id === user.id ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              {message.sender_id !== user.id && (
                                <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mr-2">
                                  {message.sender?.avatar_url ? (
                                    <img
                                      src={message.sender.avatar_url}
                                      alt={message.sender.full_name}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <User className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
                              )}
                              <div
                                className={`max-w-[70%] rounded-lg p-3 ${
                                  message.sender_id === user.id
                                    ? 'bg-gold-500 text-white'
                                    : 'bg-white text-navy-800 border border-gray-200'
                                }`}
                              >
                                <p>{message.content}</p>
                                <p className="text-xs mt-1 opacity-70">
                                  {format(new Date(message.created_at), 'h:mm a')}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Message Input */}
                      <div className="p-4 border-t border-gray-200">
                        <div className="flex space-x-2">
                          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
                            <Paperclip className="h-5 w-5" />
                          </button>
                          <input
                            type="text"
                            placeholder="Type your message..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-gold-500 focus:border-transparent"
                            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                          />
                          <Button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            variant="luxury"
                          >
                            <Send className="h-5 w-5" />
                          </Button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center">
                      <div className="text-center">
                        <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-xl font-semibold text-navy-900 mb-2">No Conversation Selected</h3>
                        <p className="text-gray-500 max-w-md">
                          Select a conversation from the list to view your messages or start a new conversation with your healthcare team.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}