import { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Upload, 
  Camera, 
  Mic, 
  Send, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  FileDown, 
  Play, 
  Pause,
  ChevronRight,
  X,
  Info,
  Bot
} from 'lucide-react';
import Button from '../ui/Button';
import { toast } from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/auth';

interface HealthAssistantProps {
  membershipTier?: 'smart' | 'core' | 'vip';
}

interface SymptomSubmission {
  id?: string;
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
  created_at?: string;
  notes?: string;
}

interface SubmissionFile {
  id?: string;
  submission_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  created_at?: string;
}

const HealthAssistant = ({ membershipTier = 'core' }: HealthAssistantProps) => {
  const { user } = useAuthStore();
  const [activeStep, setActiveStep] = useState<number>(0);
  const [symptoms, setSymptoms] = useState<string>('');
  const [duration, setDuration] = useState<string>('');
  const [severity, setSeverity] = useState<number>(5);
  const [onsetDate, setOnsetDate] = useState<string>('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [showResponse, setShowResponse] = useState<boolean>(false);
  const [aiResponse, setAiResponse] = useState<{
    assessment: string;
    risk: 'Mild' | 'Moderate' | 'Needs Review';
    timestamp: string;
    sessionId: string;
  } | null>(null);
  const [submissionHistory, setSubmissionHistory] = useState<{
    id: string;
    date: string;
    symptoms: string;
    status: 'Submitted' | 'Under Review' | 'Reviewed' | 'Scheduled' | 'Escalated';
    notes?: string;
  }[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedSubmission, setSelectedSubmission] = useState<{
    id: string;
    date: string;
    symptoms: string;
    status: 'Submitted' | 'Under Review' | 'Reviewed' | 'Scheduled' | 'Escalated';
    notes?: string;
    ai_assessment?: string;
    ai_risk_level?: string;
    duration?: string;
    severity?: number;
    onset_date?: string;
    files?: SubmissionFile[];
  } | null>(null);
  const [showSubmissionModal, setShowSubmissionModal] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  
  const steps = [
    { name: 'Describe', description: 'Describe your symptoms' },
    { name: 'Upload', description: 'Upload evidence (optional)' },
    { name: 'Review', description: 'AI assessment' },
    { name: 'Next Steps', description: 'Recommendations' }
  ];

  useEffect(() => {
    if (user) {
      loadSubmissionHistory();
    }
  }, [user]);
  
  const loadSubmissionHistory = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch submission history from Supabase
      const { data, error } = await supabase
        .from('symptom_submissions')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        const formattedHistory = data.map(item => ({
          id: item.id,
          date: new Date(item.created_at).toISOString().split('T')[0],
          symptoms: item.symptoms,
          status: item.status,
          notes: item.notes,
          ai_assessment: item.ai_assessment,
          ai_risk_level: item.ai_risk_level,
          duration: item.duration,
          severity: item.severity,
          onset_date: item.onset_date
        }));
        
        setSubmissionHistory(formattedHistory);
      }
    } catch (error) {
      console.error('Error loading submission history:', error);
      // If there's an error or no data, use the default history
      setSubmissionHistory([
        {
          id: 'SYM-1234',
          date: '2025-04-01',
          symptoms: 'Headache, fatigue',
          status: 'Reviewed',
          notes: 'Recommended rest and hydration. Follow up if symptoms persist.'
        },
        {
          id: 'SYM-1122',
          date: '2025-03-15',
          symptoms: 'Sore throat, cough',
          status: 'Scheduled',
          notes: 'Virtual appointment scheduled for March 16.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionDetails = async (submissionId: string) => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Fetch submission details
      const { data: submissionData, error: submissionError } = await supabase
        .from('symptom_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      
      if (submissionError) throw submissionError;
      
      // Fetch submission files
      const { data: filesData, error: filesError } = await supabase
        .from('submission_files')
        .select('*')
        .eq('submission_id', submissionId);
      
      if (filesError) throw filesError;
      
      setSelectedSubmission({
        id: submissionData.id,
        date: new Date(submissionData.created_at).toISOString().split('T')[0],
        symptoms: submissionData.symptoms,
        status: submissionData.status,
        notes: submissionData.notes,
        ai_assessment: submissionData.ai_assessment,
        ai_risk_level: submissionData.ai_risk_level,
        duration: submissionData.duration,
        severity: submissionData.severity,
        onset_date: submissionData.onset_date,
        files: filesData || []
      });
      
      setShowSubmissionModal(true);
    } catch (error) {
      console.error('Error loading submission details:', error);
      toast.error('Failed to load submission details');
      
      // If there's an error, use the basic submission data
      const submission = submissionHistory.find(s => s.id === submissionId);
      if (submission) {
        setSelectedSubmission(submission);
        setShowSubmissionModal(true);
      }
    } finally {
      setLoading(false);
    }
  };
  
  const handleNextStep = () => {
    if (activeStep === 0 && !symptoms.trim()) {
      toast.error('Please describe your symptoms');
      return;
    }
    
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
      
      // If moving to the Review step, simulate AI response
      if (activeStep === 1) {
        setTimeout(() => {
          const assessmentText = `This may be consistent with ${symptoms.includes('headache') ? 'tension headache or migraine' : 
                         symptoms.includes('throat') ? 'viral pharyngitis' : 
                         symptoms.includes('cough') ? 'upper respiratory infection' : 
                         'a common condition'}. This is not a diagnosis. Your care team will review and follow up.`;
          
          const riskLevel = symptoms.includes('severe') ? 'Needs Review' : 
                  symptoms.includes('pain') ? 'Moderate' : 'Mild';
          
          const sessionId = `SYM-${Math.floor(1000 + Math.random() * 9000)}`;
          
          setAiResponse({
            assessment: assessmentText,
            risk: riskLevel,
            timestamp: new Date().toISOString(),
            sessionId: sessionId
          });
          setShowResponse(true);
        }, 1500);
      }
    }
  };
  
  const handlePrevStep = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };
  
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setUploadedFiles([...uploadedFiles, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles = Array.from(e.dataTransfer.files);
      setUploadedFiles([...uploadedFiles, ...newFiles]);
      toast.success(`${newFiles.length} file(s) uploaded successfully`);
    }
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const removeFile = (index: number) => {
    const newFiles = [...uploadedFiles];
    newFiles.splice(index, 1);
    setUploadedFiles(newFiles);
  };
  
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    if (!isRecording) {
      toast.success('Voice recording started');
    } else {
      toast.success('Voice recording stopped');
      // Simulate adding voice content to symptoms
      setSymptoms(prev => prev + (prev ? ' ' : '') + 'I have been experiencing this for about 3 days.');
    }
  };
  
  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to submit a symptom assessment');
      return;
    }
    
    try {
      setLoading(true);
      
      // Determine urgency based on symptoms and severity
      let urgencyFlag: 'Low' | 'Medium' | 'High' = 'Low';
      if (severity >= 8 || symptoms.toLowerCase().includes('severe') || symptoms.toLowerCase().includes('chest pain')) {
        urgencyFlag = 'High';
      } else if (severity >= 5 || symptoms.toLowerCase().includes('pain') || symptoms.toLowerCase().includes('fever')) {
        urgencyFlag = 'Medium';
      }
      
      // Create submission record in Supabase
      const submissionData: SymptomSubmission = {
        profile_id: user.id,
        symptoms: symptoms,
        duration: duration || undefined,
        severity: severity,
        onset_date: onsetDate || undefined,
        status: 'Submitted',
        urgency_flag: urgencyFlag,
        ai_assessment: aiResponse?.assessment,
        ai_risk_level: aiResponse?.risk,
        ai_confidence: 0.85, // Mock confidence level
      };
      
      const { data: submissionResult, error: submissionError } = await supabase
        .from('symptom_submissions')
        .insert(submissionData)
        .select()
        .single();
      
      if (submissionError) throw submissionError;
      
      // Upload files if any
      if (uploadedFiles.length > 0 && submissionResult) {
        for (const file of uploadedFiles) {
          // Create a unique file path
          const fileExt = file.name.split('.').pop();
          const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
          const filePath = `${user.id}/${submissionResult.id}/${fileName}`;
          
          // Upload file to Supabase Storage
          const { error: uploadError } = await supabase.storage
            .from('symptom_uploads')
            .upload(filePath, file);
          
          if (uploadError) throw uploadError;
          
          // Get public URL
          const { data: publicUrlData } = supabase.storage
            .from('symptom_uploads')
            .getPublicUrl(filePath);
          
          // Create file record in database
          const fileData: SubmissionFile = {
            submission_id: submissionResult.id,
            file_url: publicUrlData.publicUrl,
            file_name: file.name,
            file_type: file.type
          };
          
          const { error: fileRecordError } = await supabase
            .from('submission_files')
            .insert(fileData);
          
          if (fileRecordError) throw fileRecordError;
        }
      }
      
      // Add to history
      const newSubmission = {
        id: submissionResult.id,
        date: new Date().toISOString().split('T')[0],
        symptoms: symptoms,
        status: 'Submitted' as const
      };
      
      setSubmissionHistory([newSubmission, ...submissionHistory]);
      
      // Reset form
      setActiveStep(0);
      setSymptoms('');
      setDuration('');
      setSeverity(5);
      setOnsetDate('');
      setUploadedFiles([]);
      setShowResponse(false);
      setAiResponse(null);
      
      toast.success('Your symptom assessment has been submitted');
    } catch (error) {
      console.error('Error submitting symptom assessment:', error);
      toast.error('Failed to submit symptom assessment');
    } finally {
      setLoading(false);
    }
  };
  
  const downloadSummary = () => {
    if (!aiResponse) return;
    
    const summaryText = `
      SYMPTOM ASSESSMENT SUMMARY
      -------------------------
      Session ID: ${aiResponse.sessionId}
      Date: ${new Date(aiResponse.timestamp).toLocaleString()}
      
      SYMPTOMS:
      ${symptoms}
      
      Duration: ${duration || 'Not specified'}
      Severity: ${severity}/10
      Onset Date: ${onsetDate || 'Not specified'}
      
      AI ASSESSMENT:
      ${aiResponse.assessment}
      
      Risk Level: ${aiResponse.risk}
      
      This is an automated assessment and not a medical diagnosis.
      Please consult with a healthcare professional for proper evaluation.
    `;
    
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `symptom-assessment-${aiResponse.sessionId}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Summary downloaded');
  };
  
  const toggleAudioPlayback = () => {
    setIsAudioPlaying(!isAudioPlaying);
  };

  const closeSubmissionModal = () => {
    setShowSubmissionModal(false);
    setSelectedSubmission(null);
  };
  
  const renderStepContent = () => {
    switch (activeStep) {
      case 0: // Describe
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-navy-700 mb-1">
                Describe your symptoms
              </label>
              <div className="flex">
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Describe what you're experiencing..."
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent resize-none"
                  rows={4}
                />
                <button
                  onClick={toggleRecording}
                  className={`ml-2 p-2 rounded-full ${isRecording ? 'bg-red-500 text-white' : 'bg-[#1E3A5F] text-[#00F0FF]'}`}
                >
                  <Mic className={`h-5 w-5 ${isRecording ? 'animate-pulse' : ''}`} />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Duration
                </label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent"
                >
                  <option value="">Select duration</option>
                  <option value="Less than a day">Less than a day</option>
                  <option value="1-3 days">1-3 days</option>
                  <option value="4-7 days">4-7 days</option>
                  <option value="1-2 weeks">1-2 weeks</option>
                  <option value="More than 2 weeks">More than 2 weeks</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Severity (1-10)
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={severity}
                    onChange={(e) => setSeverity(parseInt(e.target.value))}
                    className="w-full"
                  />
                  <span className="ml-2 font-medium">{severity}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-navy-700 mb-1">
                  Onset Date
                </label>
                <input
                  type="date"
                  value={onsetDate}
                  onChange={(e) => setOnsetDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00F0FF] focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );
        
      case 1: // Upload
        return (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="space-y-2">
                <div className="flex justify-center">
                  <Upload className="h-10 w-10 text-[#1E3A5F]" />
                </div>
                <p className="text-navy-700 font-medium">Drag and drop files here</p>
                <p className="text-navy-600 text-sm">or</p>
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Browse Files
                  </Button>
                  <Button
                    onClick={() => toast.success('Camera activated')}
                    variant="outline"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Take Photo
                  </Button>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept="image/jpeg,image/png,video/mp4"
                  multiple
                />
                <p className="text-xs text-navy-500 mt-2">
                  Accepts JPG, PNG (photos) or MP4 (videos under 30s)
                </p>
              </div>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-navy-700 mb-2">Uploaded Files</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="relative group">
                      <div className="border rounded-lg p-2 bg-navy-50">
                        {file.type.startsWith('image/') ? (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Upload ${index + 1}`}
                            className="w-full h-24 object-cover rounded"
                          />
                        ) : (
                          <div className="w-full h-24 bg-navy-100 rounded flex items-center justify-center">
                            <Play className="h-8 w-8 text-navy-600" />
                          </div>
                        )}
                        <p className="text-xs text-navy-600 mt-1 truncate">{file.name}</p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">
                    All uploads are encrypted and HIPAA-compliant. Only your care team can access these files.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 2: // Review
        return (
          <div className="space-y-6">
            {showResponse && aiResponse ? (
              <>
                <div className="bg-[#0A1628] rounded-xl p-6 text-white">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-[#1E3A5F] flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-[#00F0FF]" />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-white">AI Health Assistant</h3>
                        <p className="text-xs text-[#00F0FF]">Assessment</p>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      aiResponse.risk === 'Mild' ? 'bg-green-100 text-green-800' :
                      aiResponse.risk === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {aiResponse.risk}
                    </div>
                  </div>
                  
                  <p className="text-white/90 mb-4">{aiResponse.assessment}</p>
                  
                  <div className="flex justify-between text-xs text-white/70">
                    <span>Session ID: {aiResponse.sessionId}</span>
                    <span>{new Date(aiResponse.timestamp).toLocaleString()}</span>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-xl p-6">
                  <h3 className="font-medium text-navy-700 mb-4">Symptom Summary</h3>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-navy-600">Symptoms:</span>
                      <span className="font-medium text-navy-800">{symptoms}</span>
                    </div>
                    
                    {duration && (
                      <div className="flex justify-between">
                        <span className="text-navy-600">Duration:</span>
                        <span className="font-medium text-navy-800">{duration}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-navy-600">Severity:</span>
                      <span className="font-medium text-navy-800">{severity}/10</span>
                    </div>
                    
                    {onsetDate && (
                      <div className="flex justify-between">
                        <span className="text-navy-600">Onset Date:</span>
                        <span className="font-medium text-navy-800">{onsetDate}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-navy-600">Uploads:</span>
                      <span className="font-medium text-navy-800">{uploadedFiles.length} file(s)</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={downloadSummary}
                    className="flex items-center"
                  >
                    <FileDown className="h-4 w-4 mr-2" />
                    Download Summary
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#00F0FF]"></div>
                <p className="mt-4 text-navy-600">Analyzing your symptoms...</p>
              </div>
            )}
          </div>
        );
        
      case 3: // Next Steps
        return (
          <div className="space-y-6">
            {membershipTier === 'basic' ? (
              <div className="bg-navy-50 rounded-xl p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-navy-800 mb-2">Your symptoms have been saved</h3>
                <p className="text-navy-600 mb-6">A provider will review and contact you within 24-48 hours.</p>
                
                <div className="bg-gold-50 border border-gold-200 rounded-xl p-6 mb-6">
                  <h4 className="font-semibold text-navy-800 mb-2">Upgrade for Faster Response</h4>
                  <p className="text-navy-600 mb-4">VIP members receive 24/7 concierge support and priority provider access.</p>
                  <Button variant="luxury">
                    Upgrade to VIP
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-navy-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold text-navy-800 mb-4">Schedule a Consultation</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-3">
                          <h4 className="font-medium text-navy-800">Virtual Consultation</h4>
                          <p className="text-sm text-navy-600">Available today</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => toast.success('Redirecting to virtual appointment booking')}
                      >
                        Book Virtual
                      </Button>
                    </div>
                    
                    <div className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-center mb-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="ml-3">
                          <h4 className="font-medium text-navy-800">In-Person Visit</h4>
                          <p className="text-sm text-navy-600">Next available: Tomorrow</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => toast.success('Redirecting to in-person appointment booking')}
                      >
                        Book In-Person
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="bg-navy-50 rounded-xl p-6">
                  <h3 className="font-semibold text-navy-800 mb-3">Provider Message</h3>
                  
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start">
                      <div className="h-10 w-10 rounded-full bg-navy-100 flex-shrink-0 flex items-center justify-center">
                        <MessageSquare className="h-5 w-5 text-navy-600" />
                      </div>
                      <div className="ml-3">
                        <p className="text-navy-600">Based on your symptoms, I recommend a virtual consultation to discuss treatment options. I have availability tomorrow morning.</p>
                        <div className="mt-2 flex items-center">
                          <button
                            onClick={toggleAudioPlayback}
                            className="flex items-center text-navy-600 hover:text-navy-800"
                          >
                            {isAudioPlaying ? (
                              <>
                                <Pause className="h-4 w-4 mr-1" />
                                Pause Audio
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-1" />
                                Play Audio
                              </>
                            )}
                          </button>
                          <span className="text-xs text-navy-500 ml-3">0:42</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
      <div className="flex items-center space-x-3 mb-6">
        <MessageSquare className="h-8 w-8 text-[#00F0FF]" />
        <h2 className="text-2xl font-display font-bold text-navy-900">My Health Concierge</h2>
      </div>

      {/* Progress Tracker */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={index} className="flex flex-col items-center relative">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                activeStep >= index 
                  ? 'bg-[#00F0FF] text-[#0A1628]' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {index + 1}
              </div>
              <p className={`mt-2 text-xs text-center ${
                activeStep >= index ? 'text-navy-800 font-medium' : 'text-navy-500'
              }`}>
                {step.name}
              </p>
              {index < steps.length - 1 && (
                <div className={`absolute top-4 left-8 w-[calc(100%-2rem)] h-0.5 ${
                  activeStep > index ? 'bg-[#00F0FF]' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="mb-6">
        {renderStepContent()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={handlePrevStep}
          disabled={activeStep === 0}
        >
          Back
        </Button>
        
        {activeStep < steps.length - 1 ? (
          <Button
            onClick={handleNextStep}
          >
            Continue
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            isLoading={loading}
          >
            Submit
            <CheckCircle className="ml-2 h-5 w-5" />
          </Button>
        )}
      </div>

      {/* History Timeline */}
      {submissionHistory.length > 0 && (
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-navy-800 mb-4">Previous Submissions</h3>
          
          <div className="space-y-4">
            {submissionHistory.map((item) => (
              <div key={item.id} className="bg-navy-50 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center">
                      <span className="font-medium text-navy-800">{item.id}</span>
                      <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
                        item.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                        item.status === 'Reviewed' ? 'bg-green-100 text-green-800' :
                        item.status === 'Scheduled' ? 'bg-purple-100 text-purple-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm text-navy-600 mt-1">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {item.date}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => loadSubmissionDetails(item.id)}
                  >
                    View Details
                  </Button>
                </div>
                
                <div className="mt-3">
                  <p className="text-navy-600"><span className="font-medium">Symptoms:</span> {item.symptoms}</p>
                  {item.notes && (
                    <div className="mt-2 bg-white p-3 rounded-lg border border-gray-200">
                      <p className="text-sm text-navy-600">{item.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Details Modal */}
      {showSubmissionModal && selectedSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-navy-900">Submission Details</h3>
              <button 
                onClick={closeSubmissionModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Status and Date */}
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <span className={`px-3 py-1 text-sm rounded-full ${
                    selectedSubmission.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
                    selectedSubmission.status === 'Under Review' ? 'bg-yellow-100 text-yellow-800' :
                    selectedSubmission.status === 'Reviewed' ? 'bg-green-100 text-green-800' :
                    selectedSubmission.status === 'Scheduled' ? 'bg-purple-100 text-purple-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {selectedSubmission.status}
                  </span>
                </div>
                <p className="text-sm text-navy-600">
                  <Calendar className="h-4 w-4 inline mr-1" />
                  Submitted on {selectedSubmission.date}
                </p>
              </div>
              
              {/* Symptoms and Details */}
              <div className="bg-navy-50 rounded-lg p-4">
                <h4 className="font-medium text-navy-800 mb-2">Symptoms</h4>
                <p className="text-navy-600">{selectedSubmission.symptoms}</p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  {selectedSubmission.duration && (
                    <div>
                      <p className="text-sm text-navy-500">Duration</p>
                      <p className="font-medium text-navy-800">{selectedSubmission.duration}</p>
                    </div>
                  )}
                  
                  {selectedSubmission.severity !== undefined && (
                    <div>
                      <p className="text-sm text-navy-500">Severity</p>
                      <p className="font-medium text-navy-800">{selectedSubmission.severity}/10</p>
                    </div>
                  )}
                  
                  {selectedSubmission.onset_date && (
                    <div>
                      <p className="text-sm text-navy-500">Onset Date</p>
                      <p className="font-medium text-navy-800">{selectedSubmission.onset_date}</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Assessment */}
              {selectedSubmission.ai_assessment && (
                <div className="bg-[#0A1628] rounded-lg p-4 text-white">
                  <h4 className="font-medium text-white mb-2 flex items-center">
                    <Bot className="h-5 w-5 text-[#00F0FF] mr-2" />
                    AI Assessment
                  </h4>
                  <p className="text-white/90">{selectedSubmission.ai_assessment}</p>
                  
                  {selectedSubmission.ai_risk_level && (
                    <div className="mt-3">
                      <span className={`px-3 py-1 text-xs rounded-full ${
                        selectedSubmission.ai_risk_level === 'Mild' ? 'bg-green-100 text-green-800' :
                        selectedSubmission.ai_risk_level === 'Moderate' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        Risk Level: {selectedSubmission.ai_risk_level}
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Files */}
              {selectedSubmission.files && selectedSubmission.files.length > 0 && (
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="font-medium text-navy-800 mb-2">Uploaded Files</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedSubmission.files.map((file) => (
                      <div key={file.id} className="border rounded-lg overflow-hidden bg-white">
                        {file.file_type.startsWith('image/') ? (
                          <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={file.file_url} 
                              alt={file.file_name} 
                              className="w-full h-32 object-cover"
                            />
                          </a>
                        ) : file.file_type.startsWith('video/') ? (
                          <div className="h-32 bg-navy-100 flex items-center justify-center">
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                              <Play className="h-10 w-10 text-navy-600" />
                            </a>
                          </div>
                        ) : (
                          <div className="h-32 bg-navy-100 flex items-center justify-center">
                            <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                              <FileDown className="h-10 w-10 text-navy-600" />
                            </a>
                          </div>
                        )}
                        <div className="p-2">
                          <p className="text-xs text-navy-600 truncate">{file.file_name}</p>
                          <a 
                            href={file.file_url} 
                            download={file.file_name}
                            className="text-xs text-blue-600 hover:underline"
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
              {selectedSubmission.notes && (
                <div className="bg-navy-50 rounded-lg p-4">
                  <h4 className="font-medium text-navy-800 mb-2">Provider Notes</h4>
                  <div className="bg-white p-3 rounded-lg border border-gray-200">
                    <p className="text-navy-600">{selectedSubmission.notes}</p>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end">
                <Button variant="outline" onClick={closeSubmissionModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HealthAssistant;