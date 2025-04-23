import { useState, useEffect, useRef } from 'react';
import { Phone, Bot, Shield, Check, Star, Activity, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

function Landing() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=2000&q=80",
      title: "Exclusive Concierge Healthcare",
      subtitle: "For The Discerning Few"
    },
    {
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2000&q=80",
      title: "Personalized Healthcare",
      subtitle: "Tailored To Your Needs"
    },
    {
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=2000&q=80",
      title: "AI-Powered Medical Concierge",
      subtitle: "Available 24/7"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

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
                backgroundImage: `linear-gradient(to bottom, rgba(0, 178, 194, 0.8), rgba(0, 18, 50, 0.9)), url(${slide.image})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          ))}
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-24">
          <div className="text-center">
            <div className="mx-auto w-20 sm:w-40 h-20 sm:h-40 mb-6">
              <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" className="w-full h-full object-contain" />
            </div>
            <h1 className="font-display text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              {slides[currentSlide].title}
              <span className="block text-[#ffc30f] mt-2">{slides[currentSlide].subtitle}</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl md:text-2xl text-white/90 max-w-3xl mx-auto font-light">
              Experience the pinnacle of personalized medical care with 24/7 access to elite physicians and AI-powered health monitoring.
            </p>
            <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row justify-center gap-4">
              <a href="tel:+16614898106">
                <Button variant="luxury" size="lg" className="w-full sm:w-auto">
                  <Phone className="h-5 w-5 mr-2" />
                  Call Now
                </Button>
              </a>
              <Link to="/membership">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="w-full sm:w-auto bg-white/10 text-white border-white hover:bg-white/20 hover:text-white"
                >
                  View Membership Plans
                </Button>
              </Link>
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

      {/* Features Section */}
      <div className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-luxury-800">Premium Healthcare Features</h2>
            <p className="mt-4 text-base sm:text-lg text-luxury-600">
              Experience healthcare excellence with our comprehensive suite of services
            </p>
          </div>

          <div className="mt-12 sm:mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {features.map((feature) => (
              <div key={feature.title} className="bg-white rounded-xl shadow-luxury p-6 sm:p-8 hover:shadow-luxury-lg transition-all duration-300">
                <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-luxury-900 mb-6">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-luxury-800">{feature.title}</h3>
                <p className="mt-4 text-luxury-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Assistant Section */}
      <div className="py-12 sm:py-24 bg-luxury-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <Bot className="h-12 sm:h-16 w-12 sm:w-16 text-[#ffc30f] mx-auto mb-6" />
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-4">
              24/7 AI Health Concierge
            </h2>
            <p className="text-lg sm:text-xl text-[#ffc30f]">
              Your personal health assistant powered by advanced medical AI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {aiFeatures.map((feature) => (
              <div key={feature.title} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 sm:p-8">
                <feature.icon className="h-10 w-10 text-[#ffc30f] mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-white/80">{feature.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12">
            <iframe
              id="JotFormIFrame-0195a1e604707428b0efde3270f50aeaabec"
              title="Kendrick: Vitale Membership Assistant" 
              allowTransparency={true} 
              allow="geolocation; microphone; camera; fullscreen"
              src="https://agent.jotform.com/0195a1e604707428b0efde3270f50aeaabec?embedMode=iframe&background=1&shadow=1"
              frameBorder="0" 
              style={{
                minWidth: '100%',
                maxWidth: '100%',
                height: '500px',
                border: 'none',
                width: '100%'
              }}
              scrolling="no"
            />
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-12 sm:py-24 bg-luxury-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-display font-bold text-luxury-800">
              Exclusive Member Benefits
            </h2>
            <p className="mt-4 text-base sm:text-lg text-luxury-600">
              Experience unparalleled access to premium healthcare services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-white rounded-xl shadow-luxury p-6 sm:p-8 hover:shadow-luxury-lg transition-all duration-300">
                <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-luxury-900 mb-6">
                  <benefit.icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold text-luxury-800 mb-4">{benefit.title}</h3>
                <ul className="space-y-3">
                  {benefit.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-[#ffc30f] mr-2 flex-shrink-0 mt-0.5" />
                      <span className="text-luxury-600">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-luxury-gradient py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-display font-bold text-white mb-4">
            Begin Your Premium Healthcare Journey
          </h2>
          <p className="text-lg sm:text-xl text-[#ffc30f] mb-8">
            Join our exclusive membership and experience healthcare like never before
          </p>
          <Link to="/membership">
            <Button variant="luxury" size="lg" className="text-lg px-6 sm:px-8">
              Become a Member
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

const features = [
  {
    title: 'AI Health Assistant',
    description: 'Advanced artificial intelligence providing instant health guidance and personalized recommendations.',
    icon: Bot,
  },
  {
    title: '24/7 Support',
    description: 'Round-the-clock access to healthcare professionals for immediate medical guidance.',
    icon: Activity,
  },
  {
    title: 'Priority Access',
    description: 'Skip the wait with immediate access to top specialists and premium facilities.',
    icon: Star,
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

const benefits = [
  {
    title: 'Premium Healthcare',
    icon: Shield,
    features: [
      'Priority Access to Specialists',
      'Personal Medical Concierge',
      '24/7 Emergency Support',
      'Global Healthcare Coverage',
    ],
  },
  {
    title: 'AI-Powered Care',
    icon: Bot,
    features: [
      'Advanced Health Monitoring',
      'Personalized Insights',
      'Real-time Health Alerts',
      'Care Plan Optimization',
    ],
  },
  {
    title: 'Luxury Benefits',
    icon: Star,
    features: [
      'Complimentary Vacation Package',
      '$500 Hotel Vouchers',
      'VIP Airport Services',
      'Exclusive Wellness Retreats',
    ],
  },
];

export default Landing;