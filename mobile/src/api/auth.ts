import { apiClient } from './client';
import { UserProfile } from '../types';

export interface AuthResponse {
  accessToken?: string;
  access_token?: string;
  user: UserProfile;
}

export const authApi = {
  async login(email: string, password: string): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(data: {
    name: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<AuthResponse> {
    return apiClient<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  async getMe(): Promise<UserProfile> {
    return apiClient<UserProfile>('/auth/me', {
      method: 'GET',
    });
  },
};
