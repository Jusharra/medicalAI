import { useState, useEffect } from 'react';
import { User, Mail, Phone, Upload, Trash2 } from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import { toast } from 'react-hot-toast';

interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
}

export default function ProfileSettings() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<Profile>({
    id: '',
    full_name: '',
    phone: '',
    avatar_url: null
  });
  const [errors, setErrors] = useState({
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    if (!user) {
      return;
    }
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // First try to get profile from users table
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, full_name, avatar_url')
        .eq('id', user.id)
        .single();

      if (userError) {
        console.error('Error loading from users table:', userError);
        
        // If users table fails, try profiles table as fallback
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert([{
                id: user.id,
                full_name: user.full_name || '',
                updated_at: new Date().toISOString()
              }])
              .select()
              .single();

            if (createError) throw createError;
            if (newProfile) {
              setProfile({
                id: newProfile.id,
                full_name: newProfile.full_name,
                phone: newProfile.phone,
                avatar_url: newProfile.avatar_url
              });
            }
          } else {
            throw profileError;
          }
        } else if (profileData) {
          setProfile({
            id: profileData.id,
            full_name: profileData.full_name,
            phone: profileData.phone,
            avatar_url: profileData.avatar_url
          });
        }
      } else if (userData) {
        // Get phone from profiles if available
        const { data: phoneData } = await supabase
          .from('profiles')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();
          
        setProfile({
          id: userData.id,
          full_name: userData.full_name,
          phone: phoneData?.phone || null,
          avatar_url: userData.avatar_url
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {
      full_name: '',
      phone: ''
    };

    if (!profile.full_name?.trim()) {
      newErrors.full_name = 'Full name is required';
    }

    if (profile.phone && !/^\+?[\d\s-()]+$/.test(profile.phone)) {
      newErrors.phone = 'Invalid phone number format';
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setLoading(true);
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }

      // Upload avatar
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // Update profile in both tables
      const updates = { avatar_url: publicUrl };
      
      // Update users table
      const { error: usersError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user?.id);
        
      if (usersError) {
        console.error('Error updating users table:', usersError);
      }
      
      // Update profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
        
      if (profilesError) {
        console.error('Error updating profiles table:', profilesError);
      }
      
      if (usersError && profilesError) {
        throw new Error('Failed to update profile in both tables');
      }

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Avatar updated successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    try {
      setLoading(true);

      // Remove avatar from storage
      if (profile.avatar_url) {
        const filePath = profile.avatar_url.split('/').pop();
        if (filePath) {
          const { error: deleteError } = await supabase.storage
            .from('avatars')
            .remove([`${user?.id}/${filePath}`]);

          if (deleteError) throw deleteError;
        }
      }

      // Update profile in both tables
      const updates = { avatar_url: null };
      
      // Update users table
      const { error: usersError } = await supabase
        .from('users')
        .update(updates)
        .eq('id', user?.id);
        
      if (usersError) {
        console.error('Error updating users table:', usersError);
      }
      
      // Update profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user?.id);
        
      if (profilesError) {
        console.error('Error updating profiles table:', profilesError);
      }
      
      if (usersError && profilesError) {
        throw new Error('Failed to update profile in both tables');
      }

      setProfile(prev => ({ ...prev, avatar_url: null }));
      toast.success('Avatar removed successfully');
    } catch (error) {
      console.error('Error removing avatar:', error);
      toast.error('Failed to remove avatar');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      // Update users table
      const { error: usersError } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name?.trim()
        })
        .eq('id', user?.id);
        
      if (usersError) {
        console.error('Error updating users table:', usersError);
      }
      
      // Update profiles table
      const { error: profilesError } = await supabase
        .from('profiles')
        .update({
          full_name: profile.full_name?.trim(),
          phone: profile.phone?.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', user?.id);
        
      if (profilesError) {
        console.error('Error updating profiles table:', profilesError);
      }
      
      if (usersError && profilesError) {
        throw new Error('Failed to update profile in both tables');
      }

      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white rounded-xl shadow-xl p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        {/* Avatar Section */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
          <div className="flex items-center space-x-6">
            <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-12 w-12 text-gray-400" />
              )}
            </div>
            <div className="flex space-x-4">
              <Button variant="outline" className="relative">
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={loading}
                />
                <Upload className="h-4 w-4 mr-2" />
                Upload New
              </Button>
              {profile.avatar_url && (
                <Button
                  variant="outline"
                  onClick={handleRemoveAvatar}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="space-y-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 flex items-center space-x-2">
                <Mail className="h-5 w-5 text-gray-400" />
                <Input
                  type="email"
                  value={user?.email || ''}
                  disabled={true}
                  className="bg-gray-50"
                  placeholder="Your email is managed through authentication"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <div className="mt-1 flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <Input
                  value={profile.full_name || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="Enter your full name"
                  error={errors.full_name}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Phone Number</label>
              <div className="mt-1 flex items-center space-x-2">
                <Phone className="h-5 w-5 text-gray-400" />
                <Input
                  type="tel"
                  value={profile.phone || ''}
                  onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="Enter your phone number"
                  error={errors.phone}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button
            onClick={handleUpdateProfile}
            isLoading={loading}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}