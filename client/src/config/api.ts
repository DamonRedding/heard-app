// API Configuration for local and production environments

const isDevelopment = import.meta.env.DEV;
const isProduction = import.meta.env.PROD;

// Check if we should use production API in development
const useProductionAPI = import.meta.env.VITE_USE_PRODUCTION_API === 'true';

// Get the API URL from environment or use defaults
const productionAPIUrl = import.meta.env.VITE_API_URL || 'https://churchheard.com';

export const API_CONFIG = {
  // Base URL for API calls
  baseURL: (() => {
    // In production build (on device), use relative URLs
    if (isProduction) {
      return '';
    }

    // In development with production API flag
    if (isDevelopment && useProductionAPI) {
      return productionAPIUrl;
    }

    // Default local development
    return '';
  })(),

  // Whether we're using a remote API
  isRemoteAPI: isDevelopment && useProductionAPI,

  // API endpoints
  endpoints: {
    submissions: '/api/submissions',
    submissionsPersonalized: '/api/submissions/personalized',
    submission: (id: string) => `/api/submissions/${id}`,
    vote: (id: string) => `/api/submissions/${id}/vote`,
    flag: (id: string) => `/api/submissions/${id}/flag`,
    metoo: (id: string) => `/api/submissions/${id}/metoo`,
    comments: (id: string) => `/api/submissions/${id}/comments`,
    comment: (submissionId: string, commentId: string) => `/api/submissions/${submissionId}/comments/${commentId}`,
    reactions: (id: string) => `/api/submissions/${id}/reactions`,
    subscribe: '/api/subscribe',
    unsubscribe: '/api/unsubscribe',
    churches: '/api/churches',
    churchRatings: '/api/church-ratings',
  }
};

// Helper function to build full API URLs
export function buildApiUrl(endpoint: string): string {
  return `${API_CONFIG.baseURL}${endpoint}`;
}

// Helper function for fetch with proper error handling
export async function apiFetch(endpoint: string, options?: RequestInit): Promise<Response> {
  const url = buildApiUrl(endpoint);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      // Add credentials for CORS when using remote API
      credentials: API_CONFIG.isRemoteAPI ? 'include' : 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error(`API fetch error for ${endpoint}:`, error);
    throw error;
  }
}