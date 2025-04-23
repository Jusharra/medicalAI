import { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Calendar, 
  User, 
  FileText, 
  ArrowRight, 
  ChevronDown, 
  ChevronUp, 
  ThumbsUp, 
  ThumbsDown, 
  Send, 
  Paperclip, 
  Image, 
  Play, 
  Download, 
  X, 
  Edit, 
  Trash2, 
  Eye, 
  Bell
} from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface SymptomSubmission {
  id: string;
  profile_id: string;
  symptoms: string;
  duration?: string;
  severity?: number;
  onset_date?: string;
  status: 'Submitted' | 'Under Review' | 'Reviewed' | 'Scheduled' | 'Escalated';
  urgency_flag: 'Low' | 'Medium' | 'High';
  ai_assessment?: string;
  ai_risk_level?: string;
  ai_confidence?: number;
  created_at: string;
  updated_at: string;
  notes?: string;
  patient?: {
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

interface SubmissionFile {
  id: string;
  submission_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_at: string;
}

interface ProviderNote {
  id: string;
  submission_id: string;
  provider_id: string;
  content: string;
  created_at: string;
}

interface ProviderReply {
  id: string;
  submission_id: string;
  provider_id: string;
  content: string;
  created_at: string;
}

interface TriageInboxProps {
  partnerId: string;
}

export default function TriageInbox({ partnerId }: TriageInboxProps) {
  const [submissions, setSubmissions] = useState<SymptomSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SymptomSubmission | null>(null);
  const [submissionFiles, setSubmissionFiles] = useState<SubmissionFile[]>([]);
  const [providerNotes, setProviderNotes] = useState<ProviderNote[]>([]);
  const [providerReplies, setProviderReplies] = useState<ProviderReply[]>([]);
  const [newNote, setNewNote] = useState('');
  const [newReply, setNewReply] = useState('');
  const [filter, setFilter] = useState<'all' | 'unreviewed' | 'high_priority' | 'with_visuals'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAIFeedback, setShowAIFeedback] = useState(false);
  const [aiHelpful, setAiHelpful] = useState<boolean | null>(null);
  const [aiFeedbackType, setAiFeedbackType] = useState<string>('');
  const [aiFeedbackComments, setAiFeedbackComments] = useState<string>('');
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingReply, setSavingReply] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (!partnerId) return;
    loadSubmissions();
  }, [partnerId, filter]);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      
      // Build query based on filter
      let query = supabase
        .from('symptom_submissions')
        .select('*')
        .eq('assigned_partner_id', partnerId)
        .order('created_at', { ascending: false });
      
      // Apply filters
      if (filter === 'unreviewed') {
        query = query.in('status', ['Submitted', 'Under Review']);
      } else if (filter === 'high_priority') {
        query = query.eq('urgency_flag', 'High');
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      if (data) {
        // Fetch profile data for each submission
        const profileIds = data.map(s => s.profile_id);
        
        // Get user data from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, email, full_name')
          .in('id', profileIds);
        
        if (userError) throw userError;
        
        // Combine submission and user data
        const submissionsWithProfiles = data.map(submission => {
          const user = userData?.find(u => u.id === submission.profile_id);
          return {
            ...submission,
            patient: user ? {
              full_name: user.full_name || 'Unknown',
              email: user.email
            } : {
              full_name: 'Unknown Patient',
              email: 'unknown@example.com'
            }
          };
        });
        
        // If filter is 'with_visuals', we need to check which submissions have files
        if (filter === 'with_visuals') {
          const submissionIds = submissionsWithProfiles.map(s => s.id);
          
          // Get submissions with files
          const { data: filesData, error: filesError } = await supabase
            .from('submission_files')
            .select('submission_id')
            .in('submission_id', submissionIds);
          
          if (filesError) throw filesError;
          
          // Filter submissions to only those with files
          const submissionIdsWithFiles = new Set(filesData?.map(f => f.submission_id));
          const filteredData = submissionsWithProfiles.filter(s => submissionIdsWithFiles.has(s.id));
          
          setSubmissions(filteredData);
        } else {
          setSubmissions(submissionsWithProfiles);
        }
        
        // If there's a selected submission, update it with the latest data
        if (selectedSubmission) {
          const updatedSubmission = submissionsWithProfiles.find(s => s.id === selectedSubmission.id);
          if (updatedSubmission) {
            setSelectedSubmission(updatedSubmission);
          }
        }
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
      toast.error('Failed to load symptom submissions');
      
      // If there's an error, use mock data
      const mockSubmissions: SymptomSubmission[] = [
        {
          id: '1',
          profile_id: '1',
          symptoms: 'Headache and fatigue for the past 3 days',
          duration: '1-3 days',
          severity: 7,
          status: 'Submitted',
          urgency_flag: 'Medium',
          ai_assessment: 'This may be consistent with tension headache or migraine',
          ai_risk_level: 'Moderate',
          ai_confidence: 0.85,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient: {
            full_name: 'John Doe',
            email: 'john.doe@example.com'
          }
        },
        {
          id: '2',
          profile_id: '2',
          symptoms: 'Sore throat and mild fever',
          duration: '4-7 days',
          severity: 5,
          status: 'Under Review',
          urgency_flag: 'Low',
          ai_assessment: 'This may be consistent with viral pharyngitis',
          ai_risk_level: 'Mild',
          ai_confidence: 0.92,
          created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
          updated_at: new Date(Date.now() - 86400000).toISOString(),
          patient: {
            full_name: 'Jane Smith',
            email: 'jane.smith@example.com'
          }
        },
        {
          id: '3',
          profile_id: '3',
          symptoms: 'Severe chest pain radiating to left arm',
          duration: 'Less than a day',
          severity: 9,
          status: 'Escalated',
          urgency_flag: 'High',
          ai_assessment: 'This may be consistent with cardiac issues and requires immediate attention',
          ai_risk_level: 'Needs Review',
          ai_confidence: 0.78,
          created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          updated_at: new Date(Date.now() - 172800000).toISOString(),
          patient: {
            full_name: 'Robert Johnson',
            email: 'robert.johnson@example.com'
          }
        }
      ];
      
      setSubmissions(mockSubmissions);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionDetails = async (submissionId: string) => {
    try {
      setLoading(true);
      
      // Get submission details
      const { data: submissionData, error: submissionError } = await supabase
        .from('symptom_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      
      if (submissionError) throw submissionError;
      
      // Get user data from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', submissionData.profile_id)
        .single();
      
      if (userError && userError.code !== 'PGRST116') throw userError;
      
      // Combine submission and user data
      const submissionWithProfile = {
        ...submissionData,
        patient: userData ? {
          full_name: userData.full_name || 'Unknown',
          email: userData.email
        } : {
          full_name: 'Unknown Patient',
          email: 'unknown@example.com'
        }
      };
      
      setSelectedSubmission(submissionWithProfile);
      
      // Get submission files
      const { data: filesData, error: filesError } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', submissionId);
      
      if (filesError) throw filesError;
      
      setSubmissionFiles(filesData || []);
      
      // Get provider notes
      const { data: notesData, error: notesError } = await supabase
        .from('provider_notes')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });
      
      if (notesError) throw notesError;
      
      setProviderNotes(notesData || []);
      
      // Get provider replies
      const { data: repliesData, error: repliesError } = await supabase
        .from('provider_replies')
        .select('*')
        .eq('submission_id', submissionId)
        .order('created_at', { ascending: true });
      
      if (repliesError) throw repliesError;
      
      setProviderReplies(repliesData || []);
      
      // Log activity
      await supabase
        .from('triage_activity_logs')
        .insert({
          submission_id: submissionId,
          action: 'Viewed',
          user_id: partnerId,
          details: 'Provider viewed submission details'
        });
      
      // If submission is in 'Submitted' status, update to 'Under Review'
      if (submissionData.status === 'Submitted') {
        await updateSubmissionStatus(submissionId, 'Under Review');
      }
    } catch (error) {
      console.error('Error loading submission details:', error);
      toast.error('Failed to load submission details');
      
      // If there's an error, use mock data
      if (submissionId === '1') {
        setSelectedSubmission({
          id: '1',
          profile_id: '1',
          symptoms: 'Headache and fatigue for the past 3 days',
          duration: '1-3 days',
          severity: 7,
          status: 'Submitted',
          urgency_flag: 'Medium',
          ai_assessment: 'This may be consistent with tension headache or migraine',
          ai_risk_level: 'Moderate',
          ai_confidence: 0.85,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          patient: {
            full_name: 'John Doe',
            email: 'john.doe@example.com'
          }
        });
        
        setProviderNotes([]);
        setProviderReplies([]);
        setSubmissionFiles([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: string, status: 'Submitted' | 'Under Review' | 'Reviewed' | 'Scheduled' | 'Escalated') => {
    try {
      setUpdatingStatus(true);
      
      const { error } = await supabase
        .from('symptom_submissions')
        .update({ status })
        .eq('id', submissionId);
      
      if (error) throw error;
      
      // Update local state
      setSubmissions(submissions.map(s => 
        s.id === submissionId ? { ...s, status } : s
      ));
      
      if (selectedSubmission && selectedSubmission.id === submissionId) {
        setSelectedSubmission({ ...selectedSubmission, status });
      }
      
      toast.success(`Status updated to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveNote = async () => {
    if (!selectedSubmission || !newNote.trim()) return;
    
    try {
      setSavingNote(true);
      
      const { data, error } = await supabase
        .from('provider_notes')
        .insert({
          submission_id: selectedSubmission.id,
          provider_id: partnerId,
          content: newNote.trim()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setProviderNotes([...providerNotes, data]);
      setNewNote('');
      
      // Log activity
      await supabase
        .from('triage_activity_logs')
        .insert({
          submission_id: selectedSubmission.id,
          action: 'Added Note',
          user_id: partnerId,
          details: 'Provider added a note'
        });
      
      toast.success('Note saved successfully');
    } catch (error) {
      console.error('Error saving note:', error);
      toast.error('Failed to save note');
    } finally {
      setSavingNote(false);
    }
  };

  const handleSaveReply = async () => {
    if (!selectedSubmission || !newReply.trim()) return;
    
    try {
      setSavingReply(true);
      
      const { data, error } = await supabase
        .from('provider_replies')
        .insert({
          submission_id: selectedSubmission.id,
          provider_id: partnerId,
          content: newReply.trim()
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setProviderReplies([...providerReplies, data]);
      setNewReply('');
      
      // Update status to 'Reviewed'
      await updateSubmissionStatus(selectedSubmission.id, 'Reviewed');
      
      // Log activity
      await supabase
        .from('triage_activity_logs')
        .insert({
          submission_id: selectedSubmission.id,
          action: 'Sent Reply',
          user_id: partnerId,
          details: 'Provider sent a reply to patient'
        });
      
      toast.success('Reply sent successfully');
    } catch (error) {
      console.error('Error sending reply:', error);
      toast.error('Failed to send reply');
    } finally {
      setSavingReply(false);
    }
  };

  const handleSubmitAIFeedback = async () => {
    if (!selectedSubmission || aiHelpful === null || !aiFeedbackType) return;
    
    try {
      setSavingFeedback(true);
      
      const { error } = await supabase
        .from('ai_feedback')
        .insert({
          submission_id: selectedSubmission.id,
          provider_id: partnerId,
          is_helpful: aiHelpful,
          feedback_type: aiFeedbackType,
          comments: aiFeedbackComments.trim() || null
        });
      
      if (error) throw error;
      
      setShowAIFeedback(false);
      setAiHelpful(null);
      setAiFeedbackType('');
      setAiFeedbackComments('');
      
      toast.success('AI feedback submitted successfully');
    } catch (error) {
      console.error('Error submitting AI feedback:', error);
      toast.error('Failed to submit AI feedback');
    } finally {
      setSavingFeedback(false);
    }
  };

  const handleScheduleCallback = () => {
    if (!selectedSubmission) return;
    
    // In a real app, this would open a scheduling interface
    toast.success('Opening scheduling interface');
    
    // Update status to 'Scheduled'
    updateSubmissionStatus(selectedSubmission.id, 'Scheduled');
  };

  const handleEscalate = () => {
    if (!selectedSubmission) return;
    
    // In a real app, this would trigger an escalation workflow
    toast.success('Submission escalated to urgent care team');
    
    // Update status to 'Escalated'
    updateSubmissionStatus(selectedSubmission.id, 'Escalated');
  };

  const handleDownloadSubmission = () => {
    if (!selectedSubmission) return;
    
    // Create a formatted text version of the submission
    const submissionText = `
SYMPTOM SUBMISSION REPORT
-------------------------
ID: ${selectedSubmission.id}
Date: ${new Date(selectedSubmission.created_at).toLocaleString()}
Patient: ${selectedSubmission.patient?.full_name || 'Unknown'}
Status: ${selectedSubmission.status}
Urgency: ${selectedSubmission.urgency_flag}

SYMPTOMS:
${selectedSubmission.symptoms}

${selectedSubmission.duration ? `Duration: ${selectedSubmission.duration}` : ''}
${selectedSubmission.severity ? `Severity: ${selectedSubmission.severity}/10` : ''}
${selectedSubmission.onset_date ? `Onset Date: ${selectedSubmission.onset_date}` : ''}

AI ASSESSMENT:
${selectedSubmission.ai_assessment || 'No AI assessment available'}
${selectedSubmission.ai_risk_level ? `Risk Level: ${selectedSubmission.ai_risk_level}` : ''}
${selectedSubmission.ai_confidence ? `Confidence: ${(selectedSubmission.ai_confidence * 100).toFixed(0)}%` : ''}

PROVIDER NOTES:
${providerNotes.length > 0 
  ? providerNotes.map(note => `[${new Date(note.created_at).toLocaleString()}]\n${note.content}`).join('\n\n')
  : 'No provider notes available'}

PROVIDER REPLIES:
${providerReplies.length > 0
  ? providerReplies.map(reply => `[${new Date(reply.created_at).toLocaleString()}]\n${reply.content}`).join('\n\n')
  : 'No provider replies available'}

FILES:
${submissionFiles.length > 0
  ? submissionFiles.map(file => `- ${file.file_name} (${file.file_type}): ${file.file_url}`).join('\n')
  : 'No files attached'}

Generated on: ${new Date().toLocaleString()}
    `;
    
    // Create a blob and download link
    const blob = new Blob([submissionText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `symptom-submission-${selectedSubmission.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Submission downloaded');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'High':
        return 'bg-red-100 text-red-800';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'Low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Submitted':
        return 'bg-blue-100 text-blue-800';
      case 'Under Review':
        return 'bg-yellow-100 text-yellow-800';
      case 'Reviewed':
        return 'bg-green-100 text-green-800';
      case 'Scheduled':
        return 'bg-purple-100 text-purple-800';
      case 'Escalated':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        submission.symptoms.toLowerCase().includes(searchLower) ||
        submission.patient?.full_name?.toLowerCase().includes(searchLower) ||
        submission.patient?.email.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const quickReplyTemplates = [
    "I've reviewed your symptoms and recommend scheduling a virtual consultation to discuss treatment options.",
    "Based on your symptoms, I recommend an in-person examination. Please schedule an appointment at your earliest convenience.",
    "Your symptoms appear mild. I recommend rest, hydration, and over-the-counter pain relievers. If symptoms worsen, please contact us immediately.",
    "I've reviewed your submission and have some follow-up questions. Could you provide more details about when the symptoms started and any factors that make them better or worse?",
    "Thank you for your submission. I've reviewed your symptoms and have scheduled a follow-up call with you for tomorrow."
  ];

  if (loading && submissions.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Symptom Submissions...
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
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="flex h-[calc(100vh-200px)]">
        {/* Submissions List */}
        <div className="w-full md:w-1/3 border-r border-gray-200 overflow-hidden flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search submissions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent"
              />
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            </div>
            
            <div className="flex space-x-2 overflow-x-auto pb-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  filter === 'all'
                    ? 'bg-[#1E3A5F] text-[#00F0FF]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('unreviewed')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  filter === 'unreviewed'
                    ? 'bg-[#1E3A5F] text-[#00F0FF]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Unreviewed
              </button>
              <button
                onClick={() => setFilter('high_priority')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  filter === 'high_priority'
                    ? 'bg-[#1E3A5F] text-[#00F0FF]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                High Priority
              </button>
              <button
                onClick={() => setFilter('with_visuals')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  filter === 'with_visuals'
                    ? 'bg-[#1E3A5F] text-[#00F0FF]'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                With Visuals
              </button>
            </div>
          </div>
          
          {/* Submissions List */}
          <div className="flex-1 overflow-y-auto">
            {filteredSubmissions.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    onClick={() => loadSubmissionDetails(submission.id)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                      selectedSubmission?.id === submission.id ? 'bg-gray-50 border-l-4 border-[#00F0FF]' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                          {submission.patient?.avatar_url ? (
                            <img
                              src={submission.patient.avatar_url}
                              alt={submission.patient.full_name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <User className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{submission.patient?.full_name || 'Unknown Patient'}</p>
                          <p className="text-xs text-gray-500">{new Date(submission.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getUrgencyColor(submission.urgency_flag)}`}>
                        {submission.urgency_flag}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">{submission.symptoms}</p>
                    
                    <div className="flex justify-between items-center">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(submission.status)}`}>
                        {submission.status}
                      </span>
                      {submission.ai_risk_level && (
                        <span className="text-xs text-gray-500">
                          AI Risk: {submission.ai_risk_level}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full p-6 text-center">
                <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No Submissions Found</h3>
                <p className="text-gray-500">
                  {filter !== 'all' 
                    ? `No submissions match the "${filter}" filter.` 
                    : "You don't have any symptom submissions yet."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Submission Details */}
        <div className="hidden md:flex md:w-2/3 flex-col">
          {selectedSubmission ? (
            <>
              {/* Submission Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {selectedSubmission.patient?.avatar_url ? (
                        <img
                          src={selectedSubmission.patient.avatar_url}
                          alt={selectedSubmission.patient.full_name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="flex items-center">
                        <p className="font-medium text-gray-900">{selectedSubmission.patient?.full_name || 'Unknown Patient'}</p>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getStatusColor(selectedSubmission.status)}`}>
                          {selectedSubmission.status}
                        </span>
                        <span className={`ml-2 px-2 py-1 text-xs rounded-full ${getUrgencyColor(selectedSubmission.urgency_flag)}`}>
                          {selectedSubmission.urgency_flag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{selectedSubmission.patient?.email}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadSubmission}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEscalate}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Escalate
                    </Button>
                  </div>
                </div>
              </div>

              {/* Submission Content */}
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* Symptom Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">Symptom Details</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm text-gray-500">Symptoms</p>
                        <p className="text-gray-700">{selectedSubmission.symptoms}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {selectedSubmission.duration && (
                          <div>
                            <p className="text-sm text-gray-500">Duration</p>
                            <p className="text-gray-700">{selectedSubmission.duration}</p>
                          </div>
                        )}
                        
                        {selectedSubmission.severity !== undefined && (
                          <div>
                            <p className="text-sm text-gray-500">Severity</p>
                            <p className="text-gray-700">{selectedSubmission.severity}/10</p>
                          </div>
                        )}
                        
                        {selectedSubmission.onset_date && (
                          <div>
                            <p className="text-sm text-gray-500">Onset Date</p>
                            <p className="text-gray-700">{selectedSubmission.onset_date}</p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-sm text-gray-500">Submitted</p>
                          <p className="text-gray-700">{new Date(selectedSubmission.created_at).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Assessment */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-medium text-gray-900">AI Assessment</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAIFeedback(true)}
                      >
                        Rate AI
                      </Button>
                    </div>
                    
                    {selectedSubmission.ai_assessment ? (
                      <div className="space-y-3">
                        <p className="text-gray-700">{selectedSubmission.ai_assessment}</p>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {selectedSubmission.ai_risk_level && (
                            <div>
                              <p className="text-sm text-gray-500">Risk Level</p>
                              <p className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                selectedSubmission.ai_risk_level === 'Mild' ? 'bg-green-100 text-green-800' :
                                selectedSubmission.ai_risk_level === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {selectedSubmission.ai_risk_level}
                              </p>
                            </div>
                          )}
                          
                          {selectedSubmission.ai_confidence && (
                            <div>
                              <p className="text-sm text-gray-500">Confidence</p>
                              <p className="text-gray-700">{(selectedSubmission.ai_confidence * 100).toFixed(0)}%</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500 italic">No AI assessment available</p>
                    )}
                  </div>
                </div>

                {/* Visual Evidence */}
                {submissionFiles.length > 0 && (
                  <div className="mb-6">
                    <h3 className="font-medium text-gray-900 mb-3">Visual Evidence</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {submissionFiles.map((file) => (
                        <div key={file.id} className="border rounded-lg overflow-hidden">
                          {file.file_type.startsWith('image/') ? (
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                              <img
                                src={file.file_url}
                                alt={file.file_name}
                                className="w-full h-32 object-cover"
                              />
                            </a>
                          ) : file.file_type.startsWith('video/') ? (
                            <div className="relative h-32 bg-gray-100 flex items-center justify-center">
                              <Play className="h-10 w-10 text-gray-500" />
                              <a
                                href={file.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="absolute inset-0"
                              ></a>
                            </div>
                          ) : (
                            <div className="h-32 bg-gray-100 flex items-center justify-center">
                              <FileText className="h-10 w-10 text-gray-500" />
                            </div>
                          )}
                          <div className="p-2">
                            <p className="text-xs text-gray-600 truncate">{file.file_name}</p>
                            <a
                              href={file.file_url}
                              download={file.file_name}
                              className="text-xs text-blue-600 hover:text-blue-800"
                            >
                              Download
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Provider Notes */}
                <div className="mb-6">
                  <h3 className="font-medium text-gray-900 mb-3">Provider Notes</h3>
                  
                  {providerNotes.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {providerNotes.map((note) => (
                        <div key={note.id} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-gray-700">{note.content}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(note.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic mb-4">No provider notes yet</p>
                  )}
                  
                  <div className="flex">
                    <textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Add a private note (only visible to providers)..."
                      className="flex-1 p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={handleSaveNote}
                      disabled={!newNote.trim() || savingNote}
                      isLoading={savingNote}
                    >
                      Save Note
                    </Button>
                  </div>
                </div>

                {/* Provider Replies */}
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">Patient Communication</h3>
                  
                  {providerReplies.length > 0 ? (
                    <div className="space-y-3 mb-4">
                      {providerReplies.map((reply) => (
                        <div key={reply.id} className="bg-blue-50 rounded-lg p-3">
                          <p className="text-gray-700">{reply.content}</p>
                          <p className="text-xs text-gray-500 mt-1">{new Date(reply.created_at).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic mb-4">No replies sent yet</p>
                  )}
                  
                  <div className="relative">
                    <textarea
                      value={newReply}
                      onChange={(e) => setNewReply(e.target.value)}
                      placeholder="Type your reply to the patient..."
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent resize-none"
                      rows={4}
                    />
                    <div className="absolute top-2 right-2">
                      <button
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
                      >
                        {showQuickReplies ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                    
                    {showQuickReplies && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg">
                        <div className="p-2">
                          <h4 className="font-medium text-gray-900 mb-2">Quick Replies</h4>
                          <div className="space-y-2">
                            {quickReplyTemplates.map((template, index) => (
                              <button
                                key={index}
                                onClick={() => {
                                  setNewReply(template);
                                  setShowQuickReplies(false);
                                }}
                                className="w-full text-left p-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                              >
                                {template.length > 100 ? `${template.substring(0, 100)}...` : template}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between mt-4">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={handleScheduleCallback}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Callback
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => updateSubmissionStatus(selectedSubmission.id, 'Reviewed')}
                        disabled={updatingStatus}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark Reviewed
                      </Button>
                    </div>
                    <Button
                      onClick={handleSaveReply}
                      disabled={!newReply.trim() || savingReply}
                      isLoading={savingReply}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No Submission Selected</h3>
                <p className="text-gray-500 max-w-md">
                  Select a submission from the list to view details and provide feedback.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Feedback Modal */}
      {showAIFeedback && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-xl font-bold mb-4">Rate AI Assessment</h3>
            
            <div className="mb-4">
              <p className="text-gray-700 mb-2">Was the AI assessment helpful?</p>
              <div className="flex space-x-4">
                <button
                  onClick={() => setAiHelpful(true)}
                  className={`flex items-center p-2 rounded-lg ${
                    aiHelpful === true ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <ThumbsUp className="h-5 w-5 mr-2" />
                  Helpful
                </button>
                <button
                  onClick={() => setAiHelpful(false)}
                  className={`flex items-center p-2 rounded-lg ${
                    aiHelpful === false ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  <ThumbsDown className="h-5 w-5 mr-2" />
                  Not Helpful
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Feedback Type
              </label>
              <select
                value={aiFeedbackType}
                onChange={(e) => setAiFeedbackType(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent"
              >
                <option value="">Select feedback type</option>
                <option value="Accuracy">Accuracy</option>
                <option value="Relevance">Relevance</option>
                <option value="Clarity">Clarity</option>
                <option value="Completeness">Completeness</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comments (Optional)
              </label>
              <textarea
                value={aiFeedbackComments}
                onChange={(e) => setAiFeedbackComments(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent resize-none"
                rows={3}
                placeholder="Add any specific feedback or suggestions..."
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowAIFeedback(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAIFeedback}
                disabled={aiHelpful === null || !aiFeedbackType || savingFeedback}
                isLoading={savingFeedback}
              >
                Submit Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}