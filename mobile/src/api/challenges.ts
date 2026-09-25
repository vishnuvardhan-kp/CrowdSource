import { apiClient } from './client';
import {
  ChallengeItem,
  ChallengeDetail,
  CreateChallengeDraftPayload,
  UpdateChallengeDraftPayload,
  EvidenceItem,
} from '../types';

export const challengesApi = {
  async getMyChallenges(): Promise<ChallengeItem[]> {
    return apiClient<ChallengeItem[]>('/challenges/my');
  },

  async getChallengeById(id: string): Promise<ChallengeDetail> {
    return apiClient<ChallengeDetail>(`/challenges/${id}`);
  },

  async createDraft(payload: CreateChallengeDraftPayload): Promise<ChallengeItem> {
    return apiClient<ChallengeItem>('/challenges', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateDraft(
    id: string,
    payload: UpdateChallengeDraftPayload,
  ): Promise<ChallengeItem> {
    return apiClient<ChallengeItem>(`/challenges/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  async deleteDraft(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient<{ success: boolean; message: string }>(`/challenges/${id}`, {
      method: 'DELETE',
    });
  },

  async uploadEvidence(
    challengeId: string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    title?: string,
  ): Promise<EvidenceItem> {
    const formData = new FormData();

    // Standard React Native / Expo FormData file append syntax
    const filePayload: any = {
      uri: fileUri,
      name: fileName || 'evidence.jpg',
      type: mimeType || 'image/jpeg',
    };
    formData.append('file', filePayload);

    if (title) {
      formData.append('title', title);
    }

    return apiClient<EvidenceItem>(`/challenges/${challengeId}/evidence`, {
      method: 'POST',
      body: formData,
    });
  },

  async deleteEvidence(
    challengeId: string,
    evidenceId: string,
  ): Promise<{ success: boolean }> {
    return apiClient<{ success: boolean }>(
      `/challenges/${challengeId}/evidence/${evidenceId}`,
      {
        method: 'DELETE',
      },
    );
  },

  async submitChallenge(id: string): Promise<ChallengeItem> {
    return apiClient<ChallengeItem>(`/challenges/${id}/submit`, {
      method: 'POST',
      timeoutMs: 90000,
    });
  },

  async translateChallenge(
    id: string,
    targetLanguage: string,
  ): Promise<{
    id: string;
    target_language: string;
    translated_title: string;
    translated_description: string;
    cached: boolean;
  }> {
    return apiClient(`/challenges/${id}/translate`, {
      method: 'POST',
      body: JSON.stringify({ target_language: targetLanguage }),
    });
  },
};
