import { apiClient } from './client';
import { DistrictItem, BlockItem } from '../types';

export const locationsApi = {
  async getDistricts(): Promise<DistrictItem[]> {
    return apiClient<DistrictItem[]>('/locations/districts');
  },

  async getBlocks(districtId: string): Promise<BlockItem[]> {
    return apiClient<BlockItem[]>(`/locations/districts/${districtId}/blocks`);
  },
};
