import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  HttpException,
  HttpStatus,
  Logger,
  Optional,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual, DataSource } from 'typeorm';
import { Challenge } from './entities/challenge.entity';
import { ChallengeConfirmation } from './entities/challenge-confirmation.entity';
import { ChallengeStatus, UserRole, NotificationType, VerificationStatus, ReporterType } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { VerificationRecord } from '../verification/entities/verification-record.entity';
import { JurisdictionService } from '../auth/services/jurisdiction.service';
import {
  CreateChallengeDto,
  UpdateChallengeDto,
  ReviewChallengeDto,
  QueryChallengesDto,
} from './dto';
import { LocationsService } from '../locations/locations.service';
import { EvidenceService, ExpressUploadedFile } from './services/evidence.service';
import { DraftCleanupService } from './services/draft-cleanup.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ProblemClustersService } from '../problem-clusters/problem-clusters.service';
import { AiAnalysisService } from '../ai-analysis/ai-analysis.service';
import { MatchingService } from '../reviews/matching.service';
import { InstitutionMembershipsService } from '../institutions/services/institution-memberships.service';

@Injectable()
export class ChallengesService {
  private readonly logger = new Logger(ChallengesService.name);
  private readonly maxDailySubmissions: number;

  constructor(
    @InjectRepository(Challenge)
    private readonly challengeRepo: Repository<Challenge>,
    @InjectRepository(ChallengeConfirmation)
    private readonly confirmationRepo: Repository<ChallengeConfirmation>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(VerificationRecord)
    private readonly verifRecordRepo: Repository<VerificationRecord>,
    private readonly locationsService: LocationsService,
    private readonly evidenceService: EvidenceService,
    private readonly draftCleanupService: DraftCleanupService,
    private readonly jurisdictionService: JurisdictionService,
    private readonly dataSource: DataSource,
    @Optional()
    private readonly notifService?: NotificationsService,
    @Optional()
    private readonly clustersService?: ProblemClustersService,
    @Optional()
    @Inject(forwardRef(() => AiAnalysisService))
    private readonly aiAnalysisService?: AiAnalysisService,
    @Optional()
    @Inject(forwardRef(() => MatchingService))
    private readonly matchingService?: MatchingService,
    @Optional()
    private readonly institutionMembershipsService?: InstitutionMembershipsService,
  ) {
    this.maxDailySubmissions = parseInt(
      process.env.MAX_DAILY_CHALLENGE_SUBMISSIONS || '5',
      10,
    );
  }

  /**
   * Creates a new challenge in DRAFT status.
   */
  async createDraft(dto: CreateChallengeDto, userId: string): Promise<Challenge> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    // Auto-detect language if not explicitly provided
    let lang = dto.original_language;
    if (!lang || lang === 'auto') {
      const combined = `${dto.title || ''} ${dto.description || ''}`;
      if (/[\u1C50-\u1C7F]/.test(combined)) {
        lang = 'sat';
      } else if (/[\u0900-\u097F]/.test(combined)) {
        if (user?.preferred_language && ['hi', 'nag', 'mun', 'kru', 'kho', 'sad', 'pan'].includes(user.preferred_language)) {
          lang = user.preferred_language;
        } else {
          lang = 'hi';
        }
      } else {
        lang = user?.preferred_language || 'en';
      }
    }

    // Zero-trust institutional authorization check
    let reporterType = dto.reporter_type || ReporterType.INDIVIDUAL;
    let institutionId: string | null = null;
    let membershipId: string | null = null;
    let verificationSnapshot: Record<string, any> | null = null;
    let valResult: any = null;

    if (
      reporterType === ReporterType.PRI ||
      reporterType === ReporterType.ULB ||
      reporterType === ReporterType.GOVERNMENT_DEPARTMENT
    ) {
      if (!dto.institution_id) {
        throw new BadRequestException(
          `Official ${reporterType} submissions require an associated institution_id.`,
        );
      }
      if (!this.institutionMembershipsService) {
        throw new ForbiddenException(
          'Institutional verification service is currently unavailable.',
        );
      }

      valResult = await this.institutionMembershipsService.validateVerifiedMembership(
        userId,
        dto.institution_id,
        dto.institution_membership_id,
      );

      if (!valResult.valid || !valResult.membership) {
        throw new ForbiddenException(
          valResult.error ||
            'Institutional representative authority is not VERIFIED. Only verified representatives may submit official institutional challenges.',
        );
      }

      const mem = valResult.membership;
      institutionId = mem.institution_id;
      membershipId = mem.id;

      verificationSnapshot = {
        institution_id: mem.institution_id,
        institution_name: mem.institution?.name,
        canonical_lgd_code: mem.institution?.lgd_code,
        lgd_code: mem.institution?.lgd_code,
        institution_type: mem.institution?.type,
        institution_subtype: mem.institution?.subtype,
        representative_name: user?.name,
        representative_email: user?.email,
        designation: mem.designation,
        relationship: mem.relationship,
        verified_relationship: mem.verified_relationship || mem.relationship,
        authority_source: mem.authority_source,
        authority_verification_source: mem.authority_source,
        authority_verification_reference: mem.authority_verification_reference || (mem.metadata as any)?.reference || null,
        verified_at: mem.verified_at,
        verification_timestamp: mem.verified_at,
        verified_by: mem.verified_by,
        verifier_identity: mem.verified_by,
        is_verified: true,
        snapshot_taken_at: new Date().toISOString(),
      };
    } else if (reporterType === ReporterType.COMMUNITY) {
      const groupName = dto.community_group_name?.trim() || 'Community Group / Collective';
      verificationSnapshot = {
        reporter_type: ReporterType.COMMUNITY,
        community_group_name: groupName,
        submitted_by_name: user?.name || null,
        submitted_by_email: user?.email || null,
        is_community_collective: true,
        snapshot_taken_at: new Date().toISOString(),
      };
    }

    const resolvedDistrictId = dto.district_id || valResult?.membership?.institution?.district_id || null;
    const resolvedBlockId = dto.block_id || valResult?.membership?.institution?.block_id || null;

    const challenge = this.challengeRepo.create({
      title: dto.title,
      description: dto.description,
      original_text: dto.original_text || dto.description,
      original_language: lang,
      normalized_text: null,
      processing_language: 'en',
      translation_status: 'PENDING',
      translation_metadata: {},
      submitted_by: userId,
      status: ChallengeStatus.DRAFT,
      reporter_type: reporterType,
      institution_id: institutionId,
      institution_membership_id: membershipId,
      verification_snapshot: verificationSnapshot,
      district_id: resolvedDistrictId,
      block_id: resolvedBlockId,
      village_locality: dto.village_locality || null,
      location: dto.village_locality || null,
      citizen_severity: dto.citizen_severity || null,
      affected_population: dto.affected_population || null,
      latitude: dto.latitude || null,
      longitude: dto.longitude || null,
      category: dto.category || (dto.domain) || 'General',
    });

    // Populate district and state strings if district_id provided
    if (resolvedDistrictId) {
      const district = await this.locationsService.getDistrictById(resolvedDistrictId);
      if (district) {
        challenge.district = district.name;
        challenge.state = district.state;
      }
    }

    const saved = await this.challengeRepo.save(challenge);

    // Attach voice recording audio evidence if passed from voice assistant
    if (dto.audio_evidence_url && this.evidenceService) {
      try {
        await this.evidenceService.attachAudioEvidenceByUrl(
          saved.id,
          userId,
          dto.audio_evidence_url,
          'Citizen Voice Recording Evidence',
        );
      } catch (audioErr: any) {
        this.logger.warn(`Failed to attach audio evidence to challenge ${saved.id}: ${audioErr.message}`);
      }
    }

    // Pre-seed ChallengeAiAnalysis with voice-extracted domain/subdomain so they are
    // immediately available even if the post-submission FastAPI AI call later times out.
    if (dto.domain && this.aiAnalysisService) {
      try {
        await this.aiAnalysisService.preseedVoiceDomain(
          saved.id,
          dto.domain,
          dto.sub_domain || null,
          dto.category || dto.domain,
        );
      } catch (e: any) {
        this.logger.warn(`Voice domain pre-seed skipped for challenge ${saved.id}: ${e.message}`);
      }
    }

    return saved;
  }

  /**
   * Updates an existing challenge ONLY if its current status is DRAFT.
   * Rejects any attempt to mutate a submitted challenge.
   */
  async updateDraft(
    id: string,
    dto: UpdateChallengeDto,
    userId: string,
    userRole?: string,
  ): Promise<Challenge> {
    const challenge = await this.challengeRepo.findOne({
      where: { id },
      relations: ['evidence', 'districtRef', 'blockRef'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${id}" not found.`);
    }

    // IMMUTABILITY RULE: Only DRAFT challenges may be edited
    if (challenge.status !== ChallengeStatus.DRAFT) {
      throw new BadRequestException(
        'Submitted challenges are immutable. Content cannot be modified after submission.',
      );
    }

    // OWNERSHIP CHECK: Only creator or platform admin can edit
    if (challenge.submitted_by !== userId && userRole !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('You can only edit your own draft challenges.');
    }

    // Update editable fields
    if (dto.title !== undefined) challenge.title = dto.title;
    if (dto.description !== undefined) {
      challenge.description = dto.description;
      challenge.original_text = dto.description;
    }
    if (dto.original_text !== undefined) {
      challenge.original_text = dto.original_text;
    }
    if (dto.original_language !== undefined) {
      challenge.original_language = dto.original_language;
    }
    if (dto.village_locality !== undefined) {
      challenge.village_locality = dto.village_locality;
      challenge.location = dto.village_locality;
    }
    if (dto.citizen_severity !== undefined) challenge.citizen_severity = dto.citizen_severity;
    if (dto.affected_population !== undefined) challenge.affected_population = dto.affected_population;
    if (dto.latitude !== undefined) challenge.latitude = dto.latitude;
    if (dto.longitude !== undefined) challenge.longitude = dto.longitude;
    if (dto.category !== undefined) challenge.category = dto.category;

    if (dto.district_id !== undefined) {
      challenge.district_id = dto.district_id;
      if (dto.district_id) {
        const district = await this.locationsService.getDistrictById(dto.district_id);
        if (district) {
          challenge.district = district.name;
          challenge.state = district.state;
        }
      } else {
        challenge.district = null as any;
      }
    }

    if (dto.block_id !== undefined) {
      challenge.block_id = dto.block_id;
    }

    if (dto.reporter_type !== undefined) {
      if (
        dto.reporter_type === ReporterType.PRI ||
        dto.reporter_type === ReporterType.ULB ||
        dto.reporter_type === ReporterType.GOVERNMENT_DEPARTMENT
      ) {
        const targetInstId = dto.institution_id || challenge.institution_id;
        if (!targetInstId) {
          throw new BadRequestException(`Official ${dto.reporter_type} submissions require an institution_id.`);
        }
        if (!this.institutionMembershipsService) {
          throw new ForbiddenException('Institutional verification service is currently unavailable.');
        }
        const valResult = await this.institutionMembershipsService.validateVerifiedMembership(
          userId,
          targetInstId,
          dto.institution_membership_id || challenge.institution_membership_id || undefined,
        );
        if (!valResult.valid || !valResult.membership) {
          throw new ForbiddenException(valResult.error || 'Representative authority is not verified.');
        }
        const mem = valResult.membership;
        challenge.reporter_type = dto.reporter_type;
        challenge.institution_id = mem.institution_id;
        challenge.institution_membership_id = mem.id;
        const user = await this.userRepo.findOne({ where: { id: userId } });
        challenge.verification_snapshot = {
          institution_id: mem.institution_id,
          institution_name: mem.institution?.name,
          canonical_lgd_code: mem.institution?.lgd_code,
          lgd_code: mem.institution?.lgd_code,
          institution_type: mem.institution?.type,
          institution_subtype: mem.institution?.subtype,
          representative_name: user?.name,
          representative_email: user?.email,
          designation: mem.designation,
          relationship: mem.relationship,
          verified_relationship: mem.verified_relationship || mem.relationship,
          authority_source: mem.authority_source,
          authority_verification_source: mem.authority_source,
          authority_verification_reference: mem.authority_verification_reference || (mem.metadata as any)?.reference || null,
          verified_at: mem.verified_at,
          verification_timestamp: mem.verified_at,
          verified_by: mem.verified_by,
          verifier_identity: mem.verified_by,
          is_verified: true,
          snapshot_taken_at: new Date().toISOString(),
        };
      } else if (dto.reporter_type === ReporterType.COMMUNITY) {
        challenge.reporter_type = ReporterType.COMMUNITY;
        challenge.institution_id = null as any;
        challenge.institution_membership_id = null as any;
        const user = await this.userRepo.findOne({ where: { id: userId } });
        const groupName = dto.community_group_name?.trim() || (challenge.verification_snapshot as any)?.community_group_name || 'Community Group / Collective';
        challenge.verification_snapshot = {
          reporter_type: ReporterType.COMMUNITY,
          community_group_name: groupName,
          submitted_by_name: user?.name || null,
          submitted_by_email: user?.email || null,
          is_community_collective: true,
          snapshot_taken_at: new Date().toISOString(),
        };
      } else {
        challenge.reporter_type = dto.reporter_type;
        challenge.institution_id = null as any;
        challenge.institution_membership_id = null as any;
        challenge.verification_snapshot = null as any;
      }
    }

    if (dto.audio_evidence_url && this.evidenceService) {
      try {
        await this.evidenceService.attachAudioEvidenceByUrl(
          challenge.id,
          userId,
          dto.audio_evidence_url,
          'Citizen Voice Recording Evidence',
        );
      } catch (audioErr: any) {
        this.logger.warn(`Failed to attach audio evidence in updateDraft for challenge ${challenge.id}: ${audioErr.message}`);
      }
    }

    return this.challengeRepo.save(challenge);
  }

  /**
   * Deletes a DRAFT challenge and permanently deletes all associated physical files.
   */
  async deleteDraft(
    id: string,
    userId: string,
    userRole?: string,
  ): Promise<{ success: boolean; message: string }> {
    const challenge = await this.challengeRepo.findOne({
      where: { id },
      relations: ['evidence'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${id}" not found.`);
    }

    if (challenge.status !== ChallengeStatus.DRAFT) {
      throw new BadRequestException('Only draft challenges can be deleted.');
    }

    if (challenge.submitted_by !== userId && userRole !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('You can only delete your own draft challenges.');
    }

    await this.draftCleanupService.explicitlyDeleteDraft(challenge);

    return {
      success: true,
      message: 'Draft challenge and associated evidence successfully deleted.',
    };
  }

  /**
   * Submits a draft challenge (transitions DRAFT -> SUBMITTED).
   * Enforces submission rate limits and mandatory field validation.
   */
  async submitChallenge(id: string, userId: string, correlationId?: string): Promise<Challenge> {
    // 1. Rate Limiting Check before claiming transaction
    const isDev = process.env.NODE_ENV !== 'production';
    let bypassLimit = false;

    if (isDev) {
      const user = await this.userRepo.findOne({ where: { id: userId } });
      const devBypassEmails = (
        process.env.DEV_BYPASS_EMAILS ||
        'citizen@dev.local,kamalvishnu54@gmail.com,shreenidhiu.24cse@kongu.edu,citizen@example.com'
      )
        .split(',')
        .map((e) => e.trim().toLowerCase());

      if (
        user &&
        (devBypassEmails.includes(user.email.toLowerCase()) ||
          user.email.endsWith('@dev.local'))
      ) {
        bypassLimit = true;
      }
    }

    if (!bypassLimit) {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentSubmissionsCount = await this.challengeRepo.count({
        where: {
          submitted_by: userId,
          status: In([
            ChallengeStatus.SUBMITTED,
            ChallengeStatus.UNDER_REVIEW,
            ChallengeStatus.VALIDATED,
            ChallengeStatus.REJECTED,
          ]),
          submitted_at: MoreThanOrEqual(oneDayAgo),
        },
      });

      if (recentSubmissionsCount >= this.maxDailySubmissions) {
        throw new HttpException(
          `Daily challenge submission limit reached (maximum ${this.maxDailySubmissions} submissions per 24 hours).`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // 2. Short atomic state claim (Lock row -> claim transition to PROCESSING -> COMMIT immediately)
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let savedChallenge: Challenge;
    let needsClustering = true;

    try {
      const challenge = await queryRunner.manager.findOne(Challenge, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!challenge) {
        throw new NotFoundException(`Challenge with ID "${id}" not found.`);
      }

      if (challenge.submitted_by !== userId) {
        throw new ForbiddenException('You can only submit your own draft challenge.');
      }

      if (challenge.status === ChallengeStatus.PROCESSING) {
        // Concurrency Guard: Another concurrent request or process is actively processing this challenge
        const lastUpdated = challenge.updated_at ? new Date(challenge.updated_at).getTime() : 0;
        const submittedTime = challenge.submitted_at ? new Date(challenge.submitted_at).getTime() : 0;
        const claimAgeMs = Date.now() - Math.max(lastUpdated, submittedTime);

        if (claimAgeMs < 45000) {
          // In-flight active claim: Commit lock and wait for completion rather than duplicate pipeline execution
          await queryRunner.commitTransaction();
          await queryRunner.release();

          for (let i = 0; i < 30; i++) {
            await new Promise((r) => setTimeout(r, 400));
            const activeReload = await this.challengeRepo.findOne({
              where: { id },
              relations: ['districtRef', 'blockRef', 'evidence', 'aiAnalysis', 'cluster'],
            });
            if (activeReload && activeReload.status !== ChallengeStatus.PROCESSING) {
              const res: any = activeReload;
              if (res.status === ChallengeStatus.SUBMITTED || res.status === ChallengeStatus.UNDER_REVIEW) {
                res.verification_display_status = 'Pending Government Verification';
              }
              return res;
            }
          }
          // If still in processing after wait, return safe snapshot
          const fallbackReload = await this.challengeRepo.findOne({
            where: { id },
            relations: ['districtRef', 'blockRef', 'evidence', 'aiAnalysis', 'cluster'],
          });
          const res: any = fallbackReload || challenge;
          res.verification_display_status = 'Pending Government Verification';
          return res;
        } else {
          // Stale PROCESSING claim (> 45s, likely from server restart): Reclaim and continue
          this.logger.warn(`Recovering stale PROCESSING challenge ${id} (age: ${claimAgeMs}ms)`);
          challenge.submitted_at = new Date();
          savedChallenge = await queryRunner.manager.save(challenge);
          await queryRunner.commitTransaction();
        }
      } else if (challenge.status !== ChallengeStatus.DRAFT) {
        // Idempotency: If already in SUBMITTED, UNDER_REVIEW, or VALIDATED
        if (
          challenge.status === ChallengeStatus.SUBMITTED ||
          challenge.status === ChallengeStatus.UNDER_REVIEW ||
          challenge.status === ChallengeStatus.VALIDATED
        ) {
          if (challenge.cluster_id) {
            await queryRunner.commitTransaction();
            const reloaded = await this.challengeRepo.findOne({
              where: { id },
              relations: ['districtRef', 'blockRef', 'evidence', 'aiAnalysis', 'cluster'],
            });
            const result: any = reloaded || challenge;
            result.verification_display_status = 'Pending Government Verification';
            return result;
          } else {
            // Recovery: Interrupted before clustering finished in a previous run.
            challenge.status = ChallengeStatus.PROCESSING;
            savedChallenge = await queryRunner.manager.save(challenge);
            needsClustering = true;
            await queryRunner.commitTransaction();
          }
        } else {
          throw new BadRequestException(`Challenge cannot be submitted in status "${challenge.status}".`);
        }
      } else {
        // Mandatory field validation before submission
        if (!challenge.title || challenge.title.trim().length < 5) {
          throw new BadRequestException('A clear problem title (at least 5 characters) is required to submit.');
        }
        if (!challenge.description || challenge.description.trim().length < 10) {
          throw new BadRequestException('A problem description (at least 10 characters) is required to submit.');
        }
        if (!challenge.district_id) {
          throw new BadRequestException('District selection is required before submitting.');
        }
        if (!challenge.block_id) {
          throw new BadRequestException('Block selection is required before submitting.');
        }

        // Zero-trust check: Re-verify representative authority if submitting officially
        if (
          challenge.reporter_type &&
          challenge.reporter_type !== ReporterType.INDIVIDUAL &&
          challenge.institution_id &&
          this.institutionMembershipsService
        ) {
          const valResult = await this.institutionMembershipsService.validateVerifiedMembership(
            userId,
            challenge.institution_id,
            challenge.institution_membership_id || undefined,
          );
          if (!valResult.valid) {
            throw new ForbiddenException(
              valResult.error ||
                'Representative authorization has changed or is no longer verified. Only active verified representatives may submit official institutional challenges.',
            );
          }
        }

        if (!challenge.district) {
          const district = await this.locationsService.getDistrictById(challenge.district_id);
          if (district) {
            challenge.district = district.name;
            challenge.state = district.state;
          }
        }

        // Atomically transition DRAFT -> PROCESSING
        challenge.status = ChallengeStatus.PROCESSING;
        challenge.submitted_at = new Date();
        savedChallenge = await queryRunner.manager.save(challenge);
        await queryRunner.commitTransaction();
      }
    } catch (claimErr) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw claimErr;
    } finally {
      if (!queryRunner.isReleased) {
        await queryRunner.release();
      }
    }

    // 3. Pipeline execution outside of the database row lock
    // 3A. Automated AI Problem Intelligence Pipeline
    try {
      if (this.aiAnalysisService) {
        const analysis = await this.aiAnalysisService.analyzeChallenge(savedChallenge.id, correlationId);
        (savedChallenge as any).aiAnalysis = analysis;
      }
    } catch (aiErr: any) {
      this.logger.warn(`AI structuring notice on submission: ${aiErr.message}`);
    }

    // 3B. Concurrency-Safe Problem Clustering (with PostgreSQL Transaction Advisory Lock)
    if (needsClustering && this.clustersService) {
      try {
        const cluster = await this.clustersService.clusterCitizenReport(savedChallenge.id);
        savedChallenge.cluster_id = cluster.id;
        savedChallenge.cluster = cluster;
      } catch (clusterErr: any) {
        this.logger.warn(`Clustering notice on submission: ${clusterErr.message}`);
      }
    }

    // 3C. Atomically finalize challenge status from PROCESSING to SUBMITTED
    const finalizeRunner = this.dataSource.createQueryRunner();
    await finalizeRunner.connect();
    await finalizeRunner.startTransaction();
    try {
      const chalToFinalize = await finalizeRunner.manager.findOne(Challenge, {
        where: { id: savedChallenge.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (chalToFinalize && chalToFinalize.status === ChallengeStatus.PROCESSING) {
        chalToFinalize.status = ChallengeStatus.SUBMITTED;
        if (savedChallenge.cluster_id) {
          chalToFinalize.cluster_id = savedChallenge.cluster_id;
        }
        savedChallenge = await finalizeRunner.manager.save(chalToFinalize);
      }
      await finalizeRunner.commitTransaction();
    } catch (finErr: any) {
      await finalizeRunner.rollbackTransaction();
      this.logger.error(`Error finalizing challenge status: ${finErr.message}`);
    } finally {
      await finalizeRunner.release();
    }

    // 3D. Direct Architecture: Automated University Capability Matching
    if (this.matchingService) {
      try {
        await this.matchingService.generateRecommendations(savedChallenge.id);
      } catch (matchErr: any) {
        this.logger.warn(`Capability matching notice on submission: ${matchErr.message}`);
      }
    }

    // 3E. Dispatch notifications
    try {
      if (savedChallenge.submitted_by) {
        await this.notifService?.notifyUser(
          savedChallenge.submitted_by,
          NotificationType.CHALLENGE_STATUS,
          `Problem Submitted Successfully: ${savedChallenge.title}`,
          `Your problem report has been analyzed by AI and matched with potential university solution providers. You will receive updates as university proposals arrive.`,
          'CHALLENGE',
          savedChallenge.id,
          savedChallenge.district_id,
          savedChallenge.district,
        );
      }

      if (savedChallenge.district_id || savedChallenge.district) {
        await this.notifService?.notifyDistrictOfficers(
          savedChallenge.district_id || savedChallenge.district,
          NotificationType.CHALLENGE_STATUS,
          `New Problem Requires Review: ${savedChallenge.title}`,
          `A new societal problem has been submitted in your jurisdiction (${savedChallenge.district || 'Assigned District'}). Priority: ${savedChallenge.priority || 'MEDIUM'}. Open for civic monitoring and university solution proposals.`,
          'CHALLENGE',
          savedChallenge.id,
          savedChallenge.district_id,
          savedChallenge.district,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch challenge submission notification: ${e}`);
    }

    const reloaded = await this.challengeRepo.findOne({
      where: { id: savedChallenge.id },
      relations: ['districtRef', 'blockRef', 'evidence', 'aiAnalysis', 'cluster'],
    });

    const result: any = reloaded || savedChallenge;
    if (result && (result.status === ChallengeStatus.SUBMITTED || result.status === ChallengeStatus.UNDER_REVIEW)) {
      result.verification_display_status = 'Open for University Solutions';
    }
    return result;
  }

  /**
   * Public discovery endpoint: returns SUBMITTED, UNDER_REVIEW, and VALIDATED challenges.
   * DRAFTS ARE STRICTLY EXCLUDED.
   * Submitter personal details are anonymized.
   */
  async getPublicChallenges(
    query: QueryChallengesDto,
    optionalUserId?: string,
  ): Promise<{ items: any[]; total: number; page: number; limit: number }> {
    const qb = this.challengeRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.districtRef', 'districtRef')
      .leftJoinAndSelect('c.blockRef', 'blockRef')
      .leftJoinAndSelect('c.evidence', 'evidence')
      .loadRelationCountAndMap('c.confirmationsCount', 'c.confirmations');

    // STRICT FILTER: Never return DRAFT or ARCHIVED publicly
    const allowedStatuses = [
      ChallengeStatus.SUBMITTED,
      ChallengeStatus.UNDER_REVIEW,
      ChallengeStatus.VALIDATED,
      ChallengeStatus.MATCHING,
      ChallengeStatus.MATCHED,
      ChallengeStatus.IN_PROGRESS,
      ChallengeStatus.COMPLETED,
      ChallengeStatus.PROJECT_INITIATED,
    ];

    if (query.status && allowedStatuses.includes(query.status)) {
      qb.andWhere('c.status = :status', { status: query.status });
    } else {
      qb.andWhere('c.status IN (:...allowedStatuses)', { allowedStatuses });
    }

    if (optionalUserId) {
      const authUser = await this.userRepo.findOne({ where: { id: optionalUserId } });
      if (authUser?.role === UserRole.GOVERNMENT_OFFICER) {
        // ENFORCE DISTRICT BOUNDARY: Officers cannot manipulate query params to bypass jurisdiction
        qb.andWhere('c.district_id = :canonicalOfficerDistId', {
          canonicalOfficerDistId: authUser.district_id || '00000000-0000-0000-0000-000000000000',
        });
      } else if (query.district_id) {
        qb.andWhere('c.district_id = :distId', { distId: query.district_id });
      }
    } else if (query.district_id) {
      qb.andWhere('c.district_id = :distId', { distId: query.district_id });
    }

    if (query.block_id) {
      qb.andWhere('c.block_id = :blockId', { blockId: query.block_id });
    }

    if (query.search && query.search.trim()) {
      qb.andWhere(
        '(c.title ILIKE :search OR c.description ILIKE :search OR c.village_locality ILIKE :search)',
        { search: `%${query.search.trim()}%` },
      );
    }

    qb.orderBy('c.created_at', 'DESC');

    const page = query.page || 1;
    const limit = query.limit || 20;
    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();

    // Map items: anonymize submitter and attach user confirmation status
    let userConfirmations: Set<string> = new Set();
    if (optionalUserId) {
      const confirmations = await this.confirmationRepo.find({
        where: { user_id: optionalUserId },
        select: ['challenge_id'],
      });
      userConfirmations = new Set(confirmations.map((c) => c.challenge_id));
    }

    const sanitizedItems = items.map((item: any) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      original_text: item.original_text,
      original_language: item.original_language,
      normalized_text: item.normalized_text,
      processing_language: item.processing_language,
      translation_status: item.translation_status,
      translation_metadata: item.translation_metadata,
      professional_title: item.professional_title,
      professional_problem_statement: item.professional_problem_statement,
      citizen_facts: item.citizen_facts || [],
      platform_metadata: item.platform_metadata || {},
      refinement_status: item.refinement_status,
      refined_at: item.refined_at,
      district: item.district,
      state: item.state,
      village_locality: item.village_locality,
      district_id: item.district_id,
      block_id: item.block_id,
      districtName: item.districtRef?.name || item.district,
      blockName: item.blockRef?.name || null,
      citizen_severity: item.citizen_severity,
      affected_population: item.affected_population,
      status: item.status,
      created_at: item.created_at,
      submitted_at: item.submitted_at,
      evidenceCount: item.evidence ? item.evidence.length : 0,
      confirmationsCount: item.confirmationsCount || 0,
      hasConfirmed: userConfirmations.has(item.id),
      submitter: {
        name: 'Community Member',
      },
    }));

    return {
      items: sanitizedItems,
      total,
      page,
      limit,
    };
  }

  /**
   * Returns details of a specific challenge.
   * Drafts are only accessible to their owner or platform admin.
   */
  async getChallengeById(
    id: string,
    optionalUserId?: string,
    optionalUserRole?: string,
  ): Promise<any> {
    const challenge = await this.challengeRepo.findOne({
      where: { id },
      relations: ['districtRef', 'blockRef', 'evidence', 'submitter', 'aiAnalysis', 'cluster'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${id}" not found.`);
    }

    // Authoritative Fresh Server-Side User & Jurisdiction Verification
    let authenticatedUser: User | null = null;
    if (optionalUserId) {
      authenticatedUser = await this.userRepo.findOne({ where: { id: optionalUserId } });
    }

    if (authenticatedUser && authenticatedUser.role === UserRole.GOVERNMENT_OFFICER) {
      this.jurisdictionService.validateChallengeAccess(authenticatedUser, challenge);
    }

    // Privacy protection for DRAFTS
    if (challenge.status === ChallengeStatus.DRAFT) {
      const isOwner = optionalUserId && challenge.submitted_by === optionalUserId;
      const isAdmin =
        authenticatedUser?.role === UserRole.PLATFORM_ADMIN ||
        optionalUserRole === UserRole.PLATFORM_ADMIN;
      if (!isOwner && !isAdmin) {
        throw new NotFoundException(`Challenge with ID "${id}" not found.`);
      }
    }

    const confirmationsCount = await this.confirmationRepo.count({
      where: { challenge_id: id },
    });

    let hasConfirmed = false;
    if (optionalUserId) {
      const conf = await this.confirmationRepo.findOne({
        where: { challenge_id: id, user_id: optionalUserId },
      });
      hasConfirmed = !!conf;
    }

    const isOwner = optionalUserId === challenge.submitted_by;

    const verificationDisplayStatus =
      challenge.status === ChallengeStatus.VALIDATED
        ? 'Validated'
        : challenge.status === ChallengeStatus.REJECTED
        ? 'Rejected'
        : 'Pending Government Verification';

    return {
      id: challenge.id,
      title: challenge.title,
      description: challenge.description,
      original_text: challenge.original_text,
      original_language: challenge.original_language,
      normalized_text: challenge.normalized_text,
      processing_language: challenge.processing_language,
      translation_status: challenge.translation_status,
      translation_metadata: challenge.translation_metadata,
      professional_title: challenge.professional_title,
      professional_problem_statement: challenge.professional_problem_statement,
      citizen_facts: challenge.citizen_facts || challenge.aiAnalysis?.citizen_facts || [],
      platform_metadata: challenge.platform_metadata || challenge.aiAnalysis?.platform_metadata || {},
      refinement_status: challenge.refinement_status,
      refined_at: challenge.refined_at,
      district_id: challenge.district_id,
      block_id: challenge.block_id,
      district: challenge.district,
      state: challenge.state,
      districtName: challenge.districtRef?.name || challenge.district,
      blockName: challenge.blockRef?.name || null,
      village_locality: challenge.village_locality,
      location: challenge.location,
      latitude: challenge.latitude,
      longitude: challenge.longitude,
      citizen_severity: challenge.citizen_severity,
      affected_population: challenge.affected_population,
      status: challenge.status,
      verification_display_status: verificationDisplayStatus,
      priority: challenge.priority,
      category: challenge.category,
      created_at: challenge.created_at,
      updated_at: challenge.updated_at,
      submitted_at: challenge.submitted_at,
      validated_at: challenge.validated_at,
      rejection_reason: challenge.rejection_reason,
      cluster_id: challenge.cluster_id || null,
      potential_cluster_id: challenge.potential_cluster_id || null,
      clustering_status: challenge.clustering_status || null,
      cluster: challenge.cluster
        ? {
            id: challenge.cluster.id,
            title: challenge.cluster.title,
            description: challenge.cluster.description,
            category: challenge.cluster.category,
            district: challenge.cluster.district,
            status: challenge.cluster.status,
            priority: challenge.cluster.priority,
            priority_score: challenge.cluster.priority_score,
            report_count: challenge.cluster.report_count,
            ai_confidence: challenge.cluster.ai_confidence,
            ai_processing_status: challenge.cluster.ai_processing_status,
            created_at: challenge.cluster.created_at,
          }
        : null,
      aiAnalysis: challenge.aiAnalysis
        ? {
            id: challenge.aiAnalysis.id,
            domain: challenge.aiAnalysis.domain || null,
            subdomain: challenge.aiAnalysis.subdomain || null,
            category: challenge.aiAnalysis.category || null,
            sub_category: challenge.aiAnalysis.sub_category || null,
            summary: challenge.aiAnalysis.summary,
            professional_title: challenge.aiAnalysis.professional_title,
            professional_problem_statement: challenge.aiAnalysis.professional_problem_statement,
            citizen_facts: challenge.aiAnalysis.citizen_facts || challenge.citizen_facts || [],
            platform_metadata: challenge.aiAnalysis.platform_metadata || challenge.platform_metadata || {},
            key_facts: challenge.aiAnalysis.key_facts || challenge.aiAnalysis.citizen_facts || [],
            refinement_status: challenge.aiAnalysis.refinement_status,
            refined_at: challenge.aiAnalysis.refined_at,
            required_technologies: challenge.aiAnalysis.required_technologies || [],
            required_capabilities: challenge.aiAnalysis.required_capabilities || [],
            keywords: challenge.aiAnalysis.keywords || [],
            confidence: challenge.aiAnalysis.confidence,
            model_name: challenge.aiAnalysis.model_name,
            ai_processing_status: challenge.aiAnalysis.ai_processing_status || 'SUCCESS',
            raw_analysis: challenge.aiAnalysis.raw_analysis || {},
          }
        : null,
      evidence: (challenge.evidence || []).map((ev) => ({
        id: ev.id,
        title: ev.title,
        description: ev.description,
        evidence_type: ev.evidence_type,
        url: ev.url,
        mime_type: ev.mime_type,
        metadata: ev.metadata,
        created_at: ev.created_at,
      })),
      confirmationsCount,
      hasConfirmed,
      isOwner,
      submitter_id: challenge.submitted_by,
      submitter: {
        id: challenge.submitted_by,
        name: isOwner ? challenge.submitter?.name || 'You' : 'Community Member',
      },
    };
  }

  /**
   * Retrieves all challenges created by a specific user.
   */
  async getMyChallenges(userId: string): Promise<any[]> {
    const challenges = await this.challengeRepo.find({
      where: { submitted_by: userId },
      relations: ['districtRef', 'blockRef', 'evidence', 'aiAnalysis'],
      order: { created_at: 'DESC' },
    });

    const results = [];
    for (const c of challenges) {
      const confirmationsCount = await this.confirmationRepo.count({
        where: { challenge_id: c.id },
      });

      results.push({
        id: c.id,
        title: c.title,
        description: c.description,
        original_text: c.original_text,
        original_language: c.original_language,
        normalized_text: c.normalized_text,
        processing_language: c.processing_language,
        translation_status: c.translation_status,
        translation_metadata: c.translation_metadata,
        professional_title: c.professional_title,
        professional_problem_statement: c.professional_problem_statement,
        citizen_facts: c.citizen_facts || [],
        platform_metadata: c.platform_metadata || {},
        refinement_status: c.refinement_status,
        refined_at: c.refined_at,
        status: c.status,
        verification_display_status:
          c.status === ChallengeStatus.VALIDATED
            ? 'Validated'
            : c.status === ChallengeStatus.REJECTED
            ? 'Rejected'
            : 'Pending Government Verification',
        cluster_id: c.cluster_id || null,
        potential_cluster_id: c.potential_cluster_id || null,
        clustering_status: c.clustering_status || null,
        district_id: c.district_id,
        block_id: c.block_id,
        districtName: c.districtRef?.name || c.district,
        blockName: c.blockRef?.name || null,
        village_locality: c.village_locality,
        citizen_severity: c.citizen_severity,
        affected_population: c.affected_population,
        created_at: c.created_at,
        submitted_at: c.submitted_at,
        validated_at: c.validated_at,
        rejection_reason: c.rejection_reason,
        aiAnalysis: c.aiAnalysis
          ? {
              domain: c.aiAnalysis.domain || c.aiAnalysis.category || c.category,
              subdomain: c.aiAnalysis.subdomain || c.aiAnalysis.sub_category,
              category: c.aiAnalysis.category,
              required_technologies: c.aiAnalysis.required_technologies || c.aiAnalysis.required_capabilities || [],
              keywords: c.aiAnalysis.keywords || [],
              ai_processing_status: c.aiAnalysis.ai_processing_status || 'SUCCESS',
            }
          : null,
        evidenceCount: c.evidence ? c.evidence.length : 0,
        confirmationsCount,
      });
    }

    return results;
  }

  /**
   * Community Confirmation ("I experience this problem too").
   * ANTI-SELF-CONFIRMATION: Citizens CANNOT confirm their own challenges.
   * Database uniqueness constraint ensures 1 confirmation per user per challenge.
   */
  async confirmChallenge(
    challengeId: string,
    userId: string,
  ): Promise<{ success: boolean; confirmationsCount: number }> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    if (challenge.status === ChallengeStatus.DRAFT) {
      throw new BadRequestException('Draft challenges cannot be confirmed.');
    }

    // CRITICAL: Prevent self-confirmation
    if (challenge.submitted_by === userId) {
      throw new ForbiddenException('Citizens cannot confirm their own challenges.');
    }

    // Insert confirmation or ignore if already confirmed
    try {
      const existing = await this.confirmationRepo.findOne({
        where: { challenge_id: challengeId, user_id: userId },
      });

      if (!existing) {
        const conf = this.confirmationRepo.create({
          challenge_id: challengeId,
          user_id: userId,
        });
        await this.confirmationRepo.save(conf);
      }
    } catch (err: any) {
      // Catch unique constraint violation gracefully
      this.logger.debug(`Confirmation record collision: ${err.message}`);
    }

    const confirmationsCount = await this.confirmationRepo.count({
      where: { challenge_id: challengeId },
    });

    return {
      success: true,
      confirmationsCount,
    };
  }

  /**
   * Removes a user's community confirmation.
   */
  async unconfirmChallenge(
    challengeId: string,
    userId: string,
  ): Promise<{ success: boolean; confirmationsCount: number }> {
    await this.confirmationRepo.delete({
      challenge_id: challengeId,
      user_id: userId,
    });

    const confirmationsCount = await this.confirmationRepo.count({
      where: { challenge_id: challengeId },
    });

    return {
      success: true,
      confirmationsCount,
    };
  }

  /**
   * Retrieves reviewer queue for authorized reviewers with authoritative jurisdiction scoping.
   */
  async getReviewerQueue(statusFilter?: ChallengeStatus, userOrId?: any): Promise<Challenge[]> {
    const queryStatuses = statusFilter
      ? [statusFilter]
      : [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_REVIEW];

    let authenticatedUser: User | null = null;
    if (userOrId) {
      const userId = typeof userOrId === 'string' ? userOrId : userOrId.id;
      if (userId) {
        authenticatedUser = await this.userRepo.findOne({ where: { id: userId } });
      }
    }

    const whereClause: any = { status: In(queryStatuses) };

    if (authenticatedUser?.role === UserRole.GOVERNMENT_OFFICER) {
      // Bounded strictly to the officer's canonical district_id
      if (!authenticatedUser.district_id) {
        return [];
      }
      whereClause.district_id = authenticatedUser.district_id;
    } else if (authenticatedUser?.role === UserRole.GOVERNMENT_ADMIN) {
      whereClause.state = authenticatedUser.state || 'Jharkhand';
    }

    return this.challengeRepo.find({
      where: whereClause,
      relations: ['districtRef', 'blockRef', 'evidence', 'submitter'],
      order: { submitted_at: 'ASC', created_at: 'ASC' },
    });
  }

  /**
   * Reviews a challenge (SUBMITTED -> UNDER_REVIEW -> VALIDATED / REJECTED).
   * Rejection strictly requires a reason.
   */
  async reviewChallenge(
    challengeId: string,
    dto: ReviewChallengeDto,
    reviewerOrId: any,
  ): Promise<Challenge> {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
      relations: ['districtRef', 'blockRef', 'evidence'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    if (challenge.status === ChallengeStatus.DRAFT) {
      throw new BadRequestException('Draft challenges cannot be reviewed.');
    }

    // Authoritative Reviewer Lookup
    const reviewerId = typeof reviewerOrId === 'string' ? reviewerOrId : reviewerOrId.id;
    const reviewer = await this.userRepo.findOne({ where: { id: reviewerId } });
    if (!reviewer) {
      throw new UnauthorizedException('Reviewer account not found.');
    }

    // Strict Canonical Jurisdiction Enforcement
    this.jurisdictionService.validateChallengeAccess(reviewer, challenge);

    // Workflow state validation
    const validTargets = [
      ChallengeStatus.UNDER_REVIEW,
      ChallengeStatus.VALIDATED,
      ChallengeStatus.REJECTED,
    ];

    if (!validTargets.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid review target status. Must be one of: ${validTargets.join(', ')}.`,
      );
    }

    // Require reason for rejection
    if (dto.status === ChallengeStatus.REJECTED) {
      if (!dto.reason || dto.reason.trim().length === 0) {
        throw new BadRequestException('A reason is mandatory when rejecting a challenge.');
      }
      challenge.rejection_reason = dto.reason.trim();
    }

    if (dto.status === ChallengeStatus.VALIDATED) {
      challenge.validated_at = new Date();
      challenge.rejection_reason = null as any;
    }

    challenge.status = dto.status;
    const saved = await this.challengeRepo.save(challenge);

    // Immutable Audit Trail in verification_records
    try {
      await this.verifRecordRepo.save(
        this.verifRecordRepo.create({
          entity_type: 'CHALLENGE',
          entity_id: saved.id,
          verification_status:
            saved.status === ChallengeStatus.VALIDATED
              ? VerificationStatus.VERIFIED
              : VerificationStatus.REJECTED,
          verification_source: 'GOVERNMENT_REVIEW',
          verified_by: reviewer.id,
          verified_at: new Date(),
          notes: dto.reason || `Challenge marked ${saved.status} by government reviewer`,
          jurisdiction: reviewer.district
            ? `${reviewer.district} District`
            : reviewer.state || 'Statewide',
          verifier_role: reviewer.role,
        }),
      );
    } catch (auditErr: any) {
      this.logger.warn(`Failed to record challenge verification audit: ${auditErr.message}`);
    }

    try {
      if (saved.submitted_by) {
        await this.notifService?.notifyUser(
          saved.submitted_by,
          NotificationType.CHALLENGE_STATUS,
          `Challenge Review Update: ${saved.title}`,
          `Your challenge "${saved.title}" status is now ${saved.status}.${dto.reason ? ' Reason: ' + dto.reason : ''}`,
          'CHALLENGE',
          saved.id,
        );
      }
    } catch (e) {
      this.logger.warn(`Failed to dispatch challenge review notification: ${e}`);
    }

    // POST-GOVERNMENT-VERIFICATION: Trigger capability matching ONLY when validated
    if (saved.status === ChallengeStatus.VALIDATED && this.matchingService) {
      try {
        await this.matchingService.generateRecommendations(saved.id);
      } catch (matchErr: any) {
        this.logger.warn(`Post-verification matching failed for challenge ${saved.id}: ${matchErr.message}`);
      }
    }

    return saved;
  }

  /**
   * Evidence attachment: allowed only while in DRAFT status.
   */
  async uploadEvidence(
    challengeId: string,
    file: ExpressUploadedFile,
    userId: string,
    title?: string,
    description?: string,
  ) {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    if (challenge.status !== ChallengeStatus.DRAFT) {
      throw new BadRequestException('Evidence can only be added to DRAFT challenges.');
    }

    if (challenge.submitted_by !== userId) {
      throw new ForbiddenException('You can only upload evidence to your own draft.');
    }

    return this.evidenceService.saveEvidenceFile(
      challengeId,
      file,
      userId,
      title,
      description,
    );
  }

  /**
   * Removes an evidence item from a DRAFT challenge.
   */
  async deleteEvidence(challengeId: string, evidenceId: string, userId: string) {
    const challenge = await this.challengeRepo.findOne({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${challengeId}" not found.`);
    }

    if (challenge.status !== ChallengeStatus.DRAFT) {
      throw new BadRequestException('Evidence can only be removed from DRAFT challenges.');
    }

    if (challenge.submitted_by !== userId) {
      throw new ForbiddenException('You can only delete evidence from your own draft.');
    }

    const success = await this.evidenceService.deleteEvidenceFile(evidenceId);
    if (!success) {
      throw new NotFoundException(`Evidence with ID "${evidenceId}" not found.`);
    }

    return { success: true, message: 'Evidence successfully removed.' };
  }

  /**
   * On-demand translation of a challenge into a target language (e.g. 'hi' or 'en').
   * Caches results in translation_metadata and enforces authorization boundaries.
   */
  async translateChallenge(
    id: string,
    targetLanguage: string = 'hi',
    userId?: string,
    userRole?: string,
  ): Promise<any> {
    const challenge = await this.challengeRepo.findOne({
      where: { id },
      relations: ['districtRef', 'blockRef', 'evidence'],
    });

    if (!challenge) {
      throw new NotFoundException(`Challenge with ID "${id}" not found.`);
    }

    // Check visibility: draft challenges can only be accessed by owner or platform admin
    if (challenge.status === ChallengeStatus.DRAFT) {
      if (!userId || (challenge.submitted_by !== userId && userRole !== UserRole.PLATFORM_ADMIN)) {
        throw new NotFoundException(`Challenge with ID "${id}" not found.`);
      }
    }

    const textToTranslate = challenge.original_text || challenge.description;
    const currentMeta = challenge.translation_metadata || {};
    const cachedTranslations = currentMeta.translations || {};

    if (cachedTranslations[targetLanguage]) {
      return {
        challenge_id: challenge.id,
        original_text: textToTranslate,
        original_language: challenge.original_language || 'auto',
        translated_text: cachedTranslations[targetLanguage].text,
        translated_description: cachedTranslations[targetLanguage].text,
        target_language: targetLanguage,
        confidence: cachedTranslations[targetLanguage].confidence,
        provider: cachedTranslations[targetLanguage].provider,
        cached: true,
        requires_review: cachedTranslations[targetLanguage].requires_review || false,
      };
    }

    if (!this.aiAnalysisService) {
      const fallbackText = targetLanguage === 'en' ? challenge.normalized_text || textToTranslate : textToTranslate;
      return {
        challenge_id: challenge.id,
        original_text: textToTranslate,
        original_language: challenge.original_language || 'auto',
        translated_text: fallbackText,
        translated_description: fallbackText,
        target_language: targetLanguage,
        confidence: 0.8,
        provider: 'fallback',
        cached: false,
        requires_review: false,
      };
    }

    const translationRes = await this.aiAnalysisService.translateText(
      textToTranslate,
      challenge.original_language || 'auto',
      targetLanguage,
    );

    const effectiveTranslatedText =
      translationRes.translated_text ||
      (targetLanguage === 'en' ? challenge.normalized_text : null);

    if (effectiveTranslatedText) {
      cachedTranslations[targetLanguage] = {
        text: effectiveTranslatedText,
        confidence: translationRes.confidence || 0.85,
        provider: translationRes.provider || 'pipeline_normalized',
        model: translationRes.model || 'normalized_fallback',
        translated_at: new Date().toISOString(),
        requires_review: translationRes.requires_review || false,
      };
      challenge.translation_metadata = {
        ...currentMeta,
        translations: cachedTranslations,
      };
      await this.challengeRepo.save(challenge);
    }

    return {
      challenge_id: challenge.id,
      original_text: textToTranslate,
      original_language: challenge.original_language || 'auto',
      translated_text: effectiveTranslatedText,
      translated_description: effectiveTranslatedText,
      target_language: targetLanguage,
      confidence: translationRes.confidence || 0.85,
      provider: translationRes.provider || 'pipeline_normalized',
      cached: false,
      requires_review: translationRes.requires_review || false,
      failure_reason: translationRes.failure_reason,
    };
  }

  /**
   * Development/test-only method to reset daily submission limits for a user.
   * Shifts recent submissions older than 24 hours so rate limiting resets to 0.
   */
  async resetUserSubmissionLimits(
    userId?: string,
    email?: string,
  ): Promise<{ success: boolean; message: string; count: number }> {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException('Rate limit reset is only available in development and test environments.');
    }

    let targetUserId = userId;
    if (email) {
      const user = await this.userRepo.findOne({ where: { email } });
      if (!user) {
        throw new NotFoundException(`User with email "${email}" not found.`);
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new BadRequestException('User ID or email must be provided to reset limits.');
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const challenges = await this.challengeRepo.find({
      where: {
        submitted_by: targetUserId,
        submitted_at: MoreThanOrEqual(oneDayAgo),
      },
    });

    for (const challenge of challenges) {
      challenge.submitted_at = twentyFiveHoursAgo;
      await this.challengeRepo.save(challenge);
    }

    this.logger.log(
      `[Dev] Reset daily submission limits for user ${targetUserId} (${challenges.length} challenges shifted to >24h ago)`,
    );

    return {
      success: true,
      message: `Successfully reset daily submission limit for user (${challenges.length} records shifted).`,
      count: challenges.length,
    };
  }
}

