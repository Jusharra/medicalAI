import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, 
  Shield, 
  Clock, 
  Check, 
  ArrowRight,
  Calculator,
  CreditCard,
  BadgeCheck,
  Star
} from 'lucide-react';
import Button from '../components/ui/Button';

export default function Financing() {
  const [monthlyPayment, setMonthlyPayment] = useState(499);
  const [term, setTerm] = useState(12);
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideshowRef = useRef<HTMLDivElement>(null);

  const slides = [
    {
      image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=2000&q=80",
      title: "Flexible Financing Options",
      subtitle: "Healthcare Without Compromise"
    },
    {
      image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?auto=format&fit=crop&w=2000&q=80",
      title: "Affordable Payment Plans",
      subtitle: "Starting at $199/month"
    },
    {
      image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?auto=format&fit=crop&w=2000&q=80",
      title: "0% APR Financing",
      subtitle: "For Qualified Applicants"
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [slides.length]);

  const handleApplyNow = () => {
    window.open('https://flexxbuy.com/communitee/', '_blank');
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
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
              {slides[currentSlide].title}
              <span className="block text-[#ffc30f] mt-2">{slides[currentSlide].subtitle}</span>
            </h1>
            <p className="mt-6 text-xl text-white/90 max-w-3xl mx-auto font-light">
              Get immediate access to premium healthcare with flexible payment options starting at $199/month
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-6 text-lg">
              <div className="flex items-center text-white/80">
                <Check className="h-6 w-6 text-[#ffc30f] mr-2" />
                Instant Approval
              </div>
              <div className="flex items-center text-white/80">
                <Check className="h-6 w-6 text-[#ffc30f] mr-2" />
                0% APR Options
              </div>
              <div className="flex items-center text-white/80">
                <Check className="h-6 w-6 text-[#ffc30f] mr-2" />
                Flexible Terms
              </div>
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

      {/* Value Stack Section */}
      <div className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold text-navy-900 mb-4">
              The Value Is Clear
            </h2>
            <p className="text-xl text-navy-600">
              Your membership pays for itself many times over
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {valueStack.map((item) => (
              <div key={item.title} className="bg-navy-50 rounded-xl p-6 text-center">
                <div className="text-4xl font-bold text-[#ffc30f] mb-2">${item.value}</div>
                <h3 className="text-xl font-semibold text-navy-900 mb-2">{item.title}</h3>
                <p className="text-navy-600">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <div className="inline-block bg-gold-100 text-navy-800 px-6 py-3 rounded-full text-lg font-semibold">
              Total Value: $50,000+ Per Year
            </div>
          </div>
        </div>
      </div>

      {/* Financing Options */}
      <div className="py-24 bg-navy-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-display font-bold text-navy-900 mb-6">
                Flexible Payment Options
              </h2>
              <div className="space-y-6">
                {financingOptions.map((option) => (
                  <div key={option.name} className="bg-white rounded-xl p-6 shadow-luxury hover:shadow-luxury-lg transition-all duration-300">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 bg-gold-gradient rounded-xl flex items-center justify-center">
                          <option.icon className="h-6 w-6 text-navy-900" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-xl font-semibold text-navy-900">{option.name}</h3>
                        <p className="text-navy-600 mt-1">{option.description}</p>
                        {option.terms && (
                          <ul className="mt-4 space-y-2">
                            {option.terms.map((term) => (
                              <li key={term} className="flex items-center text-navy-600">
                                <Check className="h-4 w-4 text-[#ffc30f] mr-2" />
                                {term}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculator Section */}
            <div className="bg-white rounded-xl p-8 shadow-luxury">
              <h3 className="text-2xl font-display font-bold text-navy-900 mb-6">
                Payment Calculator
              </h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Monthly Payment
                  </label>
                  <select
                    value={monthlyPayment}
                    onChange={(e) => setMonthlyPayment(Number(e.target.value))}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
                  >
                    <option value="199">Essential Care - $199/month</option>
                    <option value="499">Premium Care - $499/month</option>
                    <option value="999">Elite Care - $999/month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-navy-700 mb-2">
                    Payment Term
                  </label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(Number(e.target.value))}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-[#ffc30f] focus:ring-[#ffc30f]"
                  >
                    <option value="12">12 months</option>
                    <option value="24">24 months</option>
                    <option value="36">36 months</option>
                  </select>
                </div>

                <div className="bg-navy-50 rounded-xl p-6">
                  <div className="text-sm text-navy-600 mb-2">Estimated Payment</div>
                  <div className="text-3xl font-bold text-navy-900">
                    ${(monthlyPayment / term).toFixed(2)}/month
                  </div>
                  <div className="text-sm text-navy-500 mt-2">
                    *Subject to credit approval
                  </div>
                </div>

                <Button 
                  onClick={handleApplyNow}
                  variant="luxury"
                  className="w-full py-3 text-lg"
                >
                  Apply Now
                </Button>

                <p className="text-sm text-navy-500 text-center">
                  Quick approval process • No impact on credit score
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Guarantee Section */}
      <div className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-luxury-gradient rounded-xl p-8 shadow-luxury text-center">
            <Shield className="h-16 w-16 text-[#ffc30f] mx-auto mb-6" />
            <h2 className="text-2xl font-display font-bold text-white mb-4">
              Our Risk-Free Guarantee
            </h2>
            <p className="text-xl text-[#ffc30f] mb-8">
              If you're not completely satisfied with our service within the first 30 days, we'll refund your investment in full. No questions asked.
            </p>
            <Link to="/membership">
              <Button variant="luxury" size="lg" className="px-8">
                Get Started Now
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

const valueStack = [
  {
    title: "Emergency Care Savings",
    value: "12,000",
    description: "Average annual savings on emergency room visits and urgent care"
  },
  {
    title: "Specialist Access",
    value: "24,000",
    description: "Value of priority access to top specialists and reduced wait times"
  },
  {
    title: "Concierge Services",
    value: "14,000",
    description: "24/7 medical support, coordination, and luxury health benefits"
  }
];

const financingOptions = [
  {
    name: "0% APR Financing",
    description: "Split your membership into easy monthly payments with zero interest for qualified applicants.",
    icon: CreditCard,
    terms: [
      "0% APR for 12-36 months",
      "No prepayment penalties",
      "Quick online application",
      "Instant decision"
    ]
  },
  {
    name: "Healthcare Financing Partners",
    description: "We've partnered with leading healthcare lenders to provide flexible financing options.",
    icon: BadgeCheck,
    terms: [
      "Multiple lender options",
      "Competitive rates",
      "Flexible payment terms",
      "High approval rates"
    ]
  },
  {
    name: "HSA/FSA Accepted",
    description: "Use your pre-tax health savings to cover your membership.",
    icon: DollarSign,
    terms: [
      "Tax-advantaged payments",
      "Compatible with most HSA/FSA plans",
      "Automatic payment options",
      "Annual tax documentation"
    ]
  }
];