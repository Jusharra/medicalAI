import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './store/auth';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import ProfessionalDashboard from './pages/ProfessionalDashboard';
import ProfileSettings from './pages/ProfileSettings';
import About from './pages/About';
import MemberBenefits from './pages/MemberBenefits';
import AccountSettings from './pages/AccountSettings';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Membership from './pages/Membership';
import Financing from './pages/Financing';
import LeadCapture from './pages/LeadCapture';
import Unauthorized from './pages/Unauthorized';
import MemberRewards from './pages/MemberRewards';
import AppointmentScheduling from './pages/AppointmentScheduling';
import AppointmentBooking from './pages/AppointmentBooking';
import PastPurchases from './pages/PastPurchases';
import UpcomingBookings from './pages/UpcomingBookings';
import ServicePreferences from './pages/ServicePreferences';
import Promotions from './pages/Promotions';
import HealthAlerts from './pages/HealthAlerts';
import ConciergeTeam from './pages/ConciergeTeam';
import Terms from './pages/Terms';
import MessageCenter from './pages/MessageCenter';
import PartnerSignup from './pages/PartnerSignup';
import ClearCache from './pages/ClearCache';
import Pharmacy from './pages/Pharmacy';

function App() {
  const { refreshSession } = useAuthStore();

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  return (
    <Router>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/membership" element={<Membership />} />
            <Route path="/financing" element={<Financing />} />
            <Route path="/about" element={<About />} />
            <Route path="/benefits" element={<MemberBenefits />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/assessment" element={<LeadCapture />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/partners" element={<PartnerSignup />} />
            <Route path="/clear-cache" element={<ClearCache />} />

            {/* Common Authenticated Routes - accessible to all authenticated users */}
            <Route element={<ProtectedRoute allowedRoles={['member', 'admin', 'partner']} />}>
              <Route path="/settings/profile" element={<ProfileSettings />} />
              <Route path="/settings/account" element={<AccountSettings />} />
            </Route>

            {/* Member Routes */}
            <Route element={<ProtectedRoute allowedRoles={['member']} />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/rewards" element={<MemberRewards />} />
              <Route path="/appointments" element={<AppointmentScheduling />} />
              <Route path="/appointments/book" element={<AppointmentBooking />} />
              <Route path="/purchases" element={<PastPurchases />} />
              <Route path="/bookings" element={<UpcomingBookings />} />
              <Route path="/preferences" element={<ServicePreferences />} />
              <Route path="/promotions" element={<Promotions />} />
              <Route path="/health-alerts" element={<HealthAlerts />} />
              <Route path="/team" element={<ConciergeTeam />} />
              <Route path="/messages" element={<MessageCenter />} />
              <Route path="/pharmacy" element={<Pharmacy />} />
              
              {/* Onboarding Routes */}
              <Route path="/welcome" element={<Dashboard />} />
              <Route path="/profile" element={<ProfileSettings />} />
              <Route path="/health-assessment" element={<LeadCapture />} />
              <Route path="/concierge-intro" element={<ConciergeTeam />} />
              <Route path="/schedule-consultation" element={<AppointmentScheduling />} />
            </Route>

            {/* Admin Routes */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
            </Route>

            {/* Partner Routes */}
            <Route element={<ProtectedRoute allowedRoles={['partner']} />}>
              <Route path="/dashboard/professional" element={<ProfessionalDashboard />} />
            </Route>

            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;