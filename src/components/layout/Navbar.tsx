import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth';
import { supabase } from '../../lib/supabase';
import Button from '../ui/Button';
import { Menu, X, User, Settings, LogOut, Phone, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Profile {
  id: string;
  full_name?: string;
  avatar_url: string | null;
}

export default function Navbar() {
  const { user, signOut } = useAuthStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  // Check if current page is admin or professional dashboard
  const isAdminDashboard = location.pathname.includes('/dashboard/admin');
  const isProfessionalDashboard = location.pathname.includes('/dashboard/professional');
  const isMemberDashboard = location.pathname.startsWith('/dashboard') && !isAdminDashboard && !isProfessionalDashboard;
  const hideDashboardButton = isAdminDashboard || isProfessionalDashboard || isMemberDashboard;

  useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProfile = async () => {
    if (!user?.id) {
      console.log('No user ID available for profile load');
      return;
    }

    try {
      console.log('Attempting to load profile for user:', user.id);
      
      // First try to get profile from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        console.error('Supabase users query error:', {
          message: userError.message,
          details: userError.details,
          hint: userError.hint,
          code: userError.code
        });
        
        // If users table fails, try profiles table as fallback
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError) {
          console.error('Supabase profiles query error:', {
            message: profileError.message,
            details: profileError.details,
            hint: profileError.hint,
            code: profileError.code
          });
          throw new Error(`Failed to load profile: ${profileError.message}`);
        }
        
        if (profileData) {
          console.log('Profile loaded from profiles table:', profileData);
          setProfile(profileData);
        } else {
          console.warn('No profile found in either table for user:', user.id);
          // Create a minimal profile with just the ID
          setProfile({
            id: user.id,
            avatar_url: null
          });
        }
      } else if (userData) {
        console.log('Profile loaded from users table:', userData);
        setProfile(userData);
      } else {
        console.warn('No profile found in users table for user:', user.id);
        // Create a minimal profile with just the ID
        setProfile({
          id: user.id,
          avatar_url: null
        });
      }
    } catch (error) {
      console.error('Error in loadProfile:', {
        error,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      
      // Check if it's a network error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('Network error detected - checking Supabase connection');
        toast.error('Network error - please check your connection');
      }
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsDropdownOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  };

  const getDashboardLink = () => {
    switch (user?.role) {
      case 'admin':
        return '/dashboard/admin';
      case 'partner':
        return '/dashboard/professional';
      default:
        return '/dashboard';
    }
  };

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 md:h-24">
          {/* Logo */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center">
              <div className="h-10 w-10 sm:h-16 sm:w-16">
                <img src="/vitale-health-concierge-logo-tpgreay.png" alt="Vitalé Health Concierge" className="h-full w-full object-contain" />
              </div>
              <div className="hidden sm:block ml-3">
                <div className="flex items-center text-sm text-body">
                  <Phone className="h-4 w-4 mr-1" />
                  <a href="tel:+16614898106" className="hover:text-gray-700 transition-colors">
                    +1 661-489-8106
                  </a>
                </div>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4 lg:space-x-6">
            <Link to="/" className="text-body hover:text-heading font-medium transition-colors px-2 py-1">
              Home
            </Link>
            <Link to="/about" className="text-body hover:text-heading font-medium transition-colors px-2 py-1">
              About
            </Link>
            <Link to="/benefits" className="text-body hover:text-heading font-medium transition-colors px-2 py-1">
              Benefits
            </Link>
            <Link to="/membership" className="text-body hover:text-heading font-medium transition-colors px-2 py-1">
              Membership
            </Link>
            <Link to="/financing" className="text-body hover:text-heading font-medium transition-colors px-2 py-1">
              Financing
            </Link>
            <Link to="/assessment" className="text-body hover:text-heading font-medium transition-colors px-2 py-1">
              Health Assessment
            </Link>
            <Link to="/partners" className="text-body hover:text-heading font-medium transition-colors px-2 py-1">
              Partners
            </Link>
            {user ? (
              <div className="flex items-center space-x-4">
                {!hideDashboardButton && (
                  <Link to={getDashboardLink()}>
                    <Button variant="luxury" size="sm">
                      Dashboard
                    </Button>
                  </Link>
                )}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className={`h-10 w-10 rounded-full flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-gold-500 transition-all focus:outline-none ${profile?.avatar_url ? '' : 'bg-luxury-50'}`}
                  >
                    {profile?.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User className="h-5 w-5 text-luxury-500" />
                    )}
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-luxury py-1 z-50 border border-gray-100">
                      <Link
                        to="/settings/profile"
                        className="flex items-center px-4 py-2 text-sm text-body hover:bg-luxury-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Profile Settings
                      </Link>
                      <Link
                        to="/settings/account"
                        className="flex items-center px-4 py-2 text-sm text-body hover:bg-luxury-50"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Account Settings
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/signin">
                  <Button variant="outline" size="sm" className="border-gold-500 text-body hover:bg-gold-500/10">
                    Sign In
                  </Button>
                </Link>
                <Link to="/membership">
                  <Button variant="luxury" size="sm">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-lg text-body hover:text-heading hover:bg-luxury-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMenuOpen ? (
                <X className="block h-6 w-6" />
              ) : (
                <Menu className="block h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden ${isMenuOpen ? 'block' : 'hidden'} transition-all duration-300 ease-in-out`}>
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-md">
          <Link
            to="/"
            className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
            onClick={() => setIsMenuOpen(false)}
          >
            Home
          </Link>
          <Link
            to="/about"
            className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
            onClick={() => setIsMenuOpen(false)}
          >
            About
          </Link>
          <Link
            to="/benefits"
            className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
            onClick={() => setIsMenuOpen(false)}
          >
            Benefits
          </Link>
          <Link
            to="/membership"
            className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
            onClick={() => setIsMenuOpen(false)}
          >
            Membership
          </Link>
          <Link
            to="/financing"
            className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
            onClick={() => setIsMenuOpen(false)}
          >
            Financing
          </Link>
          <Link
            to="/assessment"
            className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
            onClick={() => setIsMenuOpen(false)}
          >
            Health Assessment
          </Link>
          <Link
            to="/partners"
            className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
            onClick={() => setIsMenuOpen(false)}
          >
            Partners
          </Link>
          {user ? (
            <>
              {!hideDashboardButton && (
                <Link
                  to={getDashboardLink()}
                  className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Dashboard
                </Link>
              )}
              <Link
                to="/settings/profile"
                className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Profile Settings
              </Link>
              <Link
                to="/settings/account"
                className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Account Settings
              </Link>
              <button
                onClick={() => {
                  signOut();
                  setIsMenuOpen(false);
                }}
                className="block w-full text-left px-3 py-2 rounded-lg text-base font-medium text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/signin"
                className="block px-3 py-2 rounded-lg text-base font-medium text-body hover:text-heading hover:bg-luxury-50"
                onClick={() => setIsMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link
                to="/membership"
                className="block px-3 py-2 rounded-lg text-base font-medium bg-gold-gradient text-navy-900 rounded-lg px-3 py-2"
                onClick={() => setIsMenuOpen(false)}
              >
                Get Started
              </Link>
            </>
          )}
          <div className="pt-2 flex items-center px-3 py-2">
            <Phone className="h-4 w-4 mr-1 text-body" />
            <a href="tel:+16614898106" className="text-body hover:text-heading">
              +1 661-489-8106
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}