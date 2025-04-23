import { useState, useEffect } from 'react';
import { CreditCard, Settings, Bell, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { toast } from 'react-hot-toast';

interface UserPreferences {
  email_notifications: boolean;
  sms_notifications: boolean;
  marketing_emails: boolean;
}

export default function AccountSettings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    email_notifications: true,
    sms_notifications: true,
    marketing_emails: false
  });

  useEffect(() => {
    if (!user) return;
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === 'PGRST116') {
          // Preferences don't exist, create them
          const { data: newPrefs, error: createError } = await supabase
            .from('user_preferences')
            .insert([{
              user_id: user.id,
              email_notifications: true,
              sms_notifications: true,
              marketing_emails: false
            }])
            .select()
            .single();

          if (createError) throw createError;
          if (newPrefs) {
            setPreferences({
              email_notifications: newPrefs.email_notifications,
              sms_notifications: newPrefs.sms_notifications,
              marketing_emails: newPrefs.marketing_emails
            });
          }
        } else {
          throw error;
        }
      } else if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          sms_notifications: data.sms_notifications,
          marketing_emails: data.marketing_emails
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
      toast.error('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async (key: keyof UserPreferences, value: boolean) => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      // Update local state immediately for responsive UI
      setPreferences(prev => ({ ...prev, [key]: value }));
      
      // Update in database
      const { error } = await supabase
        .from('user_preferences')
        .update({ [key]: value })
        .eq('user_id', user.id);
      
      if (error) throw error;
      
      toast.success('Preferences updated successfully');
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
      
      // Revert local state if update failed
      setPreferences(prev => ({ ...prev, [key]: !value }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Quick Links */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Quick Links</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <CreditCard className="h-6 w-6 text-leaf-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Billing Settings</h3>
              <p className="text-sm text-gray-500">Manage your payment methods</p>
            </div>
          </div>
          <div className="flex items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
            <Settings className="h-6 w-6 text-leaf-600 mr-3" />
            <div>
              <h3 className="font-medium text-gray-900">Account Preferences</h3>
              <p className="text-sm text-gray-500">Update your account settings</p>
            </div>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center space-x-3 mb-6">
          <Bell className="h-6 w-6 text-leaf-600" />
          <h2 className="text-xl font-semibold text-gray-900">Notification Preferences</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email Notifications</p>
              <p className="text-sm text-gray-500">Receive important updates via email</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.email_notifications}
                onChange={(e) => handleUpdatePreferences('email_notifications', e.target.checked)}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-leaf-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-leaf-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">SMS Notifications</p>
              <p className="text-sm text-gray-500">Receive important updates via SMS</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.sms_notifications}
                onChange={(e) => handleUpdatePreferences('sms_notifications', e.target.checked)}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-leaf-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-leaf-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Marketing Emails</p>
              <p className="text-sm text-gray-500">Receive news and special offers</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={preferences.marketing_emails}
                onChange={(e) => handleUpdatePreferences('marketing_emails', e.target.checked)}
                disabled={loading}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-leaf-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-leaf-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="h-6 w-6 text-leaf-600" />
          <h2 className="text-xl font-semibold text-gray-900">Security</h2>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Two-Factor Authentication</p>
              <p className="text-sm text-gray-500">Add an extra layer of security</p>
            </div>
            <Button variant="outline">
              Set Up 2FA
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Connected Devices</p>
              <p className="text-sm text-gray-500">Manage your active sessions</p>
            </div>
            <Button variant="outline">
              View Devices
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Password</p>
              <p className="text-sm text-gray-500">Update your password</p>
            </div>
            <Button variant="outline">
              Change Password
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}