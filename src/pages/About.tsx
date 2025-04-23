import { useState, useEffect, useRef } from 'react';
import { Award, Heart, Shield, Users, Star, Globe2, Bot } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function About() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=2000&q=80",
      title: "About Vitalé Health Concierge",
      subtitle: "Redefining Luxury Healthcare"
    },
    {
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=2000&q=80",
      title: "Our Mission",
      subtitle: "Excellence in Healthcare"
    },
    {
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=2000&q=80",
      title: "Our Team",
      subtitle: "Dedicated Professionals"
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
              Transforming healthcare through innovative AI-powered solutions and personalized medical concierge services.
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

      {/* Mission Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-display font-bold text-navy-900">Our Mission</h2>
              <p className="mt-6 text-lg text-navy-600 leading-relaxed">
                At Vitalé Health Concierge, we believe that exceptional healthcare should be effortlessly accessible. Our mission is to revolutionize the healthcare experience by combining cutting-edge AI technology with personalized medical concierge services.
              </p>
              <p className="mt-4 text-lg text-navy-600 leading-relaxed">
                We're dedicated to making premium healthcare accessible, efficient, and tailored to each individual's needs. Through our innovative platform, we're breaking down barriers and creating a future where quality healthcare is just a touch away.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat) => (
                <div key={stat.label} className="bg-luxury-gradient rounded-xl p-6 text-center">
                  <p className="text-3xl font-display font-bold text-[#ffc30f]">{stat.value}</p>
                  <p className="mt-2 text-sm text-white font-medium uppercase tracking-wider">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Values Section */}
      <div className="bg-navy-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-navy-900">Our Core Values</h2>
            <p className="mt-4 text-lg text-navy-600 max-w-3xl mx-auto">
              These principles guide everything we do at Vitalé Health Concierge
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {values.map((value) => (
              <div key={value.name} className="bg-white rounded-xl shadow-luxury p-8 hover:shadow-luxury-lg transition-all duration-300">
                <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-navy-900 mb-6">
                  {value.icon}
                </div>
                <h3 className="text-xl font-semibold text-navy-900">{value.name}</h3>
                <p className="mt-4 text-navy-600">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Section */}
      <div className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-navy-900">Leadership Team</h2>
            <p className="mt-4 text-lg text-navy-600 max-w-3xl mx-auto">
              Meet the visionaries leading the Vitalé Health Concierge mission
            </p>
          </div>
          <div className="mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {team.map((member) => (
              <div key={member.name} className="bg-white rounded-xl shadow-luxury overflow-hidden hover:shadow-luxury-lg transition-all duration-300">
                <div className="h-64 relative">
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 to-transparent" />
                  <div className="absolute bottom-4 left-4 text-white">
                    <h3 className="text-xl font-semibold">{member.name}</h3>
                    <p className="text-[#ffc30f]">{member.role}</p>
                  </div>
                </div>
                <div className="p-6">
                  <p className="text-navy-600">{member.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-luxury-gradient py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Experience Premium Healthcare
          </h2>
          <p className="text-xl text-[#ffc30f] mb-8">
            Join our exclusive membership and transform your healthcare journey
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

const stats = [
  { value: '10+', label: 'Years of Excellence' },
  { value: '50k+', label: 'Elite Members' },
  { value: '95%', label: 'Member Satisfaction' },
  { value: '24/7', label: 'Concierge Support' },
];

const values = [
  {
    name: 'Excellence',
    description: 'We strive for excellence in every aspect of our service, ensuring the highest quality healthcare experience.',
    icon: <Star className="h-6 w-6" />,
  },
  {
    name: 'Innovation',
    description: 'We leverage cutting-edge AI technology to revolutionize healthcare delivery and accessibility.',
    icon: <Bot className="h-6 w-6" />,
  },
  {
    name: 'Integrity',
    description: 'We maintain the highest standards of medical ethics and patient confidentiality.',
    icon: <Shield className="h-6 w-6" />,
  },
  {
    name: 'Global Reach',
    description: 'We provide seamless access to premium healthcare services worldwide.',
    icon: <Globe2 className="h-6 w-6" />,
  },
];

const team = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Chief Executive Officer',
    bio: 'With over 15 years of experience in healthcare innovation, Dr. Chen leads our mission to transform medical care delivery.',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Michael Rodriguez',
    role: 'Chief Technology Officer',
    bio: 'A pioneer in AI healthcare solutions, Michael drives our technological innovation and platform development.',
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Dr. Emily Thompson',
    role: 'Chief Medical Officer',
    bio: 'Board-certified physician with expertise in digital health and personalized medicine implementation.',
    image: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80',
  },
];