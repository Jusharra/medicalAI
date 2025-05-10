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
        // Create basic user object from auth data
        const userData = {
          id: session.user.id,
          email: session.user.email || '',
          role: (session.user.user_metadata?.role || 'member') as 'member' | 'admin' | 'partner',
          full_name: session.user.user_metadata?.full_name || ''
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

      // Create user data object from auth data
      const userData = {
        id: data.user.id,
        email: data.user.email || '',
        role: (data.user.user_metadata?.role || 'member') as 'member' | 'admin' | 'partner',
        full_name: data.user.user_metadata?.full_name || ''
      };

      set({ user: userData });
      return { error: null, data: { user: userData } };
    } catch (error) {
      console.error('Sign in error:', error);
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
      // Create user data object from auth data
      const userData = {
        id: session.user.id,
        email: session.user.email || '',
        role: (session.user.user_metadata?.role || 'member') as 'member' | 'admin' | 'partner',
        full_name: session.user.user_metadata?.full_name || ''
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