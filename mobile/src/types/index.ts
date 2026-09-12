export enum UserRole {
  CITIZEN = 'CITIZEN',
  GOVERNMENT_OFFICER = 'GOVERNMENT_OFFICER',
  GOVERNMENT_ADMIN = 'GOVERNMENT_ADMIN',
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
  UNIVERSITY_ADMIN = 'UNIVERSITY_ADMIN',
  FACULTY = 'FACULTY',
  STUDENT = 'STUDENT',
  INDUSTRY_ADMIN = 'INDUSTRY_ADMIN',
  INDUSTRY_MEMBER = 'INDUSTRY_MEMBER',
}

export enum ChallengeStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VALIDATED = 'VALIDATED',
  REJECTED = 'REJECTED',
  MATCHING = 'MATCHING',
  MATCHED = 'MATCHED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
  PROJECT_INITIATED = 'PROJECT_INITIATED',
}

export enum CitizenSeverity {
  NOT_SURE = 'NOT_SURE',
  MODERATE = 'MODERATE',
  SERIOUS = 'SERIOUS',
}

export enum ChallengePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum EvidenceType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
  LINK = 'LINK',
  LOCATION_DATA = 'LOCATION_DATA',
  SURVEY_DATA = 'SURVEY_DATA',
  OTHER = 'OTHER',
}

export enum ProblemClusterStatus {
  AWAITING_GOVERNMENT_VERIFICATION = 'AWAITING_GOVERNMENT_VERIFICATION',
  VALIDATED = 'VALIDATED',
  OPEN_FOR_SOLUTIONS = 'OPEN_FOR_SOLUTIONS',
  COLLABORATION = 'COLLABORATION',
  PROJECT_INITIATED = 'PROJECT_INITIATED',
  RESOLVED = 'RESOLVED',
  REJECTED = 'REJECTED',
}

export enum ClusteringStatus {
  CLUSTERED = 'CLUSTERED',
  POTENTIAL_MATCH = 'POTENTIAL_MATCH',
  INDEPENDENT = 'INDEPENDENT',
  SINGLE = 'SINGLE',
}

export interface OrganizationMembershipInfo {
  id: string;
  organization_id: string;
  organization_name: string | null;
  organization_type: string | null;
  organization_role: 'ADMIN' | 'MEMBER';
  membership_status: 'PENDING' | 'ACTIVE' | 'INACTIVE' | 'REVOKED';
  created_at: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole | string;
  phone?: string | null;
  is_active?: boolean;
  memberships?: OrganizationMembershipInfo[];
  created_at?: string;
}

export interface DistrictItem {
  id: string;
  name: string;
  state?: string;
}

export interface BlockItem {
  id: string;
  name: string;
  district_id?: string;
}

export interface EvidenceItem {
  id: string;
  title: string;
  description?: string | null;
  evidence_type: EvidenceType | string;
  url: string;
  mime_type: string;
  created_at: string;
}

export interface ProblemClusterSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  district: string;
  status: ProblemClusterStatus | string;
  priority: ChallengePriority | string;
  priority_score: number;
  report_count: number;
  ai_confidence?: number;
  ai_processing_status?: string;
  priority_reasons?: string[];
  created_at: string;
}

export interface ChallengeItem {
  id: string;
  title: string;
  description: string;
  status: ChallengeStatus | string;
  district_id?: string | null;
  block_id?: string | null;
  districtName?: string | null;
  blockName?: string | null;
  village_locality?: string | null;
  citizen_severity?: CitizenSeverity | string | null;
  affected_population?: string | null;
  category?: string | null;
  created_at: string;
  submitted_at?: string | null;
  validated_at?: string | null;
  rejection_reason?: string | null;
  evidenceCount?: number;
  confirmationsCount?: number;
  cluster_id?: string | null;
  clustering_status?: ClusteringStatus | string | null;
  original_text?: string | null;
  original_language?: string | null;
  normalized_text?: string | null;
  processing_language?: string | null;
  translation_status?: string | null;
  translation_metadata?: any | null;
}

export interface AiAnalysisData {
  category?: string;
  sub_category?: string;
  summary?: string;
  priority_score?: number;
  severity_score?: number;
  confidence?: number;
  model_name?: string;
  domain?: string;
  subdomain?: string;
  keywords?: string[];
  required_technologies?: string[];
  required_capabilities?: string[];
  ai_processing_status?: 'SUCCESS' | 'FALLBACK';
}

export interface ChallengeDetail extends ChallengeItem {
  district?: string;
  state?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  priority?: ChallengePriority | string;
  updated_at?: string;
  evidence: EvidenceItem[];
  hasConfirmed?: boolean;
  isOwner?: boolean;
  submitter?: {
    name: string;
  };
  cluster?: ProblemClusterSummary | null;
  aiAnalysis?: AiAnalysisData | null;
  verification_display_status?: string;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  reference_type?: string;
  reference_id?: string;
  is_read: boolean;
  action_url?: string;
  created_at: string;
}

export interface CreateChallengeDraftPayload {
  title: string;
  description: string;
  citizen_severity?: CitizenSeverity;
  category?: string;
}

export interface UpdateChallengeDraftPayload {
  title?: string;
  description?: string;
  district_id?: string;
  block_id?: string;
  village_locality?: string;
  citizen_severity?: CitizenSeverity;
  affected_population?: string;
  latitude?: number;
  longitude?: number;
  category?: string;
}
