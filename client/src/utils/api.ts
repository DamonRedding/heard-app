// Centralized API utilities for consistent fetch handling
import { API_CONFIG, buildApiUrl, apiFetch } from '@/config/api';

// Re-export config for convenience
export { API_CONFIG, buildApiUrl };

// Typed API response wrapper
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Generic GET request
export async function apiGet<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint);
  return response.json();
}

// Generic POST request
export async function apiPost<T>(endpoint: string, data: any): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return response.json();
}

// Generic PUT request
export async function apiPut<T>(endpoint: string, data: any): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
  return response.json();
}

// Generic DELETE request
export async function apiDelete<T>(endpoint: string): Promise<T> {
  const response = await apiFetch(endpoint, {
    method: 'DELETE',
  });
  return response.json();
}

// Specific API methods for your app
export const api = {
  // Submissions
  getSubmissions: (params?: URLSearchParams) =>
    apiGet<any>(`${API_CONFIG.endpoints.submissions}${params ? `?${params}` : ''}`),

  getSubmission: (id: string) =>
    apiGet<any>(API_CONFIG.endpoints.submission(id)),

  createSubmission: (data: any) =>
    apiPost<any>(API_CONFIG.endpoints.submissions, data),

  // Voting
  vote: (submissionId: string, voteType: 'condemn' | 'absolve') =>
    apiPost<any>(API_CONFIG.endpoints.vote(submissionId), { voteType }),

  // Comments
  getComments: (submissionId: string) =>
    apiGet<any>(API_CONFIG.endpoints.comments(submissionId)),

  createComment: (submissionId: string, content: string, parentId?: string) =>
    apiPost<any>(API_CONFIG.endpoints.comments(submissionId), { content, parentId }),

  // Reactions
  addReaction: (submissionId: string, reactionType: string) =>
    apiPost<any>(API_CONFIG.endpoints.reactions(submissionId), { reactionType }),

  // Church Ratings
  searchChurches: (query: string) =>
    apiGet<any>(`${API_CONFIG.endpoints.churches}?q=${encodeURIComponent(query)}`),

  submitChurchRating: (data: any) =>
    apiPost<any>(API_CONFIG.endpoints.churchRatings, data),

  // Email Subscription
  subscribe: (email: string, preferences: any) =>
    apiPost<any>(API_CONFIG.endpoints.subscribe, { email, ...preferences }),

  unsubscribe: (token: string) =>
    apiPost<any>(API_CONFIG.endpoints.unsubscribe, { token }),
};

// Debug helper for development
if (import.meta.env.DEV) {
  console.log('API Configuration:', {
    baseURL: API_CONFIG.baseURL,
    isRemoteAPI: API_CONFIG.isRemoteAPI,
    useProductionAPI: import.meta.env.VITE_USE_PRODUCTION_API,
  });
}