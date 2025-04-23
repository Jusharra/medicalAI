import { useState, useEffect, useRef } from 'react';
import { Briefcase, MapPin, Phone, Mail, Globe, FileText, Camera, Plus, Trash2, Upload } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';

interface PracticeProfile {
  id: string;
  name: string;
  practice_name: string;
  practice_address: {
    street?: string;
    city: string;
    state: string;
    zip?: string;
    country?: string;
  };
  email: string;
  phone: string;
  specialties: string[];
  profile_image: string | null;
  website?: string;
  bio?: string;
  consultation_fee: number;
  video_consultation: boolean;
  in_person_consultation: boolean;
  accepting_new_patients?: boolean;
}

interface PracticeProfileProps {
  partnerId: string;
}

export default function PracticeProfile({ partnerId }: PracticeProfileProps) {
  const [profile, setProfile] = useState<PracticeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialty, setNewSpecialty] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!partnerId) return;
    loadProfile();
  }, [partnerId]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', partnerId)
        .single();
      
      if (error) throw error;
      
      setProfile(data);
      
      // Check if there's a medical license document
      const { data: documents, error: documentsError } = await supabase.storage
        .from('partner_documents')
        .list(`${partnerId}/license`);
        
      if (!documentsError && documents && documents.length > 0) {
        setDocumentName(documents[0].name);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load practice profile');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name.startsWith('address.')) {
      const addressField = name.split('.')[1];
      setProfile(prev => prev ? {
        ...prev,
        practice_address: {
          ...prev.practice_address,
          [addressField]: value
        }
      } : null);
    } else {
      setProfile(prev => prev ? { ...prev, [name]: value } : null);
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setProfile(prev => prev ? { ...prev, [name]: checked } : null);
  };

  const handleAddSpecialty = () => {
    if (!newSpecialty.trim() || !profile) return;
    
    setProfile({
      ...profile,
      specialties: [...(profile.specialties || []), newSpecialty.trim()]
    });
    
    setNewSpecialty('');
  };

  const handleRemoveSpecialty = (specialty: string) => {
    if (!profile) return;
    
    setProfile({
      ...profile,
      specialties: profile.specialties.filter(s => s !== specialty)
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    try {
      setUploadingImage(true);
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please upload an image file');
        return;
      }
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      
      // Create bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket('partners', {
        public: true,
        fileSizeLimit: 5 * 1024 * 1024, // 5MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
      });
      
      if (bucketError && !bucketError.message.includes('already exists')) {
        throw bucketError;
      }
      
      // Upload image to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `profile-${Date.now()}.${fileExt}`;
      const filePath = `${partnerId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('partners')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('partners')
        .getPublicUrl(filePath);
      
      // Update profile
      setProfile({
        ...profile,
        profile_image: publicUrl
      });
      
      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('partners')
        .update({ profile_image: publicUrl })
        .eq('id', partnerId);
        
      if (updateError) throw updateError;
      
      toast.success('Profile image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    
    try {
      setUploadingDocument(true);
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Document size must be less than 10MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PDF, image, or document file');
        return;
      }
      
      // Create bucket if it doesn't exist
      const { error: bucketError } = await supabase.storage.createBucket('partner_documents', {
        public: false,
        fileSizeLimit: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: allowedTypes
      });
      
      if (bucketError && !bucketError.message.includes('already exists')) {
        throw bucketError;
      }
      
      // Create directory structure if needed
      await supabase.storage
        .from('partner_documents')
        .upload(`${partnerId}/license/.keep`, new Blob([''], { type: 'text/plain' }), { upsert: true });
      
      // Upload document to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `license-${Date.now()}.${fileExt}`;
      const filePath = `${partnerId}/license/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('partner_documents')
        .upload(filePath, file, { upsert: true });
      
      if (uploadError) throw uploadError;
      
      setDocumentName(file.name);
      toast.success('Medical license uploaded successfully');
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!profile || !profile.profile_image) return;
    
    try {
      setUploadingImage(true);
      
      // Extract file path from URL
      const url = new URL(profile.profile_image);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const filePath = `${partnerId}/${fileName}`;
      
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('partners')
        .remove([filePath]);
      
      if (deleteError) throw deleteError;
      
      // Update profile
      const updatedProfile = {
        ...profile,
        profile_image: null
      };
      
      setProfile(updatedProfile);
      
      // Update the profile in the database
      const { error: updateError } = await supabase
        .from('partners')
        .update({ profile_image: null })
        .eq('id', partnerId);
        
      if (updateError) throw updateError;
      
      toast.success('Profile image removed successfully');
    } catch (error) {
      console.error('Error removing image:', error);
      toast.error('Failed to remove image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveDocument = async () => {
    if (!documentName) return;
    
    try {
      setUploadingDocument(true);
      
      // Remove from storage
      const { error: deleteError } = await supabase.storage
        .from('partner_documents')
        .remove([`${partnerId}/license/${documentName}`]);
      
      if (deleteError) throw deleteError;
      
      setDocumentName(null);
      toast.success('Medical license removed successfully');
    } catch (error) {
      console.error('Error removing document:', error);
      toast.error('Failed to remove document: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploadingDocument(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from('partners')
        .update({
          name: profile.name,
          practice_name: profile.practice_name,
          practice_address: profile.practice_address,
          email: profile.email,
          phone: profile.phone,
          specialties: profile.specialties,
          profile_image: profile.profile_image,
          website: profile.website,
          bio: profile.bio,
          consultation_fee: profile.consultation_fee,
          video_consultation: profile.video_consultation,
          in_person_consultation: profile.in_person_consultation,
          accepting_new_patients: profile.accepting_new_patients
        })
        .eq('id', partnerId);
      
      if (error) throw error;
      
      toast.success('Practice profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to update practice profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Briefcase className="h-5 w-5 mr-2 text-leaf-600" />
            Loading Practice Profile...
          </h2>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-40 bg-gray-100 rounded-lg"></div>
          <div className="h-8 bg-gray-100 rounded w-1/3"></div>
          <div className="h-8 bg-gray-100 rounded"></div>
          <div className="h-8 bg-gray-100 rounded"></div>
          <div className="h-24 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center py-12">
          <Briefcase className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Not Found</h3>
          <p className="text-gray-600 mb-6">
            We couldn't find your practice profile. Please contact support.
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center mb-4 sm:mb-0">
          <Briefcase className="h-5 w-5 mr-2 text-leaf-600" />
          Practice Profile
        </h2>
        
        <Button
          onClick={handleSaveProfile}
          isLoading={saving}
        >
          Save Changes
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Image & Basic Info */}
        <div className="space-y-6">
          {/* Profile Image */}
          <div className="text-center">
            <div className="relative inline-block">
              <div className="h-40 w-40 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mx-auto">
                {profile.profile_image ? (
                  <img
                    src={profile.profile_image}
                    alt={profile.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Briefcase className="h-16 w-16 text-gray-400" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 bg-leaf-600 text-white p-2 rounded-full cursor-pointer hover:bg-leaf-700 transition-colors">
                <Camera className="h-5 w-5" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                  ref={profileImageInputRef}
                  disabled={uploadingImage}
                />
              </label>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {uploadingImage ? 'Uploading...' : 'Click the camera icon to upload a new profile image'}
            </p>
            {profile.profile_image && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRemoveImage}
                className="mt-2"
                disabled={uploadingImage}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Image
              </Button>
            )}
          </div>

          {/* Accepting New Patients Toggle */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Accepting New Patients</h3>
                <p className="text-sm text-gray-500">
                  Toggle this setting to control whether you're accepting new patients
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="accepting_new_patients"
                  checked={profile.accepting_new_patients !== false}
                  onChange={handleCheckboxChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-leaf-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-leaf-600"></div>
              </label>
            </div>
          </div>

          {/* Consultation Types */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 mb-3">Consultation Types</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="video_consultation"
                  checked={profile.video_consultation}
                  onChange={handleCheckboxChange}
                  className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                />
                <span className="ml-2 text-gray-700">Video Consultation</span>
              </label>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="in_person_consultation"
                  checked={profile.in_person_consultation}
                  onChange={handleCheckboxChange}
                  className="rounded border-gray-300 text-leaf-600 focus:ring-leaf-500"
                />
                <span className="ml-2 text-gray-700">In-Person Consultation</span>
              </label>
            </div>
          </div>

          {/* Consultation Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consultation Fee ($)
            </label>
            <Input
              type="number"
              name="consultation_fee"
              value={profile.consultation_fee}
              onChange={handleInputChange}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        {/* Middle Column - Contact & Practice Info */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <Input
              name="name"
              value={profile.name}
              onChange={handleInputChange}
              icon={<Briefcase className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Practice Name
            </label>
            <Input
              name="practice_name"
              value={profile.practice_name}
              onChange={handleInputChange}
              icon={<Briefcase className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              name="email"
              value={profile.email}
              onChange={handleInputChange}
              icon={<Mail className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              type="tel"
              name="phone"
              value={profile.phone}
              onChange={handleInputChange}
              icon={<Phone className="h-5 w-5 text-gray-400" />}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Website (Optional)
            </label>
            <Input
              type="url"
              name="website"
              value={profile.website || ''}
              onChange={handleInputChange}
              icon={<Globe className="h-5 w-5 text-gray-400" />}
              placeholder="https://example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bio / About
            </label>
            <textarea
              name="bio"
              value={profile.bio || ''}
              onChange={handleInputChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-leaf-500 focus:border-transparent resize-none"
              placeholder="Tell patients about your practice, experience, and approach..."
            />
          </div>
        </div>

        {/* Right Column - Address & Specialties */}
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Practice Address</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  name="address.street"
                  value={profile.practice_address?.street || ''}
                  onChange={handleInputChange}
                  icon={<MapPin className="h-5 w-5 text-gray-400" />}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <Input
                    name="address.city"
                    value={profile.practice_address?.city || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State
                  </label>
                  <Input
                    name="address.state"
                    value={profile.practice_address?.state || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code
                  </label>
                  <Input
                    name="address.zip"
                    value={profile.practice_address?.zip || ''}
                    onChange={handleInputChange}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country
                  </label>
                  <Input
                    name="address.country"
                    value={profile.practice_address?.country || ''}
                    onChange={handleInputChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Specialties</h3>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <Input
                  value={newSpecialty}
                  onChange={(e) => setNewSpecialty(e.target.value)}
                  placeholder="Add a specialty..."
                  className="flex-1"
                />
                <Button
                  onClick={handleAddSpecialty}
                  disabled={!newSpecialty.trim()}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {profile.specialties?.map((specialty) => (
                  <div
                    key={specialty}
                    className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm flex items-center"
                  >
                    {specialty}
                    <button
                      onClick={() => handleRemoveSpecialty(specialty)}
                      className="ml-2 text-gray-500 hover:text-gray-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                
                {(!profile.specialties || profile.specialties.length === 0) && (
                  <p className="text-gray-500 text-sm">
                    No specialties added yet
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">Medical License</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              {documentName ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <FileText className="h-8 w-8 text-leaf-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">{documentName}</p>
                  <div className="flex justify-center space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => documentInputRef.current?.click()}
                      disabled={uploadingDocument}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Replace
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleRemoveDocument}
                      disabled={uploadingDocument}
                      className="text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <FileText className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 mb-2">
                    {uploadingDocument ? 'Uploading...' : 'Upload your medical license or certification'}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={uploadingDocument}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </>
              )}
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleDocumentUpload}
                ref={documentInputRef}
                disabled={uploadingDocument}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}