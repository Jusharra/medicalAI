import { useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <AlertCircle className="mx-auto h-16 w-16 text-red-600" />
          <h2 className="mt-6 text-3xl font-display font-bold text-navy-900">
            Access Denied
          </h2>
          <p className="mt-2 text-sm text-navy-600">
            You don't have permission to access this page.
          </p>
        </div>
        <div className="mt-8 space-y-4">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="w-full"
          >
            Go Back
          </Button>
          <Button
            onClick={() => navigate('/dashboard')}
            variant="luxury"
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}