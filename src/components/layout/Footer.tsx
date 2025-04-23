import { Link } from 'react-router-dom';
import { Heart, Phone } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-luxury-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-1">
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-4">
              <div className="h-20 w-20 sm:h-40 sm:w-40">
                <img src="/vitale-health-concierge-logo-tpgreay.png" alt="Vitalé Health Concierge" className="h-full w-full object-contain" />
              </div>
            </div>
            <p className="mt-4 text-sm text-center md:text-left text-white">
              Transforming healthcare through AI-powered concierge services.
            </p>
            <div className="mt-4 flex items-center text-white justify-center md:justify-start">
              <Phone className="h-5 w-5 mr-2" />
              <a href="tel:+16614898106" className="hover:text-gold-500 transition-colors">
                +1 661-489-8106
              </a>
            </div>
          </div>

          {/* Links Sections */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gold-500 mb-4">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services" className="text-white hover:text-gold-500 transition-colors">AI Health Assistant</Link></li>
              <li><Link to="/services" className="text-white hover:text-gold-500 transition-colors">24/7 Support</Link></li>
              <li><Link to="/services" className="text-white hover:text-gold-500 transition-colors">Medical Concierge</Link></li>
            </ul>
          </div>

          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gold-500 mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-white hover:text-gold-500 transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="text-white hover:text-gold-500 transition-colors">Contact</Link></li>
              <li><Link to="/careers" className="text-white hover:text-gold-500 transition-colors">Careers</Link></li>
            </ul>
          </div>

          <div className="text-center md:text-left">
            <h3 className="text-lg font-semibold text-gold-500 mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="text-white hover:text-gold-500 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-white hover:text-gold-500 transition-colors">Terms of Service</Link></li>
              <li><Link to="/hipaa" className="text-white hover:text-gold-500 transition-colors">HIPAA Compliance</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-sm text-center md:text-left text-white">
              © {new Date().getFullYear()} Vitalé Health Concierge. All rights reserved.
            </p>
            <p className="text-sm flex items-center mt-4 md:mt-0 text-white">
              Developed by <Heart className="h-4 w-4 text-gold-500 mx-1" /> First-Choice Cyber Limited Liability Co.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}