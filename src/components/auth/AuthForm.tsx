import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/auth';
import './auth-styles.css';

export default function AuthForm() {
  const location = useLocation();
  const isRegister = location.pathname === '/signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRecovery, setShowRecovery] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsClass, setTermsClass] = useState('');
  const [recoveryClass, setRecoveryClass] = useState('');
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword } = useAuthStore();
  const slideshowRef = useRef<HTMLDivElement>(null);
  const slideshowInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize slideshow
  useEffect(() => {
    // Hide all slides except the first one
    const slides = document.querySelectorAll('#slideshow > div:nth-child(n+2)');
    slides.forEach(slide => {
      (slide as HTMLElement).style.display = 'none';
    });

    // Start slideshow
    slideshowInterval.current = setInterval(() => {
      const firstSlide = document.querySelector('#slideshow > div:first-child');
      if (firstSlide) {
        firstSlide.classList.add('element');
        setTimeout(() => {
          (firstSlide as HTMLElement).style.display = 'none';
          firstSlide.classList.remove('element');
          const parent = firstSlide.parentNode;
          if (parent) {
            parent.appendChild(firstSlide);
            const newFirstSlide = document.querySelector('#slideshow > div:first-child');
            if (newFirstSlide) {
              (newFirstSlide as HTMLElement).style.display = 'block';
              setTimeout(() => {
                newFirstSlide.classList.add('active');
              }, 50);
            }
          }
        }, 1000);
      }
    }, 3850);

    return () => {
      if (slideshowInterval.current) {
        clearInterval(slideshowInterval.current);
      }
    };
  }, []);

  // Setup tab functionality
  useEffect(() => {
    const setupTabs = () => {
      const tabs = document.querySelectorAll('.tabs h3 a');
      tabs.forEach(tab => {
        tab.addEventListener('click', (event) => {
          event.preventDefault();
          
          // Remove active class from all tabs
          tabs.forEach(t => t.classList.remove('active'));
          
          // Add active class to clicked tab
          tab.classList.add('active');
          
          // Get tab content ID from href attribute
          const tabContent = (tab as HTMLAnchorElement).getAttribute('href');
          
          // Hide all tab content
          document.querySelectorAll('div[id$="tab-content"]').forEach(content => {
            content.classList.remove('active');
          });
          
          // Show selected tab content
          if (tabContent) {
            document.querySelector(tabContent)?.classList.add('active');
          }
        });
      });
    };

    setupTabs();
  }, []);

  // Setup terms/recovery panel functionality
  useEffect(() => {
    const setupPanels = () => {
      const agreeLinks = document.querySelectorAll('.agree');
      const forgotLinks = document.querySelectorAll('.forgot');
      const toggleTerms = document.querySelector('#toggle-terms');
      const loginLinks = document.querySelectorAll('.log-in');
      const signupLinks = document.querySelectorAll('.sign-up');
      
      const handlePanelClick = (event: Event) => {
        event.preventDefault();
        const target = event.currentTarget as HTMLElement;
        const terms = document.querySelector('.terms');
        const recovery = document.querySelector('.recovery');
        const close = document.querySelector('#toggle-terms');
        const arrows = document.querySelectorAll('.tabs-content .fa');
        
        if (target.classList.contains('agree') || 
            target.classList.contains('log-in') || 
            (target.id === 'toggle-terms' && terms?.classList.contains('open'))) {
          
          if (terms?.classList.contains('open')) {
            terms.classList.remove('open');
            terms.classList.add('closed');
            close?.classList.remove('open');
            close?.classList.add('closed');
            arrows.forEach(arrow => {
              arrow.classList.remove('active');
              arrow.classList.add('inactive');
            });
          } else {
            if (target.classList.contains('log-in')) {
              return;
            }
            terms?.classList.remove('closed');
            terms?.classList.add('open');
            terms?.scrollTo(0, 0);
            close?.classList.remove('closed');
            close?.classList.add('open');
            arrows.forEach(arrow => {
              arrow.classList.remove('inactive');
              arrow.classList.add('active');
            });
          }
        } else if (target.classList.contains('forgot') || 
                  target.classList.contains('sign-up') || 
                  target.id === 'toggle-terms') {
          
          if (recovery?.classList.contains('open')) {
            recovery.classList.remove('open');
            recovery.classList.add('closed');
            close?.classList.remove('open');
            close?.classList.add('closed');
            arrows.forEach(arrow => {
              arrow.classList.remove('active');
              arrow.classList.add('inactive');
            });
          } else {
            if (target.classList.contains('sign-up')) {
              return;
            }
            recovery?.classList.remove('closed');
            recovery?.classList.add('open');
            close?.classList.remove('closed');
            close?.classList.add('open');
            arrows.forEach(arrow => {
              arrow.classList.remove('inactive');
              arrow.classList.add('active');
            });
          }
        }
      };
      
      agreeLinks.forEach(link => link.addEventListener('click', handlePanelClick));
      forgotLinks.forEach(link => link.addEventListener('click', handlePanelClick));
      if (toggleTerms) toggleTerms.addEventListener('click', handlePanelClick);
      loginLinks.forEach(link => link.addEventListener('click', handlePanelClick));
      signupLinks.forEach(link => link.addEventListener('click', handlePanelClick));
      
      // Recovery form submission
      const recoveryButtons = document.querySelectorAll('.recovery .button');
      recoveryButtons.forEach(button => {
        button.addEventListener('click', (event) => {
          event.preventDefault();
          const mssg = document.querySelector('.recovery .mssg');
          mssg?.classList.add('animate');
          
          setTimeout(() => {
            const recovery = document.querySelector('.recovery');
            recovery?.classList.remove('open');
            recovery?.classList.add('closed');
            
            const toggleTerms = document.querySelector('#toggle-terms');
            toggleTerms?.classList.remove('open');
            toggleTerms?.classList.add('closed');
            
            const arrows = document.querySelectorAll('.tabs-content .fa');
            arrows.forEach(arrow => {
              arrow.classList.remove('active');
              arrow.classList.add('inactive');
            });
            
            mssg?.classList.remove('animate');
          }, 2500);
        });
      });
    };

    setupPanels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        if (!email || !password || !fullName) {
          throw new Error('Please fill in all fields');
        }

        const { error: signUpError } = await signUp(email, password, fullName);
        if (signUpError) throw signUpError;
        
        toast.success('Registration successful! Please check your email to confirm your account.');
        navigate('/signin');
      } else {
        if (!email || !password) {
          throw new Error('Please fill in all fields');
        }

        const { error: signInError } = await signIn(email, password);
        if (signInError) throw signInError;
        
        toast.success('Successfully signed in!');
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const { error } = await resetPassword(email);
      if (error) throw error;
      
      const recoveryMessage = document.querySelector('.recovery .mssg');
      if (recoveryMessage) {
        recoveryMessage.classList.add('animate');
      }
      
      setTimeout(() => {
        setRecoveryClass('closed');
        setTimeout(() => {
          setShowRecovery(false);
          setRecoveryClass('');
        }, 800);
      }, 2000);
    } catch (error) {
      console.error('Recovery error:', error);
      setError(error instanceof Error ? error.message : 'Failed to send recovery email');
    } finally {
      setLoading(false);
    }
  };

  const openTerms = () => {
    setShowTerms(true);
    setTimeout(() => {
      const terms = document.querySelector('.terms');
      const toggleTerms = document.querySelector('#toggle-terms');
      const arrows = document.querySelectorAll('.tabs-content .fa');
      
      terms?.classList.add('open');
      toggleTerms?.classList.add('open');
      arrows.forEach(arrow => arrow.classList.add('active'));
    }, 10);
  };

  const closeTerms = () => {
    const terms = document.querySelector('.terms');
    const toggleTerms = document.querySelector('#toggle-terms');
    const arrows = document.querySelectorAll('.tabs-content .fa');
    
    terms?.classList.remove('open');
    terms?.classList.add('closed');
    toggleTerms?.classList.remove('open');
    toggleTerms?.classList.add('closed');
    arrows.forEach(arrow => {
      arrow.classList.remove('active');
      arrow.classList.add('inactive');
    });
    
    setTimeout(() => {
      setShowTerms(false);
    }, 800);
  };

  const openRecovery = () => {
    setShowRecovery(true);
    setTimeout(() => {
      const recovery = document.querySelector('.recovery');
      const toggleTerms = document.querySelector('#toggle-terms');
      const arrows = document.querySelectorAll('.tabs-content .fa');
      
      recovery?.classList.add('open');
      toggleTerms?.classList.add('open');
      arrows.forEach(arrow => arrow.classList.add('active'));
    }, 10);
  };

  return (
    <div className="login">
      <div className="wrap">
        {/* Toggle */}
        {showTerms && (
          <div id="toggle-wrap">
            <div id="toggle-terms" className={showTerms ? 'open' : 'closed'} onClick={closeTerms}>
              <div id="cross">
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
        
        {/* Terms */}
        {showTerms && (
          <div className={`terms ${termsClass}`}>
            <h2>Terms of Service</h2>
            <p className="small">Last modified: April 5, 2025</p>
            <h3>Welcome to Vitalé Health Concierge</h3>
            <p>By using our Services, you are agreeing to these terms. Please read them carefully.</p>
            <p>Our Services are very diverse, so sometimes additional terms or product requirements (including age requirements) may apply. Additional terms will be available with the relevant Services, and those additional terms become part of your agreement with us if you use those Services.</p>
            <h3>Using our Services</h3>
            <p>You must follow any policies made available to you within the Services.</p>
            <p>Using our Services does not give you ownership of any intellectual property rights in our Services or the content you access. You may not use content from our Services unless you obtain permission from its owner or are otherwise permitted by law. These terms do not grant you the right to use any branding or logos used in our Services. Don't remove, obscure, or alter any legal notices displayed in or along with our Services.</p>
            <p>In connection with your use of the Services, we may send you service announcements, administrative messages, and other information. You may opt out of some of those communications.</p>
            <h3>Your Vitalé Health Concierge Account</h3>
            <p>You may need an Account in order to use some of our Services. You may create your own Account, or your Account may be assigned to you by an administrator, such as your employer or educational institution. If you are using an Account assigned to you by an administrator, different or additional terms may apply and your administrator may be able to access or disable your account.</p>
            <p>To protect your Account, keep your password confidential. You are responsible for the activity that happens on or through your Account. Try not to reuse your Account password on third-party applications.</p>
            <h3>Privacy and Copyright Protection</h3>
            <p>Vitalé Health Concierge's privacy policies explain how we treat your personal data and protect your privacy when you use our Services. By using our Services, you agree that Vitalé Health Concierge can use such data in accordance with our privacy policies.</p>
            <p>We respond to notices of alleged copyright infringement and terminate accounts of repeat infringers according to the process set out in the U.S. Digital Millennium Copyright Act.</p>
            <h3>Modifying and Terminating our Services</h3>
            <p>We are constantly changing and improving our Services. We may add or remove functionalities or features, and we may suspend or stop a Service altogether.</p>
            <p>You can stop using our Services at any time, although we'll be sorry to see you go. Vitalé Health Concierge may also stop providing Services to you, or add or create new limits to our Services at any time.</p>
            <p>We believe that you own your data and preserving your access to such data is important. If we discontinue a Service, where reasonably possible, we will give you reasonable advance notice and a chance to get information out of that Service.</p>
            <h3>Our Warranties and Disclaimers</h3>
            <p>We provide our Services using a commercially reasonable level of skill and care and we hope that you will enjoy using them. But there are certain things that we don't promise about our Services.</p>
            <p>OTHER THAN AS EXPRESSLY SET OUT IN THESE TERMS OR ADDITIONAL TERMS, NEITHER VITALÉ HEALTH CONCIERGE NOR ITS SUPPLIERS OR DISTRIBUTORS MAKE ANY SPECIFIC PROMISES ABOUT THE SERVICES. FOR EXAMPLE, WE DON'T MAKE ANY COMMITMENTS ABOUT THE CONTENT WITHIN THE SERVICES, THE SPECIFIC FUNCTIONS OF THE SERVICES, OR THEIR RELIABILITY, AVAILABILITY, OR ABILITY TO MEET YOUR NEEDS. WE PROVIDE THE SERVICES "AS IS".</p>
            <p>SOME JURISDICTIONS PROVIDE FOR CERTAIN WARRANTIES, LIKE THE IMPLIED WARRANTY OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NON-INFRINGEMENT. TO THE EXTENT PERMITTED BY LAW, WE EXCLUDE ALL WARRANTIES.</p>
            <h3>Liability for our Services</h3>
            <p>WHEN PERMITTED BY LAW, VITALÉ HEALTH CONCIERGE, AND VITALÉ HEALTH CONCIERGE'S SUPPLIERS AND DISTRIBUTORS, WILL NOT BE RESPONSIBLE FOR LOST PROFITS, REVENUES, OR DATA, FINANCIAL LOSSES OR INDIRECT, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES.</p>
            <p>TO THE EXTENT PERMITTED BY LAW, THE TOTAL LIABILITY OF VITALÉ HEALTH CONCIERGE, AND ITS SUPPLIERS AND DISTRIBUTORS, FOR ANY CLAIMS UNDER THESE TERMS, INCLUDING FOR ANY IMPLIED WARRANTIES, IS LIMITED TO THE AMOUNT YOU PAID US TO USE THE SERVICES (OR, IF WE CHOOSE, TO SUPPLYING YOU THE SERVICES AGAIN).</p>
            <p>IN ALL CASES, VITALÉ HEALTH CONCIERGE, AND ITS SUPPLIERS AND DISTRIBUTORS, WILL NOT BE LIABLE FOR ANY LOSS OR DAMAGE THAT IS NOT REASONABLY FORESEEABLE.</p>
            <h3>About these Terms</h3>
            <p>We may modify these terms or any additional terms that apply to a Service to, for example, reflect changes to the law or changes to our Services. You should look at the terms regularly. We'll post notice of modifications to these terms on this page. We'll post notice of modified additional terms in the applicable Service. Changes will not apply retroactively and will become effective no sooner than fourteen days after they are posted. However, changes addressing new functions for a Service or changes made for legal reasons will be effective immediately. If you do not agree to the modified terms for a Service, you should discontinue your use of that Service.</p>
            <p>If you do not comply with these terms, and we don't take action right away, this doesn't mean that we are giving up any rights that we may have (such as taking action in the future).</p>
            <p>The laws of California, U.S.A., excluding California's conflict of laws rules, will apply to any disputes arising out of or relating to these terms or the Services. All claims arising out of or relating to these terms or the Services will be litigated exclusively in the federal or state courts of Santa Clara County, California, USA, and you and Vitalé Health Concierge consent to personal jurisdiction in those courts.</p>
            <p>For information about how to contact Vitalé Health Concierge, please visit our contact page.</p>
          </div>
        )}
        
        {/* Recovery */}
        {showRecovery && (
          <div className={`recovery ${recoveryClass}`}>
            <h2>Password Recovery</h2>
            <p>Enter your <strong>email address</strong> and <strong>click Submit</strong></p>
            <p>We'll email instructions on how to reset your password.</p>
            <form className="recovery-form" onSubmit={handleRecoverySubmit}>
              <input 
                type="text" 
                className="input" 
                placeholder="Enter Email Here"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <input 
                type="submit" 
                className="button" 
                value={loading ? "Processing..." : "Submit"}
                disabled={loading}
              />
            </form>
            <p className="mssg">An email has been sent to you with further instructions.</p>
          </div>
        )}
        
        {/* Content */}
        <div className="content">
          {/* Logo */}
          <div className="logo">
            <a href="/">
              <img src="/vitale-health-concierge-logo-tpwhite.png" alt="Vitalé Health Concierge" />
            </a>
          </div>
          
          {/* Slideshow */}
          <div id="slideshow" ref={slideshowRef}>
            <div className="one">
              <h2><span>AI HEALTH</span></h2>
              <p>24/7 AI-powered health monitoring and personalized insights</p>
            </div>
            <div className="two">
              <h2><span>CONCIERGE</span></h2>
              <p>Premium healthcare services with dedicated medical professionals</p>
            </div>
            <div className="three">
              <h2><span>WELLNESS</span></h2>
              <p>Comprehensive wellness programs tailored to your unique needs</p>
            </div>
            <div className="four">
              <h2><span>GLOBAL CARE</span></h2>
              <p>Access to elite healthcare services worldwide with priority status</p>
            </div>
          </div>
        </div>
        
        {/* User */}
        <div className="user">
          <div className="form-wrap">
            {/* Tabs */}
            <div className="tabs">
              <h3 className="login-tab">
                <a className={`log-in ${!isRegister ? 'active' : ''}`} href="#login-tab-content">
                  <span>Login</span>
                </a>
              </h3>
              <h3 className="signup-tab">
                <a className={`sign-up ${isRegister ? 'active' : ''}`} href="#signup-tab-content">
                  <span>Sign Up</span>
                </a>
              </h3>
            </div>
            
            {/* Tabs Content */}
            <div className="tabs-content">
              {/* Login Tab Content */}
              <div id="login-tab-content" className={!isRegister ? 'active' : ''}>
                {error && (
                  <div className="error-message" style={{ color: '#ff6b6b', marginBottom: '15px' }}>
                    {error}
                  </div>
                )}
                <form className="login-form" onSubmit={handleSubmit}>
                  <input 
                    type="text" 
                    className="input" 
                    id="user_login" 
                    placeholder="Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input 
                    type="password" 
                    className="input" 
                    id="user_pass" 
                    placeholder="Your Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <input 
                    type="checkbox" 
                    className="checkbox" 
                    id="remember_me" 
                    defaultChecked
                  />
                  <label htmlFor="remember_me">Keep me signed in on this device</label>
                  <input 
                    type="submit" 
                    className="button" 
                    value={loading ? "Processing..." : "Access My Health Dashboard"}
                    disabled={loading}
                  />
                </form>
                <div className="help-action">
                  <p>
                    <i className="fa fa-arrow-left" aria-hidden="true"></i>
                    <a className="forgot" href="#" onClick={(e) => { e.preventDefault(); openRecovery(); }}>
                      Need password assistance?
                    </a>
                  </p>
                </div>
              </div>
              
              {/* Signup Tab Content */}
              <div id="signup-tab-content" className={isRegister ? 'active' : ''}>
                {error && (
                  <div className="error-message" style={{ color: '#ffffff', marginBottom: '15px' }}>
                    {error}
                  </div>
                )}
                <form className="signup-form" onSubmit={handleSubmit}>
                  <input 
                    type="email" 
                    className="input" 
                    id="user_email" 
                    placeholder="Your Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <input 
                    type="text" 
                    className="input" 
                    id="user_name" 
                    placeholder="Your Full Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                  <input 
                    type="password" 
                    className="input" 
                    id="user_pass" 
                    placeholder="Create a Secure Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <input 
                    type="submit" 
                    className="button" 
                    value={loading ? "Processing..." : "Begin My Health Journey"}
                    disabled={loading}
                  />
                </form>
                <div className="help-action">
                  <p>By creating an account, you agree to our</p>
                  <p>
                    <i className="fa fa-arrow-left" aria-hidden="true"></i>
                    <a className="agree" href="#" onClick={(e) => { e.preventDefault(); openTerms(); }}>
                      Health Privacy & Terms
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}