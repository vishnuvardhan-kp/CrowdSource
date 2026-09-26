import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { VerificationRecord } from './entities/verification-record.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { OrganizationEvidence } from '../organizations/entities/organization-evidence.entity';
import { InstitutionCapability } from '../institutions/entities/institution-capability.entity';
import { IndustryCapability } from '../industries/entities/industry-capability.entity';
import { OrganizationClaimRequest } from '../organizations/entities/organization-claim-request.entity';
import { VerificationStatus, ClaimRequestStatus, UserRole } from '../../common/enums';
import { TargetEntityType, VerificationDecisionDto } from './dto/verification-decision.dto';
import { User } from '../users/entities/user.entity';
import { JurisdictionService } from '../auth/services/jurisdiction.service';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(VerificationRecord)
    private readonly verifRecordRepo: Repository<VerificationRecord>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationEvidence)
    private readonly evidenceRepo: Repository<OrganizationEvidence>,
    @InjectRepository(InstitutionCapability)
    private readonly instCapRepo: Repository<InstitutionCapability>,
    @InjectRepository(IndustryCapability)
    private readonly indCapRepo: Repository<IndustryCapability>,
    @InjectRepository(OrganizationClaimRequest)
    private readonly claimRepo: Repository<OrganizationClaimRequest>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jurisdictionService: JurisdictionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Retrieves the universal administrative verification queue.
   * Includes evidence and capability claims in PENDING_VERIFICATION or UNVERIFIED status,
   * strictly scoped by the reviewer's jurisdiction.
   */
  async getVerificationQueue(user?: any) {
    let pendingEvidence = await this.evidenceRepo.find({
      where: {
        verification_status: In([
          VerificationStatus.PENDING_VERIFICATION,
          VerificationStatus.UNVERIFIED,
        ]),
      },
      relations: [
        'organization',
        'organization.districtRef',
        'capability',
        'institutionCapability',
        'institutionCapability.capability',
        'institutionCapability.department',
        'institutionCapability.laboratory',
        'industryCapability',
        'industryCapability.capability',
        'uploader',
      ],
      order: { created_at: 'ASC' },
    });

    let pendingInstCaps = await this.instCapRepo.find({
      where: {
        verification_status: In([
          VerificationStatus.PENDING_VERIFICATION,
          VerificationStatus.UNVERIFIED,
        ]),
      },
      relations: [
        'institution',
        'institution.organization',
        'institution.organization.districtRef',
        'capability',
        'department',
        'laboratory',
      ],
      order: { created_at: 'ASC' },
    });

    let pendingIndCaps = await this.indCapRepo.find({
      where: {
        verification_status: In([
          VerificationStatus.PENDING_VERIFICATION,
          VerificationStatus.UNVERIFIED,
        ]),
      },
      relations: [
        'industry',
        'industry.organization',
        'industry.organization.districtRef',
        'capability',
        'supportType',
      ],
      order: { created_at: 'ASC' },
    });

    let pendingClaims = await this.claimRepo.find({
      where: { status: ClaimRequestStatus.PENDING },
      relations: ['organization', 'organization.districtRef', 'requestingUser'],
      order: { submitted_at: 'ASC' },
    });

    // Jurisdiction-based scoping
    if (user) {
      const authUser = user.id ? await this.userRepo.findOne({ where: { id: user.id } }) : user;
      if (authUser) {
        if (authUser.role === UserRole.GOVERNMENT_OFFICER) {
          const officerDistrictId = authUser.district_id;
          pendingEvidence = pendingEvidence.filter(
            (e) => e.organization?.district_id && e.organization.district_id === officerDistrictId,
          );
          pendingInstCaps = pendingInstCaps.filter(
            (ic) =>
              ic.institution?.organization?.district_id &&
              ic.institution.organization.district_id === officerDistrictId,
          );
          pendingIndCaps = pendingIndCaps.filter(
            (ic) =>
              ic.industry?.organization?.district_id &&
              ic.industry.organization.district_id === officerDistrictId,
          );
          pendingClaims = pendingClaims.filter(
            (c) => c.organization?.district_id && c.organization.district_id === officerDistrictId,
          );
        } else if (authUser.role === UserRole.GOVERNMENT_ADMIN) {
          const userState = (authUser.state || 'Jharkhand').toLowerCase().trim();
          if (userState) {
            pendingEvidence = pendingEvidence.filter(
              (e) => !e.organization?.state || e.organization.state.toLowerCase().trim() === userState,
            );
            pendingInstCaps = pendingInstCaps.filter(
              (ic) =>
                !ic.institution?.organization?.state ||
                ic.institution.organization.state.toLowerCase().trim() === userState,
            );
            pendingIndCaps = pendingIndCaps.filter(
              (ic) =>
                !ic.industry?.organization?.state ||
                ic.industry.organization.state.toLowerCase().trim() === userState,
            );
            pendingClaims = pendingClaims.filter(
              (c) => !c.organization?.state || c.organization.state.toLowerCase().trim() === userState,
            );
          }
        }
      }
    }

    return {
      pending_evidence_count: pendingEvidence.length,
      pending_capabilities_count: pendingInstCaps.length + pendingIndCaps.length,
      pending_claims_count: pendingClaims.length,
      evidence: pendingEvidence,
      institution_capabilities: pendingInstCaps,
      industry_capabilities: pendingIndCaps,
      claim_requests: pendingClaims,
    };
  }

  /**
   * Approves a verification item and records an audit log.
   * Enforces strict jurisdiction boundaries.
   */
  async approveItem(
    targetId: string,
    reviewerId: string,
    dto: VerificationDecisionDto,
    user?: any,
  ) {
    const reviewer = user?.id
      ? await this.userRepo.findOne({ where: { id: user.id }, relations: ['districtRef'] })
      : (reviewerId ? await this.userRepo.findOne({ where: { id: reviewerId }, relations: ['districtRef'] }) : null);

    let orgIdToReindex: string | null = null;
    let approvedEntity: any = null;

    switch (dto.target_type) {
      case TargetEntityType.EVIDENCE: {
        const evidence = await this.evidenceRepo.findOne({
          where: { id: targetId },
          relations: ['organization', 'institutionCapability', 'industryCapability'],
        });
        if (!evidence) {
          throw new NotFoundException(`Evidence with ID "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, evidence.organization);
        }
        evidence.verification_status = VerificationStatus.VERIFIED;
        evidence.verified_by = reviewerId;
        evidence.verified_at = new Date();
        evidence.verification_notes = dto.notes || 'Evidence verified by reviewer.';
        approvedEntity = await this.evidenceRepo.save(evidence);
        orgIdToReindex = evidence.organization_id;

        // If evidence is linked to a capability claim, verify that capability as well
        if (evidence.institution_capability_id) {
          await this.instCapRepo.update(evidence.institution_capability_id, {
            verification_status: VerificationStatus.VERIFIED,
            confidence_score: 0.95,
          });
        }
        if (evidence.industry_capability_id) {
          await this.indCapRepo.update(evidence.industry_capability_id, {
            verification_status: VerificationStatus.VERIFIED,
            confidence_score: 0.95,
          });
        }
        break;
      }

      case TargetEntityType.INSTITUTION_CAPABILITY: {
        const instCap = await this.instCapRepo.findOne({
          where: { id: targetId },
          relations: ['institution', 'institution.organization'],
        });
        if (!instCap) {
          throw new NotFoundException(`Institution capability "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, instCap.institution?.organization);
        }
        instCap.verification_status = VerificationStatus.VERIFIED;
        instCap.confidence_score = 0.90;
        approvedEntity = await this.instCapRepo.save(instCap);
        orgIdToReindex = instCap.institution?.organization_id || null;
        break;
      }

      case TargetEntityType.INDUSTRY_CAPABILITY: {
        const indCap = await this.indCapRepo.findOne({
          where: { id: targetId },
          relations: ['industry', 'industry.organization'],
        });
        if (!indCap) {
          throw new NotFoundException(`Industry capability "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, indCap.industry?.organization);
        }
        indCap.verification_status = VerificationStatus.VERIFIED;
        indCap.confidence_score = 0.90;
        approvedEntity = await this.indCapRepo.save(indCap);
        orgIdToReindex = indCap.industry?.organization_id || null;
        break;
      }

      case TargetEntityType.ORGANIZATION: {
        const org = await this.orgRepo.findOne({ where: { id: targetId } });
        if (!org) {
          throw new NotFoundException(`Organization "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, org);
        }
        org.verification_status = VerificationStatus.VERIFIED;
        org.verified_by = reviewerId;
        org.verified_at = new Date();
        approvedEntity = await this.orgRepo.save(org);
        orgIdToReindex = org.id;
        break;
      }

      default:
        throw new BadRequestException(`Unsupported target type "${dto.target_type}".`);
    }

    // Record audit trail with reviewer jurisdiction and role
    const audit = await this.verifRecordRepo.save(
      this.verifRecordRepo.create({
        entity_type: dto.target_type,
        entity_id: targetId,
        verification_status: VerificationStatus.VERIFIED,
        verification_source: 'REVIEWER_DECISION',
        verified_by: reviewerId,
        verified_at: new Date(),
        notes: dto.notes || 'Approved during verification review.',
        jurisdiction: reviewer?.districtRef?.name || reviewer?.district || (reviewer?.jurisdiction_scope ? `${reviewer.jurisdiction_scope} Scope` : undefined),
        verifier_role: reviewer?.role,
      }),
    );

    // Trigger async re-indexing to ensure ecosystem matching reflects verified trust
    if (orgIdToReindex) {
      this.eventEmitter.emit('organization.capabilities_updated', { organizationId: orgIdToReindex });
    }

    return {
      message: `${dto.target_type} "${targetId}" successfully VERIFIED.`,
      entity: approvedEntity,
      audit_record: audit,
    };
  }

  /**
   * Rejects a verification item with mandatory audit notes.
   * Enforces strict jurisdiction boundaries.
   */
  async rejectItem(
    targetId: string,
    reviewerId: string,
    dto: VerificationDecisionDto,
    user?: any,
  ) {
    if (!dto.notes || !dto.notes.trim()) {
      throw new BadRequestException('Rejection notes explaining the reason are mandatory.');
    }

    const reviewer = user?.id
      ? await this.userRepo.findOne({ where: { id: user.id }, relations: ['districtRef'] })
      : (reviewerId ? await this.userRepo.findOne({ where: { id: reviewerId }, relations: ['districtRef'] }) : null);

    let orgIdToReindex: string | null = null;
    let rejectedEntity: any = null;

    switch (dto.target_type) {
      case TargetEntityType.EVIDENCE: {
        const evidence = await this.evidenceRepo.findOne({
          where: { id: targetId },
          relations: ['organization'],
        });
        if (!evidence) {
          throw new NotFoundException(`Evidence "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, evidence.organization);
        }
        evidence.verification_status = VerificationStatus.REJECTED;
        evidence.verification_notes = dto.notes.trim();
        rejectedEntity = await this.evidenceRepo.save(evidence);
        orgIdToReindex = evidence.organization_id;

        // Re-evaluate dependent HEI capability verification
        if (evidence.institution_capability_id) {
          const remainingEvidence = await this.evidenceRepo.find({
            where: { institution_capability_id: evidence.institution_capability_id },
          });
          const hasVerifiedRemaining = remainingEvidence.some(
            (e) => e.id !== evidence.id && e.verification_status === VerificationStatus.VERIFIED,
          );
          const hasPendingRemaining = remainingEvidence.some(
            (e) => e.id !== evidence.id && e.verification_status === VerificationStatus.PENDING_VERIFICATION,
          );

          if (hasVerifiedRemaining) {
            await this.instCapRepo.update(evidence.institution_capability_id, {
              verification_status: VerificationStatus.VERIFIED,
              confidence_score: 0.90,
            });
          } else if (hasPendingRemaining) {
            await this.instCapRepo.update(evidence.institution_capability_id, {
              verification_status: VerificationStatus.PENDING_VERIFICATION,
              confidence_score: 0.70,
            });
          } else {
            await this.instCapRepo.update(evidence.institution_capability_id, {
              verification_status: VerificationStatus.UNVERIFIED,
              confidence_score: 0.50,
            });
          }
        }

        // Re-evaluate dependent Industry capability verification
        if (evidence.industry_capability_id) {
          const remainingEvidence = await this.evidenceRepo.find({
            where: { industry_capability_id: evidence.industry_capability_id },
          });
          const hasVerifiedRemaining = remainingEvidence.some(
            (e) => e.id !== evidence.id && e.verification_status === VerificationStatus.VERIFIED,
          );
          const hasPendingRemaining = remainingEvidence.some(
            (e) => e.id !== evidence.id && e.verification_status === VerificationStatus.PENDING_VERIFICATION,
          );

          if (hasVerifiedRemaining) {
            await this.indCapRepo.update(evidence.industry_capability_id, {
              verification_status: VerificationStatus.VERIFIED,
              confidence_score: 0.90,
            });
          } else if (hasPendingRemaining) {
            await this.indCapRepo.update(evidence.industry_capability_id, {
              verification_status: VerificationStatus.PENDING_VERIFICATION,
              confidence_score: 0.70,
            });
          } else {
            await this.indCapRepo.update(evidence.industry_capability_id, {
              verification_status: VerificationStatus.UNVERIFIED,
              confidence_score: 0.50,
            });
          }
        }
        break;
      }

      case TargetEntityType.INSTITUTION_CAPABILITY: {
        const instCap = await this.instCapRepo.findOne({
          where: { id: targetId },
          relations: ['institution', 'institution.organization'],
        });
        if (!instCap) {
          throw new NotFoundException(`Institution capability "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, instCap.institution?.organization);
        }
        instCap.verification_status = VerificationStatus.REJECTED;
        instCap.confidence_score = 0.0;
        rejectedEntity = await this.instCapRepo.save(instCap);
        orgIdToReindex = instCap.institution?.organization_id || null;
        break;
      }

      case TargetEntityType.INDUSTRY_CAPABILITY: {
        const indCap = await this.indCapRepo.findOne({
          where: { id: targetId },
          relations: ['industry', 'industry.organization'],
        });
        if (!indCap) {
          throw new NotFoundException(`Industry capability "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, indCap.industry?.organization);
        }
        indCap.verification_status = VerificationStatus.REJECTED;
        indCap.confidence_score = 0.0;
        rejectedEntity = await this.indCapRepo.save(indCap);
        orgIdToReindex = indCap.industry?.organization_id || null;
        break;
      }

      case TargetEntityType.ORGANIZATION: {
        const org = await this.orgRepo.findOne({ where: { id: targetId } });
        if (!org) {
          throw new NotFoundException(`Organization "${targetId}" not found.`);
        }
        if (reviewer) {
          this.jurisdictionService.validateOrganizationAccess(reviewer, org);
        }
        org.verification_status = VerificationStatus.REJECTED;
        rejectedEntity = await this.orgRepo.save(org);
        orgIdToReindex = org.id;
        break;
      }

      default:
        throw new BadRequestException(`Unsupported target type "${dto.target_type}".`);
    }

    const audit = await this.verifRecordRepo.save(
      this.verifRecordRepo.create({
        entity_type: dto.target_type,
        entity_id: targetId,
        verification_status: VerificationStatus.REJECTED,
        verification_source: 'REVIEWER_DECISION',
        verified_by: reviewerId,
        verified_at: new Date(),
        notes: dto.notes.trim(),
        jurisdiction: reviewer?.districtRef?.name || reviewer?.district || (reviewer?.jurisdiction_scope ? `${reviewer.jurisdiction_scope} Scope` : undefined),
        verifier_role: reviewer?.role,
      }),
    );

    if (orgIdToReindex) {
      this.eventEmitter.emit('organization.capabilities_updated', { organizationId: orgIdToReindex });
    }

    return {
      message: `${dto.target_type} "${targetId}" marked as REJECTED.`,
      entity: rejectedEntity,
      audit_record: audit,
    };
  }
}
