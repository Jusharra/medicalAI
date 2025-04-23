import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { Activity, Brain, AlertCircle, Heart, Download, Plus, FileText, Calendar, ArrowRight, CheckCircle, LayoutDashboard, Gift, Receipt, Clock, Settings, Tag, Users, MessageSquare, Pill, ChevronLeft, ChevronRight, LogOut, Menu, X } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { toast } from 'react-hot-toast';

interface HealthMetric {
  id: string;
  metric_type: string;
  value: number;
  unit: string;
  measured_at: string;
}

interface HealthAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  recommendation: string;
  created_at: string;
}

interface HealthAssessment {
  id: string;
  symptoms: string;
  history: string;
  goals: string;
  physical_health: string;
  mental_health: string;
  created_at: string;
}

interface VitalSigns {
  id: string;
  temperature: number;
  heart_rate: number;
  blood_pressure: string;
  measured_at: string;
}

interface AssessmentFormData {
  symptoms: string[];
  lifestyle: string[];
  goals: string[];
  physicalHealth: {
    exerciseFrequency: string;
    sleepQuality: string;
    energyLevel: string;
  };
  mentalHealth: {
    stressLevel: string;
    moodStability: string;
    anxietyLevel: string;
  };
  vitalSigns: {
    weight: string;
    height: string;
    bloodPressure: string;
    restingHeartRate: string;
  };
}

export default function HealthAlerts() {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [assessment, setAssessment] = useState<HealthAssessment | null>(null);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns[]>([]);
  const [assessments, setAssessments] = useState<HealthAssessment[]>([]);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [assessmentStep, setAssessmentStep] = useState(1);
  const [submittingAssessment, setSubmittingAssessment] = useState(false);
  const [assessmentFormData, setAssessmentFormData] = useState<AssessmentFormData>({
    symptoms: [],
    lifestyle: [],
    goals: [],
    physicalHealth: {
      exerciseFrequency: '',
      sleepQuality: '',
      energyLevel: '',
    },
    mentalHealth: {
      stressLevel: '',
      moodStability: '',
      anxietyLevel: '',
    },
    vitalSigns: {
      weight: '',
      height: '',
      bloodPressure: '',
      restingHeartRate: '',
    }
  });
  const [selectedAssessment, setSelectedAssessment] = useState<HealthAssessment | null>(null);
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const assessmentFormRef = useRef<HTMLDivElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/signin');
      return;
    }
    loadData();
    
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
    if (showAssessmentForm && assessmentFormRef.current) {
      assessmentFormRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [showAssessmentForm, assessmentStep]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load latest health assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('health_assessments')
        .select('*')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (assessmentError && assessmentError.code !== 'PGRST116') throw assessmentError;
      setAssessment(assessmentData);

      // Load all health assessments for history
      const { data: assessmentsData, error: assessmentsError } = await supabase
        .from('health_assessments')
        .select('*')
        .eq('profile_id', user?.id)
        .order('created_at', { ascending: false });

      if (assessmentsError) throw assessmentsError;
      setAssessments(assessmentsData || []);

      // Load health metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('health_metrics')
        .select('*')
        .eq('profile_id', user?.id)
        .order('measured_at', { ascending: false });

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Load vital signs
      const { data: vitalsData, error: vitalsError } = await supabase
        .from('vital_signs')
        .select('*')
        .eq('profile_id', user?.id)
        .order('measured_at', { ascending: false });

      if (vitalsError) throw vitalsError;
      setVitalSigns(vitalsData || []);

      // Generate alerts based on data
      const generatedAlerts = generateAlerts(metricsData || [], vitalsData || []);
      setAlerts(generatedAlerts);

    } catch (error) {
      console.error('Error loading health data:', error);
      toast.error('Failed to load health data');
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = (metrics: HealthMetric[], vitals: VitalSigns[]): HealthAlert[] => {
    const alerts: HealthAlert[] = [];

    // Check vital signs
    const latestVitals = vitals[0];
    if (latestVitals) {
      if (latestVitals.temperature > 37.5) {
        alerts.push({
          id: 'temp-high',
          type: 'vital',
          severity: 'medium',
          message: 'Elevated Temperature Detected',
          recommendation: 'Monitor temperature and rest. Contact healthcare provider if it persists.',
          created_at: latestVitals.measured_at
        });
      }

      if (latestVitals.heart_rate > 100) {
        alerts.push({
          id: 'hr-high',
          type: 'vital',
          severity: 'medium',
          message: 'Elevated Heart Rate',
          recommendation: 'Take a break and practice deep breathing. Monitor for other symptoms.',
          created_at: latestVitals.measured_at
        });
      }
    }

    // Check metrics trends
    const weightMetrics = metrics.filter(m => m.metric_type === 'weight');
    if (weightMetrics.length >= 2) {
      const latestWeight = weightMetrics[0].value;
      const previousWeight = weightMetrics[1].value;
      const weightChange = Math.abs(latestWeight - previousWeight);
      
      if (weightChange > 2) {
        alerts.push({
          id: 'weight-change',
          type: 'metric',
          severity: 'low',
          message: `Significant weight change detected (${weightChange.toFixed(1)} kg)`,
          recommendation: 'Consider reviewing your diet and exercise routine.',
          created_at: weightMetrics[0].measured_at
        });
      }
    }

    return alerts;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleToggleAssessmentForm = () => {
    setShowAssessmentForm(!showAssessmentForm);
    setAssessmentStep(1);
  };

  const handleCheckboxChange = (category: keyof Pick<AssessmentFormData, 'symptoms' | 'lifestyle' | 'goals'>, value: string) => {
    setAssessmentFormData(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [category, field] = name.split('.');
      setAssessmentFormData(prev => ({
        ...prev,
        [category]: {
          ...prev[category as keyof AssessmentFormData],
          [field]: value
        }
      }));
    }
  };

  const handleNextStep = () => {
    setAssessmentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setAssessmentStep(prev => prev - 1);
  };

  const handleSubmitAssessment = async () => {
    if (!user?.id) return;

    try {
      setSubmittingAssessment(true);

      // Format the assessment data
      const formattedSymptoms = assessmentFormData.symptoms.join(', ');
      const formattedLifestyle = assessmentFormData.lifestyle.join(', ');
      const formattedGoals = assessmentFormData.goals.join(', ');
      
      // Create health assessment record
      const { data: assessmentData, error: assessmentError } = await supabase
        .from('health_assessments')
        .insert({
          profile_id: user.id,
          symptoms: formattedSymptoms,
          history: `Exercise: ${assessmentFormData.physicalHealth.exerciseFrequency}, Sleep: ${assessmentFormData.physicalHealth.sleepQuality}`,
          goals: formattedGoals,
          physical_health: `Energy Level: ${assessmentFormData.physicalHealth.energyLevel}, Lifestyle: ${formattedLifestyle}`,
          mental_health: `Stress: ${assessmentFormData.mentalHealth.stressLevel}, Mood: ${assessmentFormData.mentalHealth.moodStability}, Anxiety: ${assessmentFormData.mentalHealth.anxietyLevel}`
        })
        .select()
        .single();

      if (assessmentError) throw assessmentError;

      // Create health metrics records
      if (assessmentFormData.vitalSigns.weight) {
        const { error: weightError } = await supabase
          .from('health_metrics')
          .insert({
            profile_id: user.id,
            metric_type: 'weight',
            value: parseFloat(assessmentFormData.vitalSigns.weight),
            unit: 'kg',
            measured_at: new Date().toISOString()
          });

        if (weightError) throw weightError;
      }

      if (assessmentFormData.vitalSigns.restingHeartRate) {
        const { error: hrError } = await supabase
          .from('health_metrics')
          .insert({
            profile_id: user.id,
            metric_type: 'heart_rate',
            value: parseFloat(assessmentFormData.vitalSigns.restingHeartRate),
            unit: 'bpm',
            measured_at: new Date().toISOString()
          });

        if (hrError) throw hrError;
      }

      // Create vital signs record
      if (assessmentFormData.vitalSigns.bloodPressure) {
        const { error: vitalsError } = await supabase
          .from('vital_signs')
          .insert({
            profile_id: user.id,
            heart_rate: assessmentFormData.vitalSigns.restingHeartRate ? parseFloat(assessmentFormData.vitalSigns.restingHeartRate) : null,
            blood_pressure: assessmentFormData.vitalSigns.bloodPressure,
            temperature: 36.8, // Default normal temperature
            measured_at: new Date().toISOString()
          });

        if (vitalsError) throw vitalsError;
      }

      toast.success('Health assessment submitted successfully!');
      setShowAssessmentForm(false);
      setAssessmentStep(1);
      
      // Reset form data
      setAssessmentFormData({
        symptoms: [],
        lifestyle: [],
        goals: [],
        physicalHealth: {
          exerciseFrequency: '',
          sleepQuality: '',
          energyLevel: '',
        },
        mentalHealth: {
          stressLevel: '',
          moodStability: '',
          anxietyLevel: '',
        },
        vitalSigns: {
          weight: '',
          height: '',
          bloodPressure: '',
          restingHeartRate: '',
        }
      });
      
      // Reload data to show new assessment
      loadData();
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Failed to submit health assessment');
    } finally {
      setSubmittingAssessment(false);
    }
  };

  const handleViewAssessment = (assessment: HealthAssessment) => {
    setSelectedAssessment(assessment);
    setShowAssessmentModal(true);
  };

  const handleDownloadAssessment = (assessment: HealthAssessment) => {
    // Create a formatted text version of the assessment
    const assessmentText = `
VITALÉ HEALTH CONCIERGE
HEALTH ASSESSMENT REPORT
Date: ${new Date(assessment.created_at).toLocaleDateString()}

SYMPTOMS:
${assessment.symptoms || 'None reported'}

HEALTH HISTORY:
${assessment.history || 'None reported'}

HEALTH GOALS:
${assessment.goals || 'None specified'}

PHYSICAL HEALTH:
${assessment.physical_health || 'No data'}

MENTAL HEALTH:
${assessment.mental_health || 'No data'}

This report is confidential and intended for personal use only.
Generated on: ${new Date().toLocaleString()}
    `;

    // Create a blob and download link
    const blob = new Blob([assessmentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `health-assessment-${new Date(assessment.created_at).toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success('Assessment downloaded successfully');
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

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

  const renderAssessmentForm = () => {
    switch (assessmentStep) {
      case 1: // Describe
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Brain className="h-12 w-12 text-gold-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-navy-900">Current Symptoms</h3>
              <p className="text-navy-600">Select any symptoms you're currently experiencing</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {symptoms.map(symptom => (
                <label key={symptom} className="flex items-center p-4 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assessmentFormData.symptoms.includes(symptom)}
                    onChange={() => handleCheckboxChange('symptoms', symptom)}
                    className="rounded border-gray-300 text-gold-500 focus:ring-gold-500"
                  />
                  <span className="ml-3 text-navy-900">{symptom}</span>
                </label>
              ))}
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleNextStep}
                variant="luxury"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Activity className="h-12 w-12 text-gold-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-navy-900">Lifestyle & Physical Health</h3>
              <p className="text-navy-600">Tell us about your physical health and lifestyle</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-navy-900">Lifestyle Factors</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lifestyleFactors.map(factor => (
                  <label key={factor} className="flex items-center p-4 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentFormData.lifestyle.includes(factor)}
                      onChange={() => handleCheckboxChange('lifestyle', factor)}
                      className="rounded border-gray-300 text-gold-500 focus:ring-gold-500"
                    />
                    <span className="ml-3 text-navy-900">{factor}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-navy-900">Physical Health</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Exercise Frequency
                  </label>
                  <select
                    name="physicalHealth.exerciseFrequency"
                    value={assessmentFormData.physicalHealth.exerciseFrequency}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select frequency</option>
                    <option value="Never">Never</option>
                    <option value="1-2 times/week">1-2 times/week</option>
                    <option value="3-4 times/week">3-4 times/week</option>
                    <option value="5+ times/week">5+ times/week</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Sleep Quality
                  </label>
                  <select
                    name="physicalHealth.sleepQuality"
                    value={assessmentFormData.physicalHealth.sleepQuality}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select quality</option>
                    <option value="Poor">Poor</option>
                    <option value="Fair">Fair</option>
                    <option value="Good">Good</option>
                    <option value="Excellent">Excellent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Energy Level
                  </label>
                  <select
                    name="physicalHealth.energyLevel"
                    value={assessmentFormData.physicalHealth.energyLevel}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select energy level</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                onClick={handlePrevStep}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={handleNextStep}
                variant="luxury"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        );
      
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Brain className="h-12 w-12 text-gold-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-navy-900">Mental Health</h3>
              <p className="text-navy-600">Help us understand your mental wellbeing</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Stress Level
                  </label>
                  <select
                    name="mentalHealth.stressLevel"
                    value={assessmentFormData.mentalHealth.stressLevel}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select stress level</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Mood Stability
                  </label>
                  <select
                    name="mentalHealth.moodStability"
                    value={assessmentFormData.mentalHealth.moodStability}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select mood stability</option>
                    <option value="Very Stable">Very Stable</option>
                    <option value="Stable">Stable</option>
                    <option value="Somewhat Unstable">Somewhat Unstable</option>
                    <option value="Unstable">Unstable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Anxiety Level
                  </label>
                  <select
                    name="mentalHealth.anxietyLevel"
                    value={assessmentFormData.mentalHealth.anxietyLevel}
                    onChange={handleInputChange}
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  >
                    <option value="">Select anxiety level</option>
                    <option value="Low">Low</option>
                    <option value="Moderate">Moderate</option>
                    <option value="High">High</option>
                    <option value="Very High">Very High</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                onClick={handlePrevStep}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={handleNextStep}
                variant="luxury"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        );
      
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Heart className="h-12 w-12 text-gold-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-navy-900">Health Goals & Vital Signs</h3>
              <p className="text-navy-600">Tell us about your health goals and current vital signs</p>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-navy-900">Health Goals</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {healthGoals.map(goal => (
                  <label key={goal} className="flex items-center p-4 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assessmentFormData.goals.includes(goal)}
                      onChange={() => handleCheckboxChange('goals', goal)}
                      className="rounded border-gray-300 text-gold-500 focus:ring-gold-500"
                    />
                    <span className="ml-3 text-navy-900">{goal}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-navy-900">Vital Signs (Optional)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    name="vitalSigns.weight"
                    value={assessmentFormData.vitalSigns.weight}
                    onChange={handleInputChange}
                    placeholder="Enter your weight"
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    name="vitalSigns.height"
                    value={assessmentFormData.vitalSigns.height}
                    onChange={handleInputChange}
                    placeholder="Enter your height"
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Blood Pressure (e.g., 120/80)
                  </label>
                  <input
                    type="text"
                    name="vitalSigns.bloodPressure"
                    value={assessmentFormData.vitalSigns.bloodPressure}
                    onChange={handleInputChange}
                    placeholder="Enter your blood pressure"
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Resting Heart Rate (bpm)
                  </label>
                  <input
                    type="number"
                    name="vitalSigns.restingHeartRate"
                    value={assessmentFormData.vitalSigns.restingHeartRate}
                    onChange={handleInputChange}
                    placeholder="Enter your resting heart rate"
                    className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-gold-500 focus:ring-gold-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button
                onClick={handlePrevStep}
                variant="outline"
              >
                Back
              </Button>
              <Button
                onClick={handleSubmitAssessment}
                variant="luxury"
                isLoading={submittingAssessment}
              >
                Submit Assessment
                <CheckCircle className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  if (loading) {
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
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <div className="flex items-center space-x-3 mb-4">
                <Activity className="h-8 w-8 text-gold-500" />
                <h1 className="text-2xl font-display font-bold text-navy-900">Health Insights</h1>
              </div>
              <p className="text-navy-600">
                Your personalized health insights and recommendations
              </p>
            </div>

            {/* Health Assessment Section */}
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <Brain className="h-6 w-6 text-gold-500 mr-2" />
                  <h2 className="text-xl font-semibold text-navy-900">Health Assessment</h2>
                </div>
                <Button
                  variant="luxury"
                  onClick={handleToggleAssessmentForm}
                >
                  {showAssessmentForm ? 'Cancel' : 'Take New Assessment'}
                  {!showAssessmentForm && <Plus className="ml-2 h-5 w-5" />}
                </Button>
              </div>

              {showAssessmentForm ? (
                <div ref={assessmentFormRef} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="mb-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-navy-900">Complete Your Health Assessment</h3>
                      <div className="text-sm text-navy-600">Step {assessmentStep} of 4</div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
                      <div 
                        className="bg-gold-500 h-2.5 rounded-full transition-all duration-300" 
                        style={{ width: `${(assessmentStep / 4) * 100}%` }}
                      ></div>
                    </div>
                    
                    {renderAssessmentForm()}
                  </div>
                </div>
              ) : (
                <>
                  {assessment ? (
                    <div className="bg-navy-50 rounded-lg p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-medium text-navy-900">Latest Assessment</h3>
                          <p className="text-sm text-navy-600">
                            Completed on {new Date(assessment.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAssessment(assessment)}
                        >
                          View Details
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                        <div>
                          <h4 className="font-medium text-navy-900 mb-2">Symptoms</h4>
                          <p className="text-navy-600">{assessment.symptoms || 'None reported'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-navy-900 mb-2">Goals</h4>
                          <p className="text-navy-600">{assessment.goals || 'None specified'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-navy-900 mb-2">Physical Health</h4>
                          <p className="text-navy-600">{assessment.physical_health || 'No data'}</p>
                        </div>
                        <div>
                          <h4 className="font-medium text-navy-900 mb-2">Mental Health</h4>
                          <p className="text-navy-600">{assessment.mental_health || 'No data'}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-navy-50 rounded-lg">
                      <Brain className="h-12 w-12 text-navy-300 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-navy-900 mb-2">No Assessments Yet</h3>
                      <p className="text-navy-600 mb-4">
                        Complete your first health assessment to receive personalized insights.
                      </p>
                      <Button
                        variant="luxury"
                        onClick={handleToggleAssessmentForm}
                      >
                        Start Health Assessment
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Assessment History */}
            {assessments.length > 0 && (
              <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
                <div className="flex items-center mb-6">
                  <FileText className="h-6 w-6 text-gold-500 mr-2" />
                  <h2 className="text-xl font-semibold text-navy-900">Assessment History</h2>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-navy-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Symptoms</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-navy-700 uppercase tracking-wider">Goals</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-navy-700 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {assessments.map((assessment) => (
                        <tr key={assessment.id} className="hover:bg-navy-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Calendar className="h-5 w-5 text-navy-400 mr-2" />
                              <span className="text-navy-900">{new Date(assessment.created_at).toLocaleDateString()}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-navy-600 truncate max-w-xs">{assessment.symptoms || 'None reported'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-navy-600 truncate max-w-xs">{assessment.goals || 'None specified'}</p>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAssessment(assessment)}
                              className="mr-2"
                            >
                              View Details
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownloadAssessment(assessment)}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Health Categories */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Physical Health */}
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <div className="flex items-center mb-4">
                  <Heart className="h-6 w-6 text-gold-500 mr-2" />
                  <h2 className="text-xl font-semibold text-navy-900">Physical Health</h2>
                </div>
                {assessment ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Exercise Frequency</span>
                      <span className="font-medium text-navy-900">
                        {assessment.physical_health}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Goals</span>
                      <span className="font-medium text-navy-900">
                        {assessment.goals}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">History</span>
                      <span className="font-medium text-navy-900">
                        {assessment.history}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-navy-600">No assessment data available</p>
                  </div>
                )}
              </div>

              {/* Mental Health */}
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <div className="flex items-center mb-4">
                  <Brain className="h-6 w-6 text-gold-500 mr-2" />
                  <h2 className="text-xl font-semibold text-navy-900">Mental Health</h2>
                </div>
                {assessment ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Mental State</span>
                      <span className="font-medium text-navy-900">
                        {assessment.mental_health}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Symptoms</span>
                      <span className="font-medium text-navy-900">
                        {assessment.symptoms}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-navy-600">No assessment data available</p>
                  </div>
                )}
              </div>

              {/* Vital Signs */}
              <div className="bg-white rounded-xl shadow-luxury p-6">
                <div className="flex items-center mb-4">
                  <Activity className="h-6 w-6 text-gold-500 mr-2" />
                  <h2 className="text-xl font-semibold text-navy-900">Vital Signs</h2>
                </div>
                {vitalSigns.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Temperature</span>
                      <span className="font-medium text-navy-900">
                        {vitalSigns[0].temperature.toFixed(1)}°C
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Heart Rate</span>
                      <span className="font-medium text-navy-900">
                        {vitalSigns[0].heart_rate} bpm
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-navy-600">Blood Pressure</span>
                      <span className="font-medium text-navy-900">
                        {vitalSigns[0].blood_pressure}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-navy-600">No vital signs data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Active Alerts */}
            <div className="bg-white rounded-xl shadow-luxury p-6 mb-8">
              <div className="flex items-center mb-6">
                <AlertCircle className="h-6 w-6 text-gold-500 mr-2" />
                <h2 className="text-xl font-semibold text-navy-900">Active Alerts</h2>
              </div>

              <div className="space-y-4">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-navy-900">{alert.message}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-navy-600 text-sm mb-3">{alert.recommendation}</p>
                    <p className="text-xs text-navy-500">
                      Detected {new Date(alert.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-4">
                    <p className="text-navy-600">No active alerts</p>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Chart */}
            <div className="bg-white rounded-xl shadow-luxury p-6">
              <div className="flex items-center mb-6">
                <Activity className="h-6 w-6 text-gold-500 mr-2" />
                <h2 className="text-xl font-semibold text-navy-900">Health Metrics</h2>
              </div>

              <div className="h-[300px]">
                {metrics.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={metrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="measured_at" 
                        tickFormatter={(date) => new Date(date).toLocaleDateString()}
                      />
                      <YAxis />
                      <Tooltip 
                        labelFormatter={(date) => new Date(date).toLocaleDateString()}
                        formatter={(value: any) => [`${value} ${metrics[0]?.unit}`, metrics[0]?.metric_type]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#059669"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-navy-600">No metric data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Assessment Details Modal */}
            {showAssessmentModal && selectedAssessment && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-navy-900">Health Assessment Details</h3>
                    <button 
                      onClick={() => setShowAssessmentModal(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="bg-navy-50 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-medium text-navy-800">Assessment Summary</h4>
                        <p className="text-sm text-navy-600">
                          {new Date(selectedAssessment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-navy-500">Symptoms</p>
                          <p className="font-medium text-navy-800">{selectedAssessment.symptoms || 'None reported'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Goals</p>
                          <p className="font-medium text-navy-800">{selectedAssessment.goals || 'None specified'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Physical Health</p>
                          <p className="font-medium text-navy-800">{selectedAssessment.physical_health || 'No data'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Mental Health</p>
                          <p className="font-medium text-navy-800">{selectedAssessment.mental_health || 'No data'}</p>
                        </div>
                        <div>
                          <p className="text-sm text-navy-500">Health History</p>
                          <p className="font-medium text-navy-800">{selectedAssessment.history || 'No data'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => handleDownloadAssessment(selectedAssessment)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>
                      <Button
                        variant="luxury"
                        onClick={() => setShowAssessmentModal(false)}
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

const symptoms = [
  'Fatigue',
  'Stress',
  'Sleep Issues',
  'Digestive Problems',
  'Joint Pain',
  'Headaches',
  'Anxiety',
  'Weight Management',
  'Chronic Pain',
  'Allergies',
  'High Blood Pressure',
  'Diabetes',
];

const lifestyleFactors = [
  'Sedentary Work',
  'Regular Exercise',
  'Balanced Diet',
  'Smoking',
  'Alcohol Consumption',
  'High Stress',
  'Poor Sleep',
  'Travel Frequently',
  'Irregular Meals',
  'High Screen Time',
];

const healthGoals = [
  'Improve Overall Health',
  'Increase Energy Levels',
  'Better Stress Management',
  'Weight Loss',
  'Better Sleep Quality',
  'Preventive Care',
  'Chronic Condition Management',
  'Mental Health Support',
  'Family Health Planning',
  'Executive Health Program',
];