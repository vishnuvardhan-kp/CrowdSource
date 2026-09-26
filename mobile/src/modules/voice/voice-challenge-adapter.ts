import { challengesApi } from '../../api/challenges';
import {
  VoiceChallengeAdapter,
  ChallengeItem,
  SamadhanSeverity,
} from './voice-types';

/**
 * SamadhanVoiceChallengeAdapter connects Voice reports directly to
 * SamadhanSetu's existing challengesApi (POST /challenges -> POST /challenges/:id/submit).
 *
 * Ensures proper mapping of severity, location, original language,
 * and text fields into the authoritative backend challenge schema.
 */
export class SamadhanVoiceChallengeAdapter implements VoiceChallengeAdapter {
  async createDraft(params: {
    title: string;
    description: string;
    district_id: string;
    block_id: string;
    village_locality?: string;
    citizen_severity?: SamadhanSeverity;
    category?: string;
    domain?: string | null;
    sub_domain?: string | null;
    original_language?: string;
    original_text?: string;
  }): Promise<{ id: string }> {
    const draft = await challengesApi.createDraft({
      title: params.title,
      description: params.description,
      district_id: params.district_id,
      block_id: params.block_id,
      village_locality: params.village_locality,
      citizen_severity: params.citizen_severity || SamadhanSeverity.MODERATE,
      // Use voice-extracted domain as category; no hardcoded fallback
      category: params.category || params.domain || undefined,
      domain: params.domain || undefined,
      sub_domain: params.sub_domain || undefined,
      original_language: params.original_language || 'en',
      original_text: params.original_text || params.description,
    });

    return { id: draft.id };
  }

  async submitChallenge(challengeId: string): Promise<ChallengeItem> {
    const submitted = await challengesApi.submitChallenge(challengeId);
    return submitted;
  }
}

export const samadhanVoiceChallengeAdapter = new SamadhanVoiceChallengeAdapter();
