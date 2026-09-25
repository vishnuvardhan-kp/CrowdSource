import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { InstitutionMembership } from '../entities/institution-membership.entity';
import { Institution } from '../entities/institution.entity';
import { InstitutionEvidence } from '../entities/institution-evidence.entity';
import { User } from '../../users/entities/user.entity';
import {
  AuthorityVerificationStatus,
  AuthorityVerificationSource,
  NotificationType,
  UserRole,
} from '../../../common/enums';
import { CreateMembershipDto } from '../dto/create-membership.dto';
import { UploadEvidenceDto } from '../dto/upload-evidence.dto';
import { ReviewMembershipDto } from '../dto/review-membership.dto';
import { AuditLogService } from './audit-log.service';
import { NotificationsService } from '../../notifications/notifications.service';

@Injectable()
export class InstitutionMembershipsService {
  private readonly logger = new Logger(InstitutionMembershipsService.name);

  constructor(
    @InjectRepository(InstitutionMembership)
    private readonly membershipRepo: Repository<InstitutionMembership>,
    @InjectRepository(Institution)
    private readonly institutionRepo: Repository<Institution>,
    @InjectRepository(InstitutionEvidence)
    private readonly evidenceRepo: Repository<InstitutionEvidence>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly auditLogService: AuditLogService,
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Applies for representative authority for a specific institution.
   * NOTE: Does NOT automatically mark the person verified!
   */
  async createMembership(
    userId: string,
    dto: CreateMembershipDto,
    ipAddress?: string,
  ): Promise<InstitutionMembership> {
    const institution = await this.institutionRepo.findOne({
      where: { id: dto.institution_id },
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID "${dto.institution_id}" not found.`);
    }

    // Check for existing membership record
    let membership = await this.membershipRepo.findOne({
      where: { user_id: userId, institution_id: dto.institution_id },
      relations: ['institution', 'evidence'],
    });

    if (membership) {
      if (membership.authority_status === AuthorityVerificationStatus.VERIFIED) {
        throw new ConflictException(
          'You are already a verified representative for this institution.',
        );
      }
      if (membership.authority_status === AuthorityVerificationStatus.UNDER_REVIEW) {
        throw new ConflictException(
          'Your representative application is already under active review.',
        );
      }

      // If rejected or pending, allow updating application details
      const oldState = { ...membership };
      membership.relationship = dto.relationship;
      membership.designation = dto.designation;
      membership.official_email = dto.official_email || membership.official_email;
      membership.official_phone = dto.official_phone || membership.official_phone;
      membership.department_name = dto.department_name || membership.department_name;
      membership.authority_status = AuthorityVerificationStatus.PENDING;
      membership.rejection_reason = null;

      membership = await this.membershipRepo.save(membership);

      await this.auditLogService.logAction(
        'MEMBERSHIP',
        membership.id,
        'APPLICATION_RESUBMITTED',
        userId,
        oldState,
        membership,
        'User resubmitted representative authorization application',
        ipAddress,
      );

      return membership;
    }

    // Create fresh application record
    membership = this.membershipRepo.create({
      user_id: userId,
      institution_id: dto.institution_id,
      relationship: dto.relationship,
      designation: dto.designation,
      official_email: dto.official_email || null,
      official_phone: dto.official_phone || null,
      department_name: dto.department_name || null,
      authority_status: AuthorityVerificationStatus.PENDING,
      authority_source: AuthorityVerificationSource.AUTHORIZED_DOCUMENT_REVIEW,
      metadata: dto.metadata || {},
    });

    const saved = await this.membershipRepo.save(membership);

    await this.auditLogService.logAction(
      'MEMBERSHIP',
      saved.id,
      'APPLICATION_CREATED',
      userId,
      null,
      saved,
      'Representative authority application submitted',
      ipAddress,
    );

    if (this.notificationsService) {
      try {
        await this.notificationsService.notifyUser(
          userId,
          NotificationType.INSTITUTION_VERIFICATION,
          'Representation Application Received',
          `Your application to represent ${institution.name} has been received. Please upload supporting authorization documents for review.`,
          'INSTITUTION_MEMBERSHIP',
          saved.id,
        );
      } catch (err: any) {
        this.logger.warn(`Notification send skipped: ${err.message}`);
      }
    }

    return this.getMembershipById(saved.id);
  }

  /**
   * Retrieves all institutional memberships for a user.
   */
  async getUserMemberships(userId: string): Promise<InstitutionMembership[]> {
    return this.membershipRepo.find({
      where: { user_id: userId },
      relations: ['institution', 'institution.district', 'institution.block', 'evidence', 'verifier'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Retrieves a single membership by ID.
   */
  async getMembershipById(id: string): Promise<InstitutionMembership> {
    const membership = await this.membershipRepo.findOne({
      where: { id },
      relations: ['user', 'institution', 'institution.district', 'institution.block', 'evidence', 'verifier'],
    });

    if (!membership) {
      throw new NotFoundException(`Membership record with ID "${id}" not found.`);
    }

    return membership;
  }

  /**
   * Uploads documentary evidence to support representation authority.
   */
  async uploadEvidence(
    userId: string,
    membershipId: string,
    dto: UploadEvidenceDto,
    userRole?: string,
    ipAddress?: string,
  ): Promise<InstitutionEvidence> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId },
      relations: ['institution'],
    });

    if (!membership) {
      throw new NotFoundException(`Membership record with ID "${membershipId}" not found.`);
    }

    // Zero-trust: user must own the membership or be PLATFORM_ADMIN
    if (membership.user_id !== userId && userRole !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('You cannot upload documents for another user\'s application.');
    }

    const evidence = this.evidenceRepo.create({
      membership_id: membershipId,
      evidence_type: dto.evidence_type,
      document_url: dto.document_url,
      document_name: dto.document_name,
      mime_type: dto.mime_type || null,
      file_size: dto.file_size || null,
      verified: false,
    });

    const savedEvidence = await this.evidenceRepo.save(evidence);

    // Transition membership status to UNDER_REVIEW once document is uploaded
    if (
      membership.authority_status === AuthorityVerificationStatus.PENDING ||
      membership.authority_status === AuthorityVerificationStatus.AFFILIATION_PENDING
    ) {
      const oldState = { status: membership.authority_status };
      membership.authority_status = AuthorityVerificationStatus.UNDER_REVIEW;
      await this.membershipRepo.save(membership);

      await this.auditLogService.logAction(
        'MEMBERSHIP',
        membership.id,
        'STATUS_CHANGE',
        userId,
        oldState,
        { status: membership.authority_status },
        `Document uploaded: ${dto.evidence_type}. Application moved to UNDER_REVIEW.`,
        ipAddress,
      );
    }

    await this.auditLogService.logAction(
      'EVIDENCE',
      savedEvidence.id,
      'DOCUMENT_UPLOADED',
      userId,
      null,
      savedEvidence,
      `Uploaded ${dto.evidence_type} document for institution ${membership.institution?.name}`,
      ipAddress,
    );

    return savedEvidence;
  }

  /**
   * Retrieves pending institutional verification queue for Government Officers & Admins.
   */
  async getPendingVerificationQueue(params: {
    status?: AuthorityVerificationStatus;
    type?: string;
    district_id?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: InstitutionMembership[]; total: number }> {
    const qb = this.membershipRepo
      .createQueryBuilder('mem')
      .leftJoinAndSelect('mem.user', 'user')
      .leftJoinAndSelect('mem.institution', 'inst')
      .leftJoinAndSelect('inst.district', 'district')
      .leftJoinAndSelect('inst.block', 'block')
      .leftJoinAndSelect('mem.evidence', 'evidence')
      .leftJoinAndSelect('mem.verifier', 'verifier')
      .orderBy('mem.created_at', 'ASC');

    if (params.status) {
      qb.andWhere('mem.authority_status = :status', { status: params.status });
    } else {
      // Default to actionable review statuses
      qb.andWhere('mem.authority_status IN (:...statuses)', {
        statuses: [
          AuthorityVerificationStatus.PENDING,
          AuthorityVerificationStatus.UNDER_REVIEW,
          AuthorityVerificationStatus.AFFILIATION_PENDING,
        ],
      });
    }

    if (params.type) {
      qb.andWhere('inst.type = :type', { type: params.type });
    }
    if (params.district_id) {
      qb.andWhere('inst.district_id = :districtId', { districtId: params.district_id });
    }

    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const skip = (page - 1) * limit;

    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Official review and decision on institutional representative authority.
   */
  async reviewMembership(
    adminUserId: string,
    membershipId: string,
    dto: ReviewMembershipDto,
    ipAddress?: string,
  ): Promise<InstitutionMembership> {
    const membership = await this.membershipRepo.findOne({
      where: { id: membershipId },
      relations: ['user', 'institution', 'evidence'],
    });

    if (!membership) {
      throw new NotFoundException(`Membership record with ID "${membershipId}" not found.`);
    }

    const oldState = {
      authority_status: membership.authority_status,
      verified_at: membership.verified_at,
      verified_by: membership.verified_by,
      verification_notes: membership.verification_notes,
    };

    if (dto.action === 'APPROVE') {
      membership.authority_status = AuthorityVerificationStatus.VERIFIED;
      membership.authority_source = (dto as any).source || AuthorityVerificationSource.AUTHORIZED_ADMIN_REVIEW;
      membership.verified_relationship = membership.relationship;
      membership.identity_verification_status = 'VERIFIED';
      if ((dto as any).reference || (dto as any).authority_verification_reference) {
        membership.authority_verification_reference = (dto as any).reference || (dto as any).authority_verification_reference;
      }
      membership.verified_at = new Date();
      membership.verified_by = adminUserId;
      membership.verification_notes = dto.notes || 'Verified by authorized administrator';
      membership.rejection_reason = null;
      if (dto.valid_until) {
        membership.valid_until = new Date(dto.valid_until);
      }

      // Mark evidence documents verified
      if (membership.evidence?.length > 0) {
        await this.evidenceRepo.update(
          { membership_id: membership.id },
          { verified: true, review_notes: dto.notes || 'Approved during representative verification' },
        );
      }

      await this.auditLogService.logAction(
        'MEMBERSHIP',
        membership.id,
        'APPROVED',
        adminUserId,
        oldState,
        membership,
        dto.notes || 'Representative authority approved',
        ipAddress,
      );

      if (this.notificationsService) {
        try {
          await this.notificationsService.notifyUser(
            membership.user_id,
            NotificationType.INSTITUTION_VERIFICATION,
            'Representative Authority Approved',
            `Your authorization to represent ${membership.institution.name} (${membership.designation}) has been approved. You may now submit official challenges and represent this institution.`,
            'INSTITUTION_MEMBERSHIP',
            membership.id,
          );
        } catch (err: any) {
          this.logger.warn(`Notification send skipped: ${err.message}`);
        }
      }
    } else if (dto.action === 'REJECT') {
      membership.authority_status = AuthorityVerificationStatus.REJECTED;
      membership.rejection_reason = dto.rejection_reason || dto.notes || 'Application rejected during review.';
      membership.verification_notes = dto.notes || null;
      membership.verified_by = adminUserId;
      membership.verified_at = new Date();

      await this.auditLogService.logAction(
        'MEMBERSHIP',
        membership.id,
        'REJECTED',
        adminUserId,
        oldState,
        membership,
        membership.rejection_reason,
        ipAddress,
      );

      if (this.notificationsService) {
        try {
          await this.notificationsService.notifyUser(
            membership.user_id,
            NotificationType.INSTITUTION_VERIFICATION,
            'Representative Authority Application Rejected',
            `Your application to represent ${membership.institution.name} was rejected. Reason: ${membership.rejection_reason}`,
            'INSTITUTION_MEMBERSHIP',
            membership.id,
          );
        } catch (err: any) {
          this.logger.warn(`Notification send skipped: ${err.message}`);
        }
      }
    } else if (dto.action === 'REQUEST_INFO') {
      membership.authority_status = AuthorityVerificationStatus.AFFILIATION_PENDING;
      membership.verification_notes = dto.notes || 'Additional documents or proof of authorization requested.';

      await this.auditLogService.logAction(
        'MEMBERSHIP',
        membership.id,
        'REQUEST_INFO',
        adminUserId,
        oldState,
        membership,
        dto.notes,
        ipAddress,
      );

      if (this.notificationsService) {
        try {
          await this.notificationsService.notifyUser(
            membership.user_id,
            NotificationType.INSTITUTION_VERIFICATION,
            'Additional Documents Required',
            `Additional documents are needed for your application to represent ${membership.institution.name}: ${dto.notes || 'Please upload updated official appointment credentials.'}`,
            'INSTITUTION_MEMBERSHIP',
            membership.id,
          );
        } catch (err: any) {
          this.logger.warn(`Notification send skipped: ${err.message}`);
        }
      }
    } else if (dto.action === ('SUSPEND' as any)) {
      membership.authority_status = AuthorityVerificationStatus.SUSPENDED;
      membership.verification_notes = dto.notes || 'Representative authority suspended by administrator.';
      membership.verified_by = adminUserId;

      await this.auditLogService.logAction(
        'MEMBERSHIP',
        membership.id,
        'SUSPENDED',
        adminUserId,
        oldState,
        membership,
        dto.notes || 'Authority suspended',
        ipAddress,
      );

      if (this.notificationsService) {
        try {
          await this.notificationsService.notifyUser(
            membership.user_id,
            NotificationType.INSTITUTION_VERIFICATION,
            'Representative Authority Suspended',
            `Your authorization to represent ${membership.institution?.name} has been suspended. Reason: ${dto.notes || 'Administrative action'}`,
            'INSTITUTION_MEMBERSHIP',
            membership.id,
          );
        } catch (err: any) {
          this.logger.warn(`Notification send skipped: ${err.message}`);
        }
      }
    }

    return this.membershipRepo.save(membership);
  }

  /**
   * Internal validator to verify whether a user has an active VERIFIED membership
   * for an institution. Used by ChallengesService to guarantee zero-trust server validation.
   */
  async validateVerifiedMembership(
    userId: string,
    institutionId: string,
    membershipId?: string,
  ): Promise<{ valid: boolean; membership?: InstitutionMembership; error?: string }> {
    const qb = this.membershipRepo
      .createQueryBuilder('mem')
      .leftJoinAndSelect('mem.institution', 'inst')
      .leftJoinAndSelect('mem.user', 'user')
      .where('mem.user_id = :userId', { userId })
      .andWhere('mem.institution_id = :institutionId', { institutionId });

    if (membershipId) {
      qb.andWhere('mem.id = :membershipId', { membershipId });
    }

    const membership = await qb.getOne();

    if (!membership) {
      return {
        valid: false,
        error: 'No institutional representation record found for this user and institution.',
      };
    }

    if (membership.authority_status === AuthorityVerificationStatus.SUSPENDED) {
      return {
        valid: false,
        error: 'Institutional representative authority is SUSPENDED. Official challenge submissions are blocked.',
      };
    }

    if (membership.authority_status !== AuthorityVerificationStatus.VERIFIED) {
      return {
        valid: false,
        error: `Institutional representative authority is not VERIFIED (current status: ${membership.authority_status}). Only verified representatives may submit official institutional challenges.`,
      };
    }

    if (membership.valid_until && new Date(membership.valid_until) < new Date()) {
      return {
        valid: false,
        error: 'Institutional representative authorization has expired. Please renew your credentials.',
      };
    }

    if (membership.institution && (membership.institution as any).status === 'INACTIVE') {
      return {
        valid: false,
        error: 'The selected institution is currently INACTIVE. Submissions cannot be made on behalf of inactive institutions.',
      };
    }

    return {
      valid: true,
      membership,
    };
  }
}
