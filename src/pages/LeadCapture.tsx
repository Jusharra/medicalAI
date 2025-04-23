import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { Brain, Shield, Activity, Star, Bot, Heart, ArrowRight } from 'lucide-react';

interface HealthAssessment {
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

function LeadCapture() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [assessment, setAssessment] = useState<HealthAssessment>({
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

  const slides = [
    {
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=2000&q=80",
      title: "AI Health Assessment",
      subtitle: "Your Path to Premium Care"
    },
    {
      image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=2000&q=80",
      title: "Personalized Health Analysis",
      subtitle: "Powered by Advanced AI"
    },
    {
      image: "https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?auto=format&fit=crop&w=2000&q=80",
      title: "Comprehensive Evaluation",
      subtitle: "Tailored to Your Needs"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [category, field] = name.split('.');
      setAssessment(prev => ({
        ...prev,
        [category]: {
          ...prev[category as keyof HealthAssessment],
          [field]: value
        }
      }));
    } else if (name.startsWith('form.')) {
      const field = name.replace('form.', '');
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCheckboxChange = (category: keyof Pick<HealthAssessment, 'symptoms' | 'lifestyle' | 'goals'>, value: string) => {
    setAssessment(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(item => item !== value)
        : [...prev[category], value]
    }));
  };

  const calculateEngagementScore = (assessment: HealthAssessment): number => {
    let score = 0;
    score += assessment.symptoms.length * 2; // Higher weight for symptoms
    score += assessment.lifestyle.length;
    score += assessment.goals.length * 1.5; // Higher weight for goals
    
    // Add scores for physical health
    if (assessment.physicalHealth.exerciseFrequency) score += 5;
    if (assessment.physicalHealth.sleepQuality) score += 5;
    if (assessment.physicalHealth.energyLevel) score += 5;
    
    // Add scores for mental health
    if (assessment.mentalHealth.stressLevel) score += 5;
    if (assessment.mentalHealth.moodStability) score += 5;
    if (assessment.mentalHealth.anxietyLevel) score += 5;
    
    // Add scores for vital signs
    if (assessment.vitalSigns.weight) score += 2;
    if (assessment.vitalSigns.height) score += 2;
    if (assessment.vitalSigns.bloodPressure) score += 3;
    if (assessment.vitalSigns.restingHeartRate) score += 3;
    
    return Math.min(score, 100); // Cap at 100
  };

  const generateAIRecommendations = (assessment: HealthAssessment): string => {
    const highPrioritySymptoms = assessment.symptoms.length >= 3;
    const lifestyleConcerns = assessment.lifestyle.includes('High Stress') || 
                             assessment.lifestyle.includes('Poor Sleep');
    const mentalHealthConcerns = assessment.mentalHealth.stressLevel === 'High' ||
                                assessment.mentalHealth.anxietyLevel === 'High';
    
    if (highPrioritySymptoms && (lifestyleConcerns || mentalHealthConcerns)) {
      return "Based on your comprehensive assessment, I strongly recommend our Elite Care membership. Your combination of symptoms, lifestyle factors, and current health status suggests you would benefit from our most comprehensive care package, including priority specialist access and advanced wellness programs.";
    } else if (highPrioritySymptoms || lifestyleConcerns || mentalHealthConcerns) {
      return "Based on your assessment, our Premium Care membership would be ideal, offering the comprehensive health monitoring and priority access to specialists you need.";
    }
    return "Our Essential Care membership would be an excellent foundation for your preventive health goals, providing the support and guidance you need to maintain optimal wellness.";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 4) {
      setStep(step + 1);
      return;
    }

    try {
      setLoading(true);

      // Create interaction record
      const { data: interactionData, error: interactionError } = await supabase
        .from('lead_interactions')
        .insert({
          lead_id: formData.email,
          interaction_type: 'assessment',
          content: {
            ...assessment,
            personal_info: {
              firstName: formData.firstName,
              lastName: formData.lastName,
              phone: formData.phone
            }
          },
          engagement_score: calculateEngagementScore(assessment),
          ai_response: generateAIRecommendations(assessment)
        })
        .select()
        .single();

      if (interactionError) throw interactionError;

      toast.success('Your health assessment has been completed!');
      navigate('/membership');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error('Error submitting assessment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className="text-center mb-8">
              <Brain className="h-12 w-12 text-[#ffc30f] mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-navy-900">
                Start Your Assessment
              </h2>
              <p className="mt-2 text-navy-600">
                Let our AI analyze your health profile
              </p>
            </div>

            <Input
              label="Email"
              name="form.email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="Enter your email"
            />
            <Input
              label="First Name"
              name="form.firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              required
              placeholder="Enter your first name"
            />
            <Input
              label="Last Name"
              name="form.lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              required
              placeholder="Enter your last name"
            />
            <Input
              label="Phone"
              name="form.phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
            />
          </>
        );

      case 2:
        return (
          <>
            <div className="text-center mb-8">
              <Activity className="h-12 w-12 text-[#ffc30f] mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-navy-900">
                Physical Health Assessment
              </h2>
              <p className="mt-2 text-navy-600">
                Help us understand your physical health status
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-4">Vital Signs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Weight (lbs)"
                    name="vitalSigns.weight"
                    type="number"
                    value={assessment.vitalSigns.weight}
                    onChange={handleInputChange}
                    placeholder="Enter your weight"
                  />
                  <Input
                    label="Height (inches)"
                    name="vitalSigns.height"
                    type="number"
                    value={assessment.vitalSigns.height}
                    onChange={handleInputChange}
                    placeholder="Enter your height"
                  />
                  <Input
                    label="Blood Pressure (e.g., 120/80)"
                    name="vitalSigns.bloodPressure"
                    value={assessment.vitalSigns.bloodPressure}
                    onChange={handleInputChange}
                    placeholder="Enter your blood pressure"
                  />
                  <Input
                    label="Resting Heart Rate (bpm)"
                    name="vitalSigns.restingHeartRate"
                    type="number"
                    value={assessment.vitalSigns.restingHeartRate}
                    onChange={handleInputChange}
                    placeholder="Enter your resting heart rate"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-4">Physical Activity</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-2">
                      Exercise Frequency
                    </label>
                    <select
                      name="physicalHealth.exerciseFrequency"
                      value={assessment.physicalHealth.exerciseFrequency}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
                    >
                      <option value="">Select frequency</option>
                      <option value="Never">Never</option>
                      <option value="1-2 times/week">1-2 times/week</option>
                      <option value="3-4 times/week">3-4 times/week</option>
                      <option value="5+ times/week">5+ times/week</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-2">
                      Sleep Quality
                    </label>
                    <select
                      name="physicalHealth.sleepQuality"
                      value={assessment.physicalHealth.sleepQuality}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
                    >
                      <option value="">Select quality</option>
                      <option value="Poor">Poor</option>
                      <option value="Fair">Fair</option>
                      <option value="Good">Good</option>
                      <option value="Excellent">Excellent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-2">
                      Energy Level
                    </label>
                    <select
                      name="physicalHealth.energyLevel"
                      value={assessment.physicalHealth.energyLevel}
                      onChange={handleInputChange}
                      className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
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
            </div>
          </>
        );

      case 3:
        return (
          <>
            <div className="text-center mb-8">
              <Brain className="h-12 w-12 text-[#ffc30f] mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-navy-900">
                Mental Health Assessment
              </h2>
              <p className="mt-2 text-navy-600">
                Help us understand your mental wellbeing
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">
                  Stress Level
                </label>
                <select
                  name="mentalHealth.stressLevel"
                  value={assessment.mentalHealth.stressLevel}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
                >
                  <option value="">Select stress level</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">
                  Mood Stability
                </label>
                <select
                  name="mentalHealth.moodStability"
                  value={assessment.mentalHealth.moodStability}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
                >
                  <option value="">Select mood stability</option>
                  <option value="Very Stable">Very Stable</option>
                  <option value="Stable">Stable</option>
                  <option value="Somewhat Unstable">Somewhat Unstable</option>
                  <option value="Unstable">Unstable</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">
                  Anxiety Level
                </label>
                <select
                  name="mentalHealth.anxietyLevel"
                  value={assessment.mentalHealth.anxietyLevel}
                  onChange={handleInputChange}
                  className="block w-full rounded-lg border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
                >
                  <option value="">Select anxiety level</option>
                  <option value="Low">Low</option>
                  <option value="Moderate">Moderate</option>
                  <option value="High">High</option>
                  <option value="Very High">Very High</option>
                </select>
              </div>
            </div>
          </>
        );

      case 4:
        return (
          <>
            <div className="text-center mb-8">
              <Heart className="h-12 w-12 text-[#ffc30f] mx-auto mb-4" />
              <h2 className="text-2xl font-display font-bold text-navy-900">
                Symptoms & Goals
              </h2>
              <p className="mt-2 text-navy-600">
                Tell us about your symptoms and health goals
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Current Symptoms</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {symptoms.map(symptom => (
                    <label key={symptom} className="flex items-center p-4 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assessment.symptoms.includes(symptom)}
                        onChange={() => handleCheckboxChange('symptoms', symptom)}
                        className="rounded border-gray-300 text-[#ffc30f] focus:ring-[#ffc30f]"
                      />
                      <span className="ml-3 text-navy-900">{symptom}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Lifestyle Factors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {lifestyleFactors.map(factor => (
                    <label key={factor} className="flex items-center p-4 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assessment.lifestyle.includes(factor)}
                        onChange={() => handleCheckboxChange('lifestyle', factor)}
                        className="rounded border-gray-300 text-[#ffc30f] focus:ring-[#ffc30f]"
                      />
                      <span className="ml-3 text-navy-900">{factor}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-navy-900 mb-3">Health Goals</h3>
                <div className="grid grid-cols-1 gap-4">
                  {healthGoals.map(goal => (
                    <label key={goal} className="flex items-center p-4 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors cursor-pointer">
                      <input
                        type="checkbox"
                        checked={assessment.goals.includes(goal)}
                        onChange={() => handleCheckboxChange('goals', goal)}
                        className="rounded border-gray-300 text-[#ffc30f] focus:ring-[#ffc30f]"
                      />
                      <span className="ml-3 text-navy-900">{goal}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative min-h-[60vh] flex items-center">
        {/* Slideshow Background */}
        <div ref={slideshowRef} className="absolute inset-0 overflow-hidden">
          {slides.map((slide, index) => (
            <div 
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                currentSlide === index ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                backgroundImage: `linear-gradient(to bottom, rgba(0, 37, 100, 0.8), rgba(0, 18, 50, 0.9)), url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <Bot className="h-16 w-16 text-[#ffc30f] mx-auto mb-6" />
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {slides[currentSlide].title}
              <span className="block text-[#ffc30f] mt-2">{slides[currentSlide].subtitle}</span>
            </h1>
            <p className="mt-6 text-xl text-white/90 max-w-3xl mx-auto font-light">
              Get your personalized health report and premium care recommendations powered by advanced AI
            </p>
          </div>
        </div>

        {/* Slideshow Navigation Dots */}
        <div className="absolute bottom-8 left-0 right-0 z-10 flex justify-center space-x-2">
          {slides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-colors ${
                currentSlide === index ? 'bg-[#ffc30f]' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Assessment Form */}
      <div className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl shadow-luxury overflow-hidden">
            {/* Progress Steps */}
            <div className="px-8 pt-8">
              <div className="flex justify-between mb-8">
                {[1, 2, 3, 4].map((stepNumber) => (
                  <div
                    key={stepNumber}
                    className={`flex items-center ${
                      stepNumber < 4 ? 'flex-1' : ''
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        step >= stepNumber
                          ? 'bg-gold-gradient text-navy-900'
                          : 'bg-navy-100 text-navy-400'
                      }`}
                    >
                      {stepNumber}
                    </div>
                    {stepNumber < 4 && (
                      <div
                        className={`flex-1 h-1 mx-4 ${
                          step > stepNumber
                            ? 'bg-gold-gradient'
                            : 'bg-navy-100'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {renderStepContent()}

                <div className="flex justify-between pt-6">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep(step - 1)}
                    >
                      Back
                    </Button>
                  )}
                  <Button
                    type="submit"
                    variant="luxury"
                    className="ml-auto flex items-center"
                    isLoading={loading}
                  >
                    {step === 4 ? (
                      <>
                        Complete Assessment
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
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
  'High Stress',
  'Poor Sleep',
  'Travel Frequently',
  'Irregular Meals',
  'Alcohol Consumption',
  'Limited Physical Activity',
  'Irregular Work Hours',
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
  'Luxury Wellness Experience',
  'Global Healthcare Access',
];

export default LeadCapture;