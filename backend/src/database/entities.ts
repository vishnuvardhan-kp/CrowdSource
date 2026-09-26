import { User } from '../modules/users/entities/user.entity';
import { Organization } from '../modules/organizations/entities/organization.entity';
import { OrganizationMembership } from '../modules/organizations/entities/organization-membership.entity';
import { OrganizationClaimRequest } from '../modules/organizations/entities/organization-claim-request.entity';
import { Capability } from '../modules/capabilities/entities/capability.entity';
import { InstitutionProfile } from '../modules/institutions/entities/institution-profile.entity';
import { Institution } from '../modules/institutions/entities/institution.entity';
import { InstitutionMembership } from '../modules/institutions/entities/institution-membership.entity';
import { InstitutionEvidence } from '../modules/institutions/entities/institution-evidence.entity';
import { InstitutionAuditLog } from '../modules/institutions/entities/institution-audit-log.entity';
import { Department } from '../modules/institutions/entities/department.entity';
import { FacultyMember } from '../modules/institutions/entities/faculty-member.entity';
import { ResearchArea } from '../modules/institutions/entities/research-area.entity';
import { Laboratory } from '../modules/institutions/entities/laboratory.entity';
import { Facility } from '../modules/institutions/entities/facility.entity';
import { InstitutionCapability } from '../modules/institutions/entities/institution-capability.entity';
import { IndustryProfile } from '../modules/industries/entities/industry-profile.entity';
import { IndustrySector } from '../modules/industries/entities/industry-sector.entity';
import { IndustrySupportType } from '../modules/industries/entities/industry-support-type.entity';
import { IndustryCapability } from '../modules/industries/entities/industry-capability.entity';
import { VerificationRecord } from '../modules/verification/entities/verification-record.entity';
import { Challenge } from '../modules/challenges/entities/challenge.entity';
import { ChallengeEvidence } from '../modules/challenges/entities/challenge-evidence.entity';
import { ChallengeConfirmation } from '../modules/challenges/entities/challenge-confirmation.entity';
import { District } from '../modules/locations/entities/district.entity';
import { Block } from '../modules/locations/entities/block.entity';
import { ChallengeAiAnalysis } from '../modules/ai-analysis/entities/challenge-ai-analysis.entity';
import { EntityEmbedding } from '../modules/ai-analysis/entities/entity-embedding.entity';
import { RecommendationReview } from '../modules/reviews/entities/recommendation-review.entity';
import { RecommendationRun } from '../modules/reviews/entities/recommendation-run.entity';
import { Project } from '../modules/projects/entities/project.entity';
import { ProjectImpact } from '../modules/impact/entities/project-impact.entity';
import { TaxonomyAdditionRequest } from '../modules/capabilities/entities/taxonomy-addition-request.entity';
import { OrganizationEvidence } from '../modules/organizations/entities/organization-evidence.entity';
import { OrganizationOnboardingRequest } from '../modules/organizations/entities/organization-onboarding-request.entity';
import { ExpressionOfInterest } from '../modules/eois/entities/expression-of-interest.entity';
import { EoiContribution } from '../modules/eois/entities/eoi-contribution.entity';
import { EoiEvidence } from '../modules/eois/entities/eoi-evidence.entity';
import { EoiReview } from '../modules/eois/entities/eoi-review.entity';
import { ProjectParticipant } from '../modules/projects/entities/project-participant.entity';
import { ProjectMilestone } from '../modules/projects/entities/project-milestone.entity';
import { ProjectTask } from '../modules/projects/entities/project-task.entity';
import { ProjectDeliverable } from '../modules/projects/entities/project-deliverable.entity';
import { ProjectUpdate } from '../modules/projects/entities/project-update.entity';
import { ProjectReview } from '../modules/projects/entities/project-review.entity';
import { ImpactAssessment } from '../modules/impact/entities/impact-assessment.entity';
import { ImpactMetric } from '../modules/impact/entities/impact-metric.entity';
import { ImpactEvidence } from '../modules/impact/entities/impact-evidence.entity';
import { ImpactFeedback } from '../modules/impact/entities/impact-feedback.entity';
import { ImpactReview } from '../modules/impact/entities/impact-review.entity';
import { ProjectAcademicMember } from '../modules/projects/entities/project-academic-member.entity';
import { ProjectContribution } from '../modules/projects/entities/project-contribution.entity';
import { ProjectInnovationOutcome } from '../modules/projects/entities/project-innovation-outcome.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { ProblemCluster } from '../modules/problem-clusters/entities/problem-cluster.entity';
import { ProposedSolution } from '../modules/solutions/entities/proposed-solution.entity';
import { SolutionTeamMember } from '../modules/solutions/entities/solution-team-member.entity';
import { SolutionDocument } from '../modules/solutions/entities/solution-document.entity';
import { SolutionCollaboration } from '../modules/solutions/entities/solution-collaboration.entity';

export const ALL_ENTITIES = [
  User,
  Organization,
  OrganizationMembership,
  OrganizationClaimRequest,
  OrganizationOnboardingRequest,
  Capability,
  InstitutionProfile,
  Institution,
  InstitutionMembership,
  InstitutionEvidence,
  InstitutionAuditLog,
  Department,
  FacultyMember,
  ResearchArea,
  Laboratory,
  Facility,
  InstitutionCapability,
  IndustryProfile,
  IndustrySector,
  IndustrySupportType,
  IndustryCapability,
  VerificationRecord,
  Challenge,
  ChallengeEvidence,
  ChallengeConfirmation,
  District,
  Block,
  ChallengeAiAnalysis,
  EntityEmbedding,
  RecommendationReview,
  RecommendationRun,
  Project,
  ProjectImpact,
  TaxonomyAdditionRequest,
  OrganizationEvidence,
  ExpressionOfInterest,
  EoiContribution,
  EoiEvidence,
  EoiReview,
  ProposedSolution,
  SolutionTeamMember,
  SolutionDocument,
  SolutionCollaboration,
  InstitutionMembership,
  InstitutionEvidence,
  InstitutionAuditLog,
  Department,
  FacultyMember,
  ResearchArea,
  Laboratory,
  Facility,
  InstitutionCapability,
  IndustryProfile,
  IndustrySector,
  IndustrySupportType,
  IndustryCapability,
  VerificationRecord,
  Challenge,
  ChallengeEvidence,
  ChallengeConfirmation,
  ProblemCluster,
  District,
  Block,
  ChallengeAiAnalysis,
  EntityEmbedding,
  RecommendationReview,
  RecommendationRun,
  Project,
  ProjectImpact,
  TaxonomyAdditionRequest,
  OrganizationEvidence,
  ExpressionOfInterest,
  EoiContribution,
  EoiEvidence,
  EoiReview,
  ProjectParticipant,
  ProjectMilestone,
  ProjectTask,
  ProjectDeliverable,
  ProjectUpdate,
  ProjectReview,
  ImpactAssessment,
  ImpactMetric,
  ImpactEvidence,
  ImpactFeedback,
  ImpactReview,
  ProjectAcademicMember,
  ProjectContribution,
  ProjectInnovationOutcome,
  Notification,
];

export {
  User,
  Organization,
  OrganizationMembership,
  OrganizationClaimRequest,
  Capability,
  InstitutionProfile,
  Institution,
  InstitutionMembership,
  InstitutionEvidence,
  InstitutionAuditLog,
  Department,
  FacultyMember,
  ResearchArea,
  Laboratory,
  Facility,
  InstitutionCapability,
  IndustryProfile,
  IndustrySector,
  IndustrySupportType,
  IndustryCapability,
  VerificationRecord,
  Challenge,
  ChallengeEvidence,
  ChallengeConfirmation,
  District,
  Block,
  ChallengeAiAnalysis,
  EntityEmbedding,
  RecommendationReview,
  RecommendationRun,
  Project,
  ProjectImpact,
  TaxonomyAdditionRequest,
  OrganizationEvidence,
  OrganizationOnboardingRequest,
  ExpressionOfInterest,
  EoiContribution,
  EoiEvidence,
  EoiReview,
  ProjectParticipant,
  ProjectMilestone,
  ProjectTask,
  ProjectDeliverable,
  ProjectUpdate,
  ProjectReview,
  ImpactAssessment,
  ImpactMetric,
  ImpactEvidence,
  ImpactFeedback,
  ImpactReview,
  ProjectAcademicMember,
  ProjectContribution,
  ProjectInnovationOutcome,
  Notification,
  ProblemCluster,
  ProposedSolution,
  SolutionTeamMember,
  SolutionDocument,
  SolutionCollaboration,
};

