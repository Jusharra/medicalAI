import { useState, useEffect, useRef } from 'react';
import { 
  Stethoscope, 
  Brain, 
  HeartPulse, 
  Clock, 
  Shield, 
  Users, 
  Globe2, 
  Laptop, 
  Phone, 
  MessageSquare, 
  Activity, 
  FileText,
  Plane,
  Hotel,
  Gift,
  Sparkles,
  Bot,
  Star
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function MemberBenefits() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  const stripeRef = useRef<HTMLDivElement>(null);
  
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80",
      title: "Exclusive Member Benefits",
      subtitle: "A New Standard of Luxury Healthcare"
    },
    {
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2000&q=80",
      title: "Premium Healthcare Benefits",
      subtitle: "Experience Excellence in Care"
    },
    {
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=2000&q=80",
      title: "Luxury Travel Benefits",
      subtitle: "Global Coverage & Exclusive Access"
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
    <div className="bg-white">
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
              Experience unparalleled access to premium healthcare services, luxury travel benefits, and personalized care coordination.
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

      {/* Value Proposition */}
      <div className="py-16 bg-navy-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-navy-900">Why Choose Vitalé Health Concierge?</h2>
            <p className="mt-4 text-xl text-navy-600">
              Experience healthcare that goes beyond medical services – we're redefining what premium healthcare means.
            </p>
          </div>
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="bg-white rounded-xl shadow-luxury hover:shadow-luxury-lg transition-all duration-300 p-8 text-center">
              <Shield className="h-12 w-12 text-[#ffc30f] mx-auto" />
              <h3 className="mt-4 text-xl font-semibold text-navy-900">Premium Protection</h3>
              <p className="mt-2 text-navy-600">
                Comprehensive healthcare coverage with priority access to top specialists worldwide.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-luxury hover:shadow-luxury-lg transition-all duration-300 p-8 text-center">
              <Gift className="h-12 w-12 text-[#ffc30f] mx-auto" />
              <h3 className="mt-4 text-xl font-semibold text-navy-900">Exclusive Rewards</h3>
              <p className="mt-2 text-navy-600">
                Luxury travel perks, hotel vouchers, and wellness experiences worth over $2,000 annually.
              </p>
            </div>
            <div className="bg-white rounded-xl shadow-luxury hover:shadow-luxury-lg transition-all duration-300 p-8 text-center">
              <Brain className="h-12 w-12 text-[#ffc30f] mx-auto" />
              <h3 className="mt-4 text-xl font-semibold text-navy-900">AI-Powered Care</h3>
              <p className="mt-2 text-navy-600">
                24/7 access to advanced AI health monitoring and personalized wellness insights.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Annual Membership Highlight */}
      <div className="py-24 bg-luxury-gradient text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Sparkles className="h-16 w-16 text-[#ffc30f] mx-auto mb-6" />
            <h2 className="text-3xl font-display font-bold mb-6">Annual Membership Exclusive Benefits</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-12">
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <Plane className="h-10 w-10 text-[#ffc30f] mb-4 mx-auto" />
                <h3 className="text-xl font-semibold mb-2">Complimentary Vacation</h3>
                <p className="text-white/80">Choose from 119 luxury destinations worldwide for a FREE vacation stay annually.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <Hotel className="h-10 w-10 text-[#ffc30f] mb-4 mx-auto" />
                <h3 className="text-xl font-semibold mb-2">$500 Hotel Vouchers</h3>
                <p className="text-white/80">Enjoy premium accommodations during medical visits or personal getaways.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-8">
                <Activity className="h-10 w-10 text-[#ffc30f] mb-4 mx-auto" />
                <h3 className="text-xl font-semibold mb-2">20% Service Discount</h3>
                <p className="text-white/80">Save on all medical services and procedures year-round.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Features */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-navy-900">Premium Healthcare Benefits</h2>
            <p className="mt-4 text-lg text-navy-600 max-w-3xl mx-auto">
              Experience healthcare excellence with our comprehensive suite of services
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {coreFeatures.map((feature) => (
              <div key={feature.name} className="bg-white rounded-xl shadow-luxury p-8 hover:shadow-luxury-lg transition-all duration-300">
                <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-navy-900 mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-semibold text-navy-900">{feature.name}</h3>
                <p className="mt-4 text-navy-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Membership Plans */}
      <div className="py-24 bg-navy-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-display font-bold text-navy-900">Choose Your Membership</h2>
            <p className="mt-4 text-lg text-navy-600">
              Select the perfect plan for your healthcare needs
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

      {/* Call to Action */}
      <div className="bg-luxury-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Begin Your Premium Healthcare Journey
          </h2>
          <p className="text-xl text-[#ffc30f] mb-8">
            Join our exclusive membership and experience healthcare like never before
          </p>
          <Link to="/membership">
            <Button variant="luxury" size="lg" className="text-lg px-8 py-4">
              Become a Member
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const coreFeatures = [
  {
    name: 'AI-Powered Health Assistant',
    description: 'Advanced artificial intelligence that learns your health patterns and provides personalized recommendations and insights.',
    icon: <Brain className="h-6 w-6" />,
  },
  {
    name: '24/7 Medical Support',
    description: 'Round-the-clock access to healthcare professionals for immediate medical guidance and support.',
    icon: <Clock className="h-6 w-6" />,
  },
  {
    name: 'Secure Health Records',
    description: 'Military-grade encryption protecting your medical data while providing seamless access to your health information.',
    icon: <Shield className="h-6 w-6" />,
  },
  {
    name: 'Family Health Management',
    description: 'Comprehensive tools to manage the health of your entire family from one convenient dashboard.',
    icon: <Users className="h-6 w-6" />,
  },
  {
    name: 'Global Provider Network',
    description: 'Access to an extensive network of healthcare providers worldwide, carefully vetted for excellence.',
    icon: <Globe2 className="h-6 w-6" />,
  },
  {
    name: 'Telemedicine Integration',
    description: 'Seamless virtual consultations with healthcare providers through our secure platform.',
    icon: <Laptop className="h-6 w-6" />,
  },
];