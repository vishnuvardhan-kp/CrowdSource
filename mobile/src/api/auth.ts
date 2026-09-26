import { apiClient } from './client';
import { UserProfile } from '../types';

export interface AuthResponse {
  accessToken?: string;
  access_token?: string;
  user: UserProfile;
}

export const authApi = {
  async login(identifier: string, password: string): Promise<AuthResponse> {
    const isEmail = identifier.includes('@');
    const body = isEmail
      ? { email: identifier.trim(), password }
      : { identifier: identifier.trim(), phone: identifier.trim(), password };
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
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
