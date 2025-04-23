import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { toast } from 'react-hot-toast';
import { KeyRound, ArrowLeft, Lock } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { resetPassword, updatePassword } = useAuthStore();

  // Check if we're in reset mode (have access token) or request mode
  const accessToken = searchParams.get('access_token');

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }

    try {
      setLoading(true);
      const { error } = await resetPassword(email);

      if (error) throw error;

      toast.success('Password reset instructions sent to your email');
      navigate('/signin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reset instructions');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      toast.error('Please enter a new password');
      return;
    }

    try {
      setLoading(true);
      const { error } = await updatePassword(newPassword);

      if (error) throw error;

      toast.success('Password updated successfully');
      navigate('/signin');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-luxury-gradient p-2 rounded-lg w-16 h-16 mx-auto flex items-center justify-center">
          <KeyRound className="h-8 w-8 text-gold-400" />
        </div>
        <h2 className="mt-6 text-center text-3xl font-display font-bold text-navy-900">
          {accessToken ? 'Reset Your Password' : 'Forgot Your Password?'}
        </h2>
        <p className="mt-2 text-center text-sm text-navy-600">
          {accessToken
            ? "Enter your new password below"
            : "Enter your email and we'll send you instructions to reset your password"}
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-luxury rounded-xl sm:px-10">
          <form onSubmit={accessToken ? handleResetPassword : handleRequestReset}>
            {accessToken ? (
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter your new password"
                required
                icon={<Lock className="h-5 w-5 text-gray-400" />}
              />
            ) : (
              <Input
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                icon={<Lock className="h-5 w-5 text-gray-400" />}
              />
            )}

            <div className="mt-6">
              <Button
                type="submit"
                variant="luxury"
                className="w-full"
                isLoading={loading}
              >
                {accessToken ? 'Update Password' : 'Send Reset Instructions'}
              </Button>
            </div>
          </form>

          <div className="mt-6">
            <Link
              to="/signin"
              className="flex items-center justify-center text-sm font-medium text-gold-600 hover:text-gold-500"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}