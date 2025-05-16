import { create } from 'zustand';
import { supabase, clearSupabaseCache } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  role: 'member' | 'admin' | 'partner';
  full_name?: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any; data: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (newPassword: string) => Promise<{ error: any }>;
  setUser: (user: User | null) => void;
  refreshSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user, loading: false }),
  
  refreshSession: async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      
      if (session?.user) {
        // Get user role from profiles table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();
          
        // If profile lookup fails, try users table as fallback
        if (profileError) {
          console.warn('Profile lookup failed, trying users table:', profileError);
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role, full_name')
            .eq('id', session.user.id)
            .single();
            
          if (userError) {
            console.warn('Users table lookup failed:', userError);
            // Use metadata as last resort
            const userData = {
              id: session.user.id,
              email: session.user.email || '',
              role: (session.user.user_metadata?.role || 'member') as 'member' | 'admin' | 'partner',
              full_name: session.user.user_metadata?.full_name || ''
            };
            
            set({ user: userData, loading: false });
            return;
          }
          
          // Create user data from users table
          const userDataFromTable = {
            id: session.user.id,
            email: session.user.email || '',
            role: (userData?.role || 'member') as 'member' | 'admin' | 'partner',
            full_name: userData?.full_name || session.user.user_metadata?.full_name || ''
          };
          
          set({ user: userDataFromTable, loading: false });
          return;
        }
        
        // Create user data from profile
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          role: (profileData?.role || 'member') as 'member' | 'admin' | 'partner',
          full_name: profileData?.full_name || session.user.user_metadata?.full_name || ''
        };
        
        set({ user: userData, loading: false });
      } else {
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('Session refresh error:', error);
      set({ user: null, loading: false });
    }
  },

  signIn: async (email, password) => {
    try {
      await clearSupabaseCache();
      
      // Log the attempt for debugging
      console.log(`Attempting to sign in with email: ${email.substring(0, 3)}...`);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Sign in error details:', {
          message: error.message,
          status: error.status,
          name: error.name
        });
        throw error;
      }

      if (!data.user) {
        throw new Error('No user data returned');
      }

      // Get user role from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user.id)
        .single();
        
      // If profile lookup fails, try users table as fallback
      if (profileError) {
        console.warn('Profile lookup failed, trying users table:', profileError);
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', data.user.id)
          .single();
          
        if (userError) {
          console.warn('Users table lookup failed, using metadata:', userError);
          // Use metadata as last resort
          const userDataFromMeta = {
            id: data.user.id,
            email: data.user.email || '',
            role: (data.user.user_metadata?.role || 'member') as 'member' | 'admin' | 'partner',
            full_name: data.user.user_metadata?.full_name || ''
          };
          
          set({ user: userDataFromMeta });
          return { error: null, data: { user: userDataFromMeta } };
        }
        
        // Create user data from users table
        const userDataFromTable = {
          id: data.user.id,
          email: data.user.email || '',
          role: (userData?.role || 'member') as 'member' | 'admin' | 'partner',
          full_name: userData?.full_name || data.user.user_metadata?.full_name || ''
        };
        
        set({ user: userDataFromTable });
        return { error: null, data: { user: userDataFromTable } };
      }
      
      // Create user data from profile
      const userData = {
        id: data.user.id,
        email: data.user.email || '',
        role: (profileData?.role || 'member') as 'member' | 'admin' | 'partner',
        full_name: profileData?.full_name || data.user.user_metadata?.full_name || ''
      };

      set({ user: userData });
      return { error: null, data: { user: userData } };
    } catch (error) {
      console.error('Sign in error:', error);
      
      // Check for specific error types to provide better user feedback
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          return { 
            error: { 
              message: 'Network error. Please check your internet connection and try again.',
              isNetworkError: true
            }, 
            data: null 
          };
        }
        
        if (error.message.includes('Invalid login credentials')) {
          return { 
            error: { 
              message: 'Invalid email or password. Please try again.',
              isCredentialsError: true
            }, 
            data: null 
          };
        }
      }
      
      return { error, data: null };
    }
  },

  signUp: async (email, password, fullName) => {
    try {
      await clearSupabaseCache();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'member' // Default role for new users
          },
          emailRedirectTo: `${window.location.origin}/auth/confirm`
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('No user data returned');

      // Create profile record for the new user
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: data.user.id,
          full_name: fullName,
          role: 'member'
        }]);
        
      if (profileError) {
        console.warn('Failed to create profile record:', profileError);
      }

      toast.success('Registration successful! Please check your email to confirm your account.');
      return { error: null };
    } catch (error) {
      console.error('Sign up error:', error);
      return { error };
    }
  },

  signOut: async () => {
    try {
      await clearSupabaseCache();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      set({ user: null });
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Error signing out');
    }
  },

  resetPassword: async (email) => {
    try {
      await clearSupabaseCache();
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      return { error };
    } catch (error) {
      console.error('Reset password error:', error);
      return { error };
    }
  },

  updatePassword: async (newPassword) => {
    try {
      await clearSupabaseCache();
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      return { error };
    } catch (error) {
      console.error('Update password error:', error);
      return { error };
    }
  }
}));

// Initialize auth state
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session?.user) {
    try {
      // Get user role from profiles table
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single();
        
      // If profile lookup fails, try users table as fallback
      if (profileError) {
        console.warn('Profile lookup failed in auth state change, trying users table:', profileError);
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, full_name')
          .eq('id', session.user.id)
          .single();
          
        if (userError) {
          console.warn('Users table lookup failed in auth state change, using metadata:', userError);
          // Use metadata as last resort
          const userDataFromMeta = {
            id: session.user.id,
            email: session.user.email || '',
            role: (session.user.user_metadata?.role || 'member') as 'member' | 'admin' | 'partner',
            full_name: session.user.user_metadata?.full_name || ''
          };
          
          useAuthStore.getState().setUser(userDataFromMeta);
          return;
        }
        
        // Create user data from users table
        const userDataFromTable = {
          id: session.user.id,
          email: session.user.email || '',
          role: (userData?.role || 'member') as 'member' | 'admin' | 'partner',
          full_name: userData?.full_name || session.user.user_metadata?.full_name || ''
        };
        
        useAuthStore.getState().setUser(userDataFromTable);
        return;
      }
      
      // Create user data from profile
      const userData = {
        id: session.user.id,
        email: session.user.email || '',
        role: (profileData?.role || 'member') as 'member' | 'admin' | 'partner',
        full_name: profileData?.full_name || session.user.user_metadata?.full_name || ''
      };

      useAuthStore.getState().setUser(userData);
    } catch (error) {
      console.error('Error in auth state change:', error);
      useAuthStore.getState().setUser(null);
    }
  } else if (event === 'SIGNED_OUT') {
    useAuthStore.getState().setUser(null);
  }
});