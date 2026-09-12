import { storage } from './storage';
import { config } from '../constants/config';

interface DraftLocalMetadata {
  id: string;
  step: number;
  title: string;
  updatedAt: string;
}

const DRAFT_META_KEY = `${config.storageKeys.activeDraftId}_meta`;

export const draftStorage = {
  async saveActiveDraft(id: string, step = 1, title = ''): Promise<void> {
    await storage.setItem(config.storageKeys.activeDraftId, id);
    const meta: DraftLocalMetadata = {
      id,
      step,
      title,
      updatedAt: new Date().toISOString(),
    };
    await storage.setItem(DRAFT_META_KEY, JSON.stringify(meta));
  },

  async getActiveDraft(): Promise<DraftLocalMetadata | null> {
    const id = await storage.getItem(config.storageKeys.activeDraftId);
    if (!id) return null;

    const rawMeta = await storage.getItem(DRAFT_META_KEY);
    if (rawMeta) {
      try {
        return JSON.parse(rawMeta) as DraftLocalMetadata;
      } catch {
        // malformed, return basic
      }
    }

    return {
      id,
      step: 1,
      title: '',
      updatedAt: new Date().toISOString(),
    };
  },

  async clearActiveDraft(): Promise<void> {
    await storage.removeItem(config.storageKeys.activeDraftId);
    await storage.removeItem(DRAFT_META_KEY);
  },
};
