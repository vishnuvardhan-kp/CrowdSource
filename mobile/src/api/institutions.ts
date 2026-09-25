import { apiClient } from './client';

export interface Institution {
  id: string;
  name: string;
  type: string;
  subtype: string;
  lgd_code: string;
  state: string;
  district_name?: string | null;
  block_name?: string | null;
  hierarchy_level: string;
}

export interface InstitutionMembership {
  id: string;
  user_id: string;
  institution_id: string;
  relationship: string;
  designation: string;
  authority_status: string;
  authority_source: string;
  verified_at?: string | null;
  verification_notes?: string | null;
  institution: Institution;
  evidence?: any[];
}

export const institutionsApi = {
  async search(params: {
    type?: string;
    subtype?: string;
    district_id?: string;
    block_id?: string;
    search?: string;
    lgd_code?: string;
  }): Promise<{ items: Institution[]; total: number }> {
    const query = new URLSearchParams();
    if (params.type) query.append('type', params.type);
    if (params.subtype) query.append('subtype', params.subtype);
    if (params.district_id) query.append('district_id', params.district_id);
    if (params.block_id) query.append('block_id', params.block_id);
    if (params.search) query.append('search', params.search);
    if (params.lgd_code) query.append('lgd_code', params.lgd_code);

    const queryString = query.toString();
    const endpoint = queryString ? `/institutions/search?${queryString}` : '/institutions/search';
    return apiClient<{ items: Institution[]; total: number }>(endpoint);
  },

  async verifyLgd(code: string): Promise<any> {
    return apiClient<any>(`/institutions/lgd/${encodeURIComponent(code.trim())}`);
  },

  async getMyMemberships(): Promise<InstitutionMembership[]> {
    return apiClient<InstitutionMembership[]>('/institution-memberships/me');
  },

  async createMembership(dto: {
    institution_id: string;
    relationship: string;
    designation: string;
    official_email?: string;
    official_phone?: string;
    department_name?: string;
  }): Promise<InstitutionMembership> {
    return apiClient<InstitutionMembership>('/institution-memberships', {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },

  async uploadEvidence(
    membershipId: string,
    dto: {
      evidence_type: string;
      document_name: string;
      document_url: string;
      mime_type?: string;
      file_size?: number;
    },
  ): Promise<any> {
    return apiClient<any>(`/institution-memberships/${membershipId}/evidence`, {
      method: 'POST',
      body: JSON.stringify(dto),
    });
  },
};
