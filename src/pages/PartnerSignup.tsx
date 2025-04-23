import { useState, useEffect, useRef } from 'react';
import { Briefcase, Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';

export default function PartnerSignup() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);
  
  const slides = [
    {
      image: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=2000&q=80",
      title: "Become a Trusted Partner",
      subtitle: "Join Our Exclusive Network"
    },
    {
      image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=2000&q=80",
      title: "Grow Your Practice",
      subtitle: "Without Marketing Costs"
    },
    {
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=2000&q=80",
      title: "Premium Patients",
      subtitle: "Pre-Qualified Concierge Members"
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
                backgroundImage: `linear-gradient(to bottom, rgba(12, 60, 75, 0.8), rgba(0, 18, 50, 0.9)), url(${slide.image})`,
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
              <span className="block text-gold-500 mt-2">{slides[currentSlide].subtitle}</span>
            </h1>
            <p className="mt-6 text-xl text-white/90 max-w-3xl mx-auto font-light">
              Connect with high-quality, membership-ready patients — without marketing costs or added overhead.
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
                currentSlide === index ? 'bg-gold-500' : 'bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Partner Benefits */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-display font-bold text-heading">Why Join the Vitalé Partner Network?</h2>
            <p className="mt-4 text-lg text-body max-w-3xl mx-auto">
              Our exclusive network connects premium healthcare providers with pre-qualified concierge patients
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl shadow-luxury hover:shadow-luxury-lg transition-all duration-300 p-8">
              <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-navy-900 mb-6">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-heading">Vetted Member Network</h3>
              <p className="mt-4 text-body">
                Access our exclusive network of high-quality, membership-ready patients who value premium healthcare services.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-luxury hover:shadow-luxury-lg transition-all duration-300 p-8">
              <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-navy-900 mb-6">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-heading">Zero Marketing Costs</h3>
              <p className="mt-4 text-body">
                Eliminate marketing expenses and overhead. We handle patient acquisition, allowing you to focus on providing care.
              </p>
            </div>
            
            <div className="bg-white rounded-xl shadow-luxury hover:shadow-luxury-lg transition-all duration-300 p-8">
              <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center text-navy-900 mb-6">
                <Check className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold text-heading">Keep 100% of Your Fees</h3>
              <p className="mt-4 text-body">
                You charge your full membership fee with no commission or revenue sharing. We simply route patients and manage the experience.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-24 bg-luxury-gradient">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-display font-bold text-white mb-4">
            Ready to Grow Your Practice?
          </h2>
          <p className="text-xl text-gold-500 mb-8">
            Apply now to receive your first referral and learn how Vitalé Concierge can support your practice
          </p>
          <Link to="/partner-application">
            <Button variant="luxury" size="lg" className="text-lg px-8 py-4">
              Apply for Access
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Partner FAQ */}
      <div className="py-24 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-display font-bold text-heading text-center mb-12">
            Partner FAQ
          </h2>
          
          <div className="space-y-8">
            <div className="bg-luxury-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-heading mb-2">Is this a subscription or agency service?</h3>
              <p className="text-body">
                No. You receive referrals and only work with patients you choose. There are no monthly fees or commissions.
              </p>
            </div>
            
            <div className="bg-luxury-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-heading mb-2">How are patients assigned?</h3>
              <p className="text-body">
                Patients are referred based on their preferences, location, and your availability. You have full control over which patients you accept.
              </p>
            </div>
            
            <div className="bg-luxury-50 rounded-xl p-6">
              <h3 className="text-xl font-semibold text-heading mb-2">How do I get paid?</h3>
              <p className="text-body">
                You charge your full membership fee directly to the patient. We simply route the patients and manage the experience, with no commission or revenue sharing.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-16 bg-luxury-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-display font-bold text-heading mb-4">
            Join Our Exclusive Network Today
          </h3>
          <p className="text-lg text-body max-w-2xl mx-auto mb-8">
            Become part of the Vitalé Health Concierge partner network and transform your practice
          </p>
          <Link to="/partner-application">
            <Button variant="luxury" size="lg">
              Apply for Access
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}