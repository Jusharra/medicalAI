import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Shield, 
  Check, 
  Clock, 
  Star,
  Calendar,
  Sparkles,
  DollarSign,
  ArrowRight,
  Bot,
  Heart,
  Globe2,
  Activity,
  CreditCard,
  BadgeCheck
} from 'lucide-react';
import Button from '../components/ui/Button';

function Membership() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<HTMLDivElement>(null);
  
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80",
      title: "Choose Your Membership",
      subtitle: "Experience Healthcare Excellence"
    },
    {
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2000&q=80",
      title: "Premium Healthcare Plans",
      subtitle: "Tailored to Your Needs"
    },
    {
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=2000&q=80",
      title: "Exclusive Benefits",
      subtitle: "For Discerning Members"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    // Initialize chat agent
    window.addEventListener("DOMContentLoaded", function() {
      if (window.AgentInitializer) {
        window.AgentInitializer.init({
          agentRenderURL: "https://agent.jotform.com/0195a1e604707428b0efde3270f50aeaabec",
          rootId: "JotformAgent-0195a1e604707428b0efde3270f50aeaabec",
          formID: "0195a1e604707428b0efde3270f50aeaabec",
          queryParams: ["skipWelcome=1", "maximizable=1"],
          domain: "https://www.jotform.com",
          isDraggable: false,
          background: "linear-gradient(180deg, #3A5800 0%, #3A5800 100%)",
          buttonBackgroundColor: "#004BB6",
          buttonIconColor: "#F8FEEC",
          variant: false,
          customizations: {
            "greeting": "Yes",
            "greetingMessage": "Hi! How can I assist you?",
            "openByDefault": "No",
            "pulse": "Yes",
            "position": "right",
            "autoOpenChatIn": "5000"
          },
          isVoice: undefined
        });
      }
    });

    // Load Stripe script
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/pricing-table.js';
    script.async = true;
    document.body.appendChild(script);

    // Initialize Stripe pricing table after script loads
    script.onload = () => {
      if (stripeRef.current) {
        // Clear any existing content first
        stripeRef.current.innerHTML = '';
        
        const pricingTable = document.createElement('stripe-pricing-table');
        pricingTable.setAttribute('pricing-table-id', 'prctbl_1RB7p1HHkjtRxo3rHozRRKPo');
        pricingTable.setAttribute('publishable-key', 'pk_test_NlMnlSdLSfckmpC58kOu1VGC00G8Yl9IWC');
        stripeRef.current.appendChild(pricingTable);
      }
    };

    // Cleanup function
    return () => {
      if (script && document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

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
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {slides[currentSlide].title}
              <span className="block text-[#ffc30f] mt-2">{slides[currentSlide].subtitle}</span>
            </h1>
            <p className="mt-6 text-xl text-white/90 max-w-3xl mx-auto font-light">
              Join the elite circle of members who enjoy unparalleled access to premium healthcare services and exclusive benefits.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              {membershipHighlights.map((highlight) => (
                <div key={highlight} className="flex items-center text-white/80">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2" />
                  <span>{highlight}</span>
                </div>
              ))}
            </div>
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

      {/* Membership Plans */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-block bg-gold-100 text-gold-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
              Limited Time Offer
            </div>
            <h2 className="text-3xl font-display font-bold text-navy-900 mb-4">
              Select Your Membership Level
            </h2>
            <p className="text-lg text-navy-600">
              Your investment is fully protected by our 30-day money-back guarantee
            </p>
          </div>

          <div className="mt-12" ref={stripeRef}>
            <script async src="https://js.stripe.com/v3/pricing-table.js"></script>
            <stripe-pricing-table pricing-table-id="prctbl_1RB7p1HHkjtRxo3rHozRRKPo"
            publishable-key="pk_test_NlMnlSdLSfckmpC58kOu1VGC00G8Yl9IWC">
            </stripe-pricing-table>
          </div>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="py-24 bg-navy-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-navy-900">
              Premium Benefits
            </h2>
            <p className="mt-4 text-lg text-navy-600">
              Experience a comprehensive suite of exclusive services and privileges
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-white rounded-xl shadow-luxury p-8 hover:shadow-luxury-lg transition-all duration-300">
                <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-navy-900 mb-6">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-navy-900 mb-4">{benefit.title}</h3>
                <ul className="space-y-3">
                  {benefit.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-navy-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Financing Options Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <DollarSign className="h-16 w-16 text-[#ffc30f] mx-auto mb-6" />
            <h2 className="text-3xl font-display font-bold text-navy-900 mb-4">
              Flexible Financing Options
            </h2>
            <p className="text-lg text-navy-600">
              Don't let finances stand between you and premium healthcare
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-xl shadow-luxury p-8 hover:shadow-luxury-lg transition-all duration-300">
              <CreditCard className="h-12 w-12 text-[#ffc30f] mb-6" />
              <h3 className="text-xl font-semibold text-navy-900 mb-4">0% APR Financing</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  0% APR for 12-36 months
                </li>
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  No prepayment penalties
                </li>
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  Quick online application
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-luxury p-8 hover:shadow-luxury-lg transition-all duration-300">
              <BadgeCheck className="h-12 w-12 text-[#ffc30f] mb-6" />
              <h3 className="text-xl font-semibold text-navy-900 mb-4">Flexible Terms</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  Monthly payments from $199
                </li>
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  Customizable terms
                </li>
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  No hidden fees
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-xl shadow-luxury p-8 hover:shadow-luxury-lg transition-all duration-300">
              <DollarSign className="h-12 w-12 text-[#ffc30f] mb-6" />
              <h3 className="text-xl font-semibold text-navy-900 mb-4">HSA/FSA Accepted</h3>
              <ul className="space-y-3 mb-6">
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  Tax-advantaged payments
                </li>
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  Compatible with most plans
                </li>
                <li className="flex items-center text-navy-600">
                  <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0" />
                  Automatic payments
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Link to="/financing">
              <Button variant="luxury" size="lg" className="px-8">
                Explore Financing Options
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="py-24 bg-luxury-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Bot className="h-16 w-16 text-[#ffc30f] mx-auto mb-6" />
            <h2 className="text-3xl font-display font-bold text-white mb-4">
              24/7 AI Health Concierge
            </h2>
            <p className="text-xl text-[#ffc30f]">
              Your personal health assistant powered by advanced medical AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {aiFeatures.map((feature) => (
              <div key={feature.title} className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <feature.icon className="h-10 w-10 text-[#ffc30f] mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Guarantee Section */}
      <div className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-luxury-gradient rounded-xl p-8 shadow-luxury text-center">
            <Shield className="h-16 w-16 text-[#ffc30f] mx-auto mb-6" />
            <h2 className="text-2xl font-display font-bold text-white mb-4">
              Our Risk-Free Guarantee
            </h2>
            <p className="text-xl text-[#ffc30f] mb-8">
              If you're not completely satisfied with our service within the first 30 days, we'll refund your investment in full. No questions asked.
            </p>
            <Link to="/assessment">
              <Button variant="luxury" size="lg" className="px-8">
                Get Started Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const membershipHighlights = [
  '24/7 Medical Support',
  'Priority Specialist Access',
  'Global Coverage',
  'Luxury Travel Benefits',
];

const benefits = [
  {
    title: 'Healthcare Excellence',
    icon: Heart,
    features: [
      'Priority Access to Specialists',
      'Personal Medical Concierge',
      '24/7 Emergency Support',
      'Global Healthcare Coverage',
    ],
  },
  {
    title: 'Luxury Travel',
    icon: Globe2,
    features: [
      'Complimentary Vacation Package',
      '$500 Hotel Vouchers',
      'VIP Airport Services',
      'Global Medical Transport',
    ],
  },
  {
    title: 'Wellness Benefits',
    icon: Activity,
    features: [
      'Exclusive Wellness Retreats',
      'Spa & Recovery Services',
      'Personal Training Sessions',
      'Nutrition Consultation',
    ],
  },
];

const aiFeatures = [
  {
    title: 'Instant Health Guidance',
    description: 'Get immediate answers to your health questions and personalized recommendations.',
    icon: Bot,
  },
  {
    title: 'Smart Monitoring',
    description: 'AI-powered tracking of your vital signs and health metrics with real-time alerts.',
    icon: Activity,
  },
  {
    title: 'Seamless Coordination',
    description: 'Effortless appointment scheduling and care plan management with your healthcare team.',
    icon: Calendar,
  },
];

export default Membership;