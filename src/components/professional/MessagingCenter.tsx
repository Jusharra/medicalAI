import { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, User, Search, Bell, Edit, Paperclip, ChevronDown, ChevronUp } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
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
  };
}

interface Conversation {
  id: string;
  full_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface MessagingCenterProps {
  partnerId: string;
}

export default function MessagingCenter({ partnerId }: MessagingCenterProps) {
  const [activeTab, setActiveTab] = useState<'messages' | 'announcements' | 'compose'>('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [composeRecipients, setComposeRecipients] = useState<string[]>([]);
  const [composeSubject, setComposeSubject] = useState('');
  const [composeMessage, setComposeMessage] = useState('');
  const [availableRecipients, setAvailableRecipients] = useState<{id: string, name: string}[]>([]);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    loadConversations();
    loadAvailableRecipients();
  }, [partnerId]);

  useEffect(() => {
    if (activeConversation) {
      loadMessages(activeConversation);
    }
  }, [activeConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from a messages table
      // For demo purposes, we'll create mock data
      
      // Get assigned members
      const { data: careTeamData, error: careTeamError } = await supabase
        .from('care_team_members')
        .select(`
          profile:profile_id(
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('partner_id', partnerId);
      
      if (careTeamError) throw careTeamError;
      
      // Create mock conversations
      const mockConversations: Conversation[] = careTeamData?.map((item, index) => ({
        id: item.profile?.id || '',
        full_name: item.profile?.full_name || 'Unknown',
        avatar_url: item.profile?.avatar_url,
        last_message: index % 3 === 0 
          ? 'Thank you for the appointment yesterday.'
          : index % 3 === 1
          ? 'When is my next checkup scheduled?'
          : 'I have a question about my prescription.',
        last_message_time: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
        unread_count: Math.floor(Math.random() * 3)
      })).filter(c => c.id) || [];
      
      // Add admin conversation
      mockConversations.unshift({
        id: 'admin',
        full_name: 'Admin Team',
        avatar_url: null,
        last_message: 'Please update your availability for next month.',
        last_message_time: new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString(),
        unread_count: 1
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
      const isAdmin = conversationId === 'admin';
      
      // Generate between 3-8 messages
      const messageCount = Math.floor(Math.random() * 6) + 3;
      
      for (let i = 0; i < messageCount; i++) {
        const isPartner = i % 2 === 0;
        const timestamp = new Date(Date.now() - (messageCount - i) * 3 * 60 * 60 * 1000);
        
        let messageContent: string;
        if (isAdmin) {
          if (isPartner) {
            messageContent = "I'll update my availability calendar by tomorrow.";
          } else {
            messageContent = "Please update your availability for next month. We have several new members joining.";
          }
        } else {
          if (isPartner) {
            messageContent = "How are you feeling today? Any improvement with the new medication?";
          } else {
            messageContent = "I'm feeling much better, thank you. The new medication seems to be working well.";
          }
        }
        
        mockMessages.push({
          id: `msg-${conversationId}-${i}`,
          sender_id: isPartner ? partnerId : conversationId,
          recipient_id: isPartner ? conversationId : partnerId,
          content: messageContent,
          created_at: timestamp.toISOString(),
          read: true,
          sender: {
            full_name: isPartner 
              ? 'You' 
              : (isAdmin ? 'Admin Team' : conversations.find(c => c.id === conversationId)?.full_name || 'Unknown'),
            avatar_url: isPartner ? null : conversations.find(c => c.id === conversationId)?.avatar_url || null
          }
        });
      }
      
      // Add one more message if this conversation has unread messages
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation && conversation.unread_count > 0) {
        mockMessages.push({
          id: `msg-${conversationId}-${messageCount}`,
          sender_id: conversationId,
          recipient_id: partnerId,
          content: isAdmin
            ? "Also, we have a new policy update coming next week. Please review it when available."
            : "I have another question about my treatment plan. When would be a good time to discuss?",
          created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          read: false,
          sender: {
            full_name: isAdmin ? 'Admin Team' : conversation.full_name,
            avatar_url: conversation.avatar_url
          }
        });
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

  const loadAvailableRecipients = async () => {
    try {
      // Get assigned members
      const { data: careTeamData, error: careTeamError } = await supabase
        .from('care_team_members')
        .select(`
          profile:profile_id(
            id,
            full_name
          )
        `)
        .eq('partner_id', partnerId);
      
      if (careTeamError) throw careTeamError;
      
      const recipients = careTeamData?.map(item => ({
        id: item.profile?.id || '',
        name: item.profile?.full_name || 'Unknown'
      })).filter(r => r.id) || [];
      
      // Add admin
      recipients.unshift({
        id: 'admin',
        name: 'Admin Team'
      });
      
      setAvailableRecipients(recipients);
    } catch (error) {
      console.error('Error loading recipients:', error);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConversation) return;
    
    // In a real app, this would send to the backend
    const newMsg: Message = {
      id: `msg-new-${Date.now()}`,
      sender_id: partnerId,
      recipient_id: activeConversation,
      content: newMessage,
      created_at: new Date().toISOString(),
      read: true,
      sender: {
        full_name: 'You',
        avatar_url: null
      }
    };
    
    setMessages([...messages, newMsg]);
    setNewMessage('');
    
    toast.success('Message sent');
  };

  const handleSendComposedMessage = () => {
    if (!composeMessage.trim() || composeRecipients.length === 0) {
      toast.error('Please select recipients and enter a message');
      return;
    }
    
    // In a real app, this would send to the backend
    toast.success(`Message sent to ${composeRecipients.length} recipient(s)`);
    
    // Reset compose form
    setComposeRecipients([]);
    setComposeSubject('');
    setComposeMessage('');
    setActiveTab('messages');
  };

  const toggleRecipient = (recipientId: string) => {
    if (composeRecipients.includes(recipientId)) {
      setComposeRecipients(composeRecipients.filter(id => id !== recipientId));
    } else {
      setComposeRecipients([...composeRecipients, recipientId]);
    }
  };

  const selectAllRecipients = () => {
    setComposeRecipients(availableRecipients.map(r => r.id));
  };

  const filteredConversations = conversations.filter(conversation =>
    conversation.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRecipients = availableRecipients.filter(recipient =>
    recipient.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('messages')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'messages'
                  ? 'bg-leaf-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="h-5 w-5 inline mr-2" />
              Messages
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'announcements'
                  ? 'bg-leaf-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Bell className="h-5 w-5 inline mr-2" />
              Announcements
            </button>
            <button
              onClick={() => setActiveTab('compose')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'compose'
                  ? 'bg-leaf-600 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Edit className="h-5 w-5 inline mr-2" />
              Compose
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-1 overflow-hidden">
          {activeTab === 'messages' && (
            <>
              {/* Conversation List */}
              <div className="w-full md:w-1/3 border-r border-gray-200 overflow-y-auto">
                <div className="p-4">
                  <div className="relative mb-4">
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                    />
                    <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  </div>
                  
                  <div className="space-y-2">
                    {filteredConversations.map((conversation) => (
                      <button
                        key={conversation.id}
                        onClick={() => setActiveConversation(conversation.id)}
                        className={`w-full flex items-center p-3 rounded-lg text-left ${
                          activeConversation === conversation.id
                            ? 'bg-leaf-50 border border-leaf-200'
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
                            <p className="font-medium text-gray-900 truncate">{conversation.full_name}</p>
                            <span className="text-xs text-gray-500">
                              {format(new Date(conversation.last_message_time), 'MMM d')}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 truncate">{conversation.last_message}</p>
                        </div>
                        {conversation.unread_count > 0 && (
                          <span className="ml-2 bg-leaf-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                            {conversation.unread_count}
                          </span>
                        )}
                      </button>
                    ))}
                    
                    {filteredConversations.length === 0 && (
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
                          <p className="font-medium text-gray-900">
                            {conversations.find(c => c.id === activeConversation)?.full_name || 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 p-4 overflow-y-auto">
                      <div className="space-y-4">
                        {messages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${
                              message.sender_id === partnerId ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {message.sender_id !== partnerId && (
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
                                message.sender_id === partnerId
                                  ? 'bg-leaf-600 text-white'
                                  : 'bg-gray-100 text-gray-800'
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
                        <input
                          type="text"
                          placeholder="Type your message..."
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!newMessage.trim()}
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Conversation Selected</h3>
                      <p className="text-gray-600">
                        Select a conversation from the list to view messages
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'announcements' && (
            <div className="w-full p-4 overflow-y-auto">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">Platform Update: New Features</h3>
                    <span className="text-xs text-gray-500">2 days ago</span>
                  </div>
                  <p className="text-gray-600 mb-2">
                    We've added new features to the platform, including improved scheduling and patient management tools.
                  </p>
                  <Button variant="outline" size="sm">Read More</Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">Important: Privacy Policy Update</h3>
                    <span className="text-xs text-gray-500">1 week ago</span>
                  </div>
                  <p className="text-gray-600 mb-2">
                    Our privacy policy has been updated to comply with new regulations. Please review the changes.
                  </p>
                  <Button variant="outline" size="sm">View Policy</Button>
                </div>
                
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-900">Upcoming Maintenance</h3>
                    <span className="text-xs text-gray-500">2 weeks ago</span>
                  </div>
                  <p className="text-gray-600 mb-2">
                    The platform will be undergoing maintenance on Sunday, April 10th from 2:00 AM to 4:00 AM EDT.
                  </p>
                  <Button variant="outline" size="sm">View Details</Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compose' && (
            <div className="w-full p-4 overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    To:
                  </label>
                  <div className="relative">
                    <div 
                      className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-leaf-500 focus-within:border-transparent"
                      onClick={() => setShowRecipientDropdown(true)}
                    >
                      {composeRecipients.map(id => {
                        const recipient = availableRecipients.find(r => r.id === id);
                        return (
                          <div 
                            key={id} 
                            className="bg-leaf-100 text-leaf-800 px-2 py-1 rounded-full text-sm flex items-center"
                          >
                            {recipient?.name}
                            <button 
                              className="ml-1 text-leaf-600 hover:text-leaf-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRecipient(id);
                              }}
                            >
                              &times;
                            </button>
                          </div>
                        );
                      })}
                      <input
                        type="text"
                        placeholder={composeRecipients.length === 0 ? "Select recipients..." : ""}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="flex-1 min-w-[100px] border-none focus:ring-0 p-1"
                      />
                    </div>
                    
                    {showRecipientDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b border-gray-200">
                          <button
                            onClick={selectAllRecipients}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded-lg"
                          >
                            Select All
                          </button>
                        </div>
                        {filteredRecipients.length > 0 ? (
                          filteredRecipients.map(recipient => (
                            <div
                              key={recipient.id}
                              onClick={() => toggleRecipient(recipient.id)}
                              className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={composeRecipients.includes(recipient.id)}
                                onChange={() => {}}
                                className="mr-2"
                              />
                              <span>{recipient.name}</span>
                            </div>
                          ))
                        ) : (
                          <div className="p-3 text-center text-gray-500">
                            No recipients found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-gray-500">
                      {composeRecipients.length} recipient(s) selected
                    </span>
                    <button
                      onClick={() => setShowRecipientDropdown(!showRecipientDropdown)}
                      className="text-xs text-leaf-600"
                    >
                      {showRecipientDropdown ? (
                        <ChevronUp className="h-4 w-4 inline" />
                      ) : (
                        <ChevronDown className="h-4 w-4 inline" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Subject:
                  </label>
                  <input
                    type="text"
                    value={composeSubject}
                    onChange={(e) => setComposeSubject(e.target.value)}
                    placeholder="Enter subject..."
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message:
                  </label>
                  <textarea
                    value={composeMessage}
                    onChange={(e) => setComposeMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={8}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-transparent resize-none"
                  />
                </div>
                
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {}}
                  >
                    <Paperclip className="h-4 w-4 mr-2" />
                    Attach File
                  </Button>
                  
                  <div className="space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setComposeRecipients([]);
                        setComposeSubject('');
                        setComposeMessage('');
                      }}
                    >
                      Discard
                    </Button>
                    <Button
                      onClick={handleSendComposedMessage}
                      disabled={!composeMessage.trim() || composeRecipients.length === 0}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Message
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}