import { createClient } from "@supabase/supabase-js";

// Load Supabase credentials from environment variables
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

// Validate URL format
try {
  new URL(SUPABASE_URL);
} catch (error) {
  throw new Error(`Invalid Supabase URL format: ${SUPABASE_URL}`);
}

// Create client with proper configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Content-Type': 'application/json'
    },
    fetch: async (...args) => {
      const [url, config] = args;
      const retries = 3;
      const baseDelay = 1000; // 1 second

      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          const response = await fetch(url, config);
          if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`, {
              url: url.toString(),
              status: response.status,
              statusText: response.statusText,
              attempt: attempt + 1
            });
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response;
        } catch (error) {
          if (attempt === retries - 1) throw error;
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
        }
      }
      throw new Error('Max retries exceeded');
    }
  },
  // Increase timeout to handle slow connections
  realtime: {
    timeout: 60000 // 60 seconds
  }
});

// Helper function to clear Supabase cache
export const clearSupabaseCache = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.auth.refreshSession();
    }
    // Clear local storage cache
    localStorage.removeItem('supabase.auth.token');
    // Clear any cached data
    await supabase.auth.signOut({ scope: 'local' });
    return { success: true };
  } catch (error) {
    console.error('Error clearing cache:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Helper function to get storage URL for avatars
const getAvatarUrl = (userId: string, filename: string) => {
  return `${SUPABASE_URL}/storage/v1/object/public/avatars/${userId}/${filename}`;
};

// Function to flush all cache with retry mechanism
export const flushCache = async (retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Clear localStorage
      localStorage.clear();
      
      // Clear sessionStorage
      sessionStorage.clear();
      
      // Clear Supabase cache
      await clearSupabaseCache();
      
      return { success: true };
    } catch (error) {
      console.error(`Cache flush attempt ${attempt} failed:`, error);
      if (attempt === retries) {
        return { 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
      }
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  return { success: false, error: new Error('Max retries exceeded') };
};

// Function to check Supabase connection with retry mechanism
export const checkSupabaseConnection = async (retries = 3, delay = 1000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      // Try a simple query to check connection
      const { error } = await supabase
        .from('users')
        .select('id', { count: 'exact', head: true });
        
      if (error) {
        throw error;
      }
      
      return { 
        connected: true,
        attempt,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error(`Connection check attempt ${attempt} failed:`, error);
      
      // Format error message
      const errorMessage = error instanceof Error ? error.message : 
        typeof error === 'object' && error !== null ? JSON.stringify(error) : 
        'Unknown error occurred';
      
      if (attempt === retries) {
        return { 
          connected: false, 
          error: errorMessage,
          attempt,
          timestamp: new Date().toISOString()
        };
      }
      // Wait before retrying with exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  return { 
    connected: false, 
    error: 'Max retries exceeded',
    attempts: retries,
    timestamp: new Date().toISOString()
  };
};