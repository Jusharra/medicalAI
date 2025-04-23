import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, RefreshCw, CheckCircle, AlertCircle, WifiOff } from 'lucide-react';
import Button from '../components/ui/Button';
import { flushCache, checkSupabaseConnection } from '../lib/supabase';
import { toast } from 'react-hot-toast';

export default function ClearCache() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionStatus, setConnectionStatus] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [connectionDetails, setConnectionDetails] = useState<any>(null);

  const handleClearCache = async () => {
    try {
      setLoading(true);
      setStatus('idle');
      setErrorMessage('');
      
      // Check connection first with detailed response
      const connection = await checkSupabaseConnection();
      setConnectionStatus(connection.connected);
      setConnectionDetails(connection);
      
      if (!connection.connected) {
        const errorMsg = connection.error 
          ? `Connection failed: ${connection.error}`
          : 'Unable to connect to Supabase. Please check your internet connection and try again.';
        throw new Error(errorMsg);
      }
      
      // Clear all caches
      const result = await flushCache();
      
      if (result.success) {
        setStatus('success');
        toast.success('Cache cleared successfully');
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } else {
        setStatus('error');
        const errorMsg = result.error instanceof Error ? result.error.message : 'Failed to clear cache';
        setErrorMessage(errorMsg);
        toast.error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred');
      toast.error('An error occurred while clearing cache');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-luxury p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-navy-50 rounded-full flex items-center justify-center mb-4">
            <Trash2 className="h-8 w-8 text-navy-600" />
          </div>
          <h1 className="text-2xl font-bold text-navy-900 mb-2">Clear Application Cache</h1>
          <p className="text-navy-600">
            This will clear all local storage, session storage, and authentication data.
          </p>
        </div>

        {connectionStatus === false && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start">
            <WifiOff className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-yellow-800 font-medium">Connection Issue</p>
              <p className="text-yellow-700 text-sm mt-1">
                {connectionDetails?.error || 'Unable to connect to the server. Please check your internet connection.'}
              </p>
              {connectionDetails?.attempt && (
                <p className="text-yellow-600 text-xs mt-2">
                  Last attempt: {connectionDetails.timestamp}
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-medium">Cache cleared successfully</p>
              <p className="text-green-700 text-sm mt-1">
                You will be redirected to the dashboard shortly.
              </p>
              {connectionStatus !== null && (
                <p className="text-sm mt-2">
                  Supabase connection: {connectionStatus ? 
                    <span className="text-green-600 font-medium">Connected</span> : 
                    <span className="text-red-600 font-medium">Disconnected</span>
                  }
                </p>
              )}
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <p className="text-red-800 font-medium">Failed to clear cache</p>
              <p className="text-red-700 text-sm mt-1">
                {errorMessage || 'Please try again or contact support if the problem persists.'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <Button
            variant="luxury"
            onClick={handleClearCache}
            isLoading={loading}
            fullWidth
            className="flex items-center justify-center"
          >
            {!loading && <RefreshCw className="mr-2 h-5 w-5" />}
            Clear Cache
          </Button>
          
          <Button
            variant="outline"
            onClick={() => navigate('/dashboard')}
            disabled={loading}
            fullWidth
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}