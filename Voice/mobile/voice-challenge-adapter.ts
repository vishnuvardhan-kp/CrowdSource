import {
  VoiceChallengeAdapter,
  ChallengeItem,
  CitizenSeverity,
} from './voice-types';

/**
 * Factory to create a VoiceChallengeAdapter from host application functions.
 */
export function createVoiceChallengeAdapter(handlers: {
  createDraft: (params: {
    title: string;
    description: string;
    district_id: string;
    block_id: string;
    village_locality?: string;
    citizen_severity?: CitizenSeverity;
    category?: string;
    original_language?: string;
    original_text?: string;
  }) => Promise<{ id: string }>;
  submitChallenge: (challengeId: string) => Promise<ChallengeItem>;
}): VoiceChallengeAdapter {
  return {
    createDraft: handlers.createDraft,
    submitChallenge: handlers.submitChallenge,
  };
}

/**
 * Default HTTP Challenge Adapter connecting to standard Challenge endpoints.
 */
export class HttpVoiceChallengeAdapter implements VoiceChallengeAdapter {
  constructor(
    private readonly baseUrl: string,
    private readonly getAuthToken: () => Promise<string | null>,
  ) {}

  async createDraft(params: {
    title: string;
    description: string;
    district_id: string;
    block_id: string;
    village_locality?: string;
    citizen_severity?: CitizenSeverity;
    category?: string;
    original_language?: string;
    original_text?: string;
  }): Promise<{ id: string }> {
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/challenges/draft`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create draft challenge: ${errorText}`);
    }

    const data = await response.json();
    return { id: data.id || data.data?.id };
  }

  async submitChallenge(challengeId: string): Promise<ChallengeItem> {
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/challenges/${challengeId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to submit challenge: ${errorText}`);
    }

    const data = await response.json();
    return data.data || data;
  }
}
