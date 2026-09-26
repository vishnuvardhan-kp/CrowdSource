import { apiClient } from './client';
import { ProblemClusterSummary } from '../types';

export const clustersApi = {
  async getClusterById(id: string): Promise<ProblemClusterSummary> {
    return apiClient<ProblemClusterSummary>(`/problem-clusters/${id}`);
  },
};
