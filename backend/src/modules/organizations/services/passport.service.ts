import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Organization } from '../entities/organization.entity';
import { OrganizationMembership } from '../entities/organization-membership.entity';
import { OrganizationEvidence } from '../entities/organization-evidence.entity';
import { InstitutionProfile } from '../../institutions/entities/institution-profile.entity';
import { Department } from '../../institutions/entities/department.entity';
import { Laboratory } from '../../institutions/entities/laboratory.entity';
import { ResearchArea } from '../../institutions/entities/research-area.entity';
import { InstitutionCapability } from '../../institutions/entities/institution-capability.entity';
import { IndustryProfile } from '../../industries/entities/industry-profile.entity';
import { IndustryCapability } from '../../industries/entities/industry-capability.entity';
import { Capability } from '../../capabilities/entities/capability.entity';
import { EntityEmbedding, EntityEmbeddingType } from '../../ai-analysis/entities/entity-embedding.entity';
import { User } from '../../users/entities/user.entity';
import {
  CapabilitySource,
  GeographicReach,
  OrganizationRole,
  OrganizationType,
  UserRole,
  VerificationStatus,
} from '../../../common/enums';
import { UpdatePassportDto } from '../dto/update-passport.dto';
import { AddCapabilityDto } from '../dto/add-capability.dto';
import { CreateOrganizationEvidenceDto } from '../dto/create-evidence.dto';

@Injectable()
export class PassportService {
  constructor(
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(OrganizationEvidence)
    private readonly evidenceRepo: Repository<OrganizationEvidence>,
    @InjectRepository(InstitutionProfile)
    private readonly instProfileRepo: Repository<InstitutionProfile>,
    @InjectRepository(Department)
    private readonly deptRepo: Repository<Department>,
    @InjectRepository(Laboratory)
    private readonly labRepo: Repository<Laboratory>,
    @InjectRepository(ResearchArea)
    private readonly researchAreaRepo: Repository<ResearchArea>,
    @InjectRepository(InstitutionCapability)
    private readonly instCapRepo: Repository<InstitutionCapability>,
    @InjectRepository(IndustryProfile)
    private readonly indProfileRepo: Repository<IndustryProfile>,
    @InjectRepository(IndustryCapability)
    private readonly indCapRepo: Repository<IndustryCapability>,
    @InjectRepository(Capability)
    private readonly capRepo: Repository<Capability>,
    @InjectRepository(EntityEmbedding)
    private readonly embeddingRepo: Repository<EntityEmbedding>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Helper to verify if a user has representative permissions for an organization.
   */
  async assertOrgAccess(orgId: string, userId: string): Promise<void> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (user && user.role === UserRole.PLATFORM_ADMIN) {
      return; // Platform Admin has universal override
    }

    const membership = await this.memberRepo.findOne({
      where: { organization_id: orgId, user_id: userId },
    });

    if (!membership) {
      throw new ForbiddenException('You are not authorized to modify this organization passport.');
    }
  }

  /**
   * Retrieves the full polymorphic capability passport.
   */
  async getPassport(orgId: string) {
    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: [
        'institutionProfile',
        'institutionProfile.departments',
        'institutionProfile.laboratories',
        'institutionProfile.researchAreas',
        'institutionProfile.capabilities',
        'institutionProfile.capabilities.capability',
        'institutionProfile.capabilities.department',
        'institutionProfile.capabilities.laboratory',
        'industryProfile',
        'industryProfile.capabilities',
        'industryProfile.capabilities.capability',
        'industryProfile.capabilities.supportType',
        'evidence',
        'evidence.capability',
        'evidence.institutionCapability',
        'evidence.industryCapability',
      ],
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    // Retrieve active AI embedding metadata
    const embedding = await this.embeddingRepo.findOne({
      where: { entity_id: orgId, entity_type: EntityEmbeddingType.ORGANIZATION },
    });

    const isHei = org.organization_type === OrganizationType.INSTITUTION;

    return {
      organization: {
        id: org.id,
        name: org.name,
        organization_type: org.organization_type,
        geographic_reach: org.geographic_reach || GeographicReach.DISTRICT,
        is_demo: org.is_demo || false,
        description: org.description,
        website: org.website,
        email: org.email,
        phone: org.phone,
        address: org.address,
        district: org.district,
        state: org.state,
        verification_status: org.verification_status,
        is_claimed: org.is_claimed,
        claimed_at: org.claimed_at,
        available_capacity: org.available_capacity,
        availability_status: org.availability_status,
        availability_confirmed_at: org.availability_confirmed_at,
        availability_expires_at: org.availability_expires_at,
      },
      passport_type: isHei ? 'HEI_PASSPORT' : 'INDUSTRY_PASSPORT',
      profile_details: isHei ? org.institutionProfile : org.industryProfile,
      capabilities: isHei
        ? (org.institutionProfile?.capabilities || []).map((c) => ({
            id: c.id,
            capability_id: c.capability_id,
            name: c.capability?.name,
            category: c.capability?.category,
            department: c.department?.name,
            laboratory: c.laboratory?.name,
            verification_status: c.verification_status,
            source: c.source,
            confidence_score: c.confidence_score,
            evidence_summary: c.evidence_summary,
          }))
        : (org.industryProfile?.capabilities || []).map((c) => ({
            id: c.id,
            capability_id: c.capability_id,
            name: c.capability?.name,
            category: c.capability?.category,
            support_type: c.supportType?.name,
            support_type_code: c.supportType?.code,
            verification_status: c.verification_status,
            source: c.source,
            notes: c.notes,
          })),
      evidence: (org.evidence || []).map((e) => ({
        id: e.id,
        title: e.title,
        description: e.description,
        evidence_type: e.evidence_type,
        url: e.url,
        mime_type: e.mime_type,
        is_public: e.is_public || false,
        verification_status: e.verification_status,
        verified_at: e.verified_at,
        linked_capability: e.capability?.name || null,
      })),
      ai_indexing: {
        indexing_status: embedding?.indexing_status || 'NOT_INDEXED',
        last_indexed_at: embedding?.last_indexed_at || null,
        dimensions: embedding?.dimensions || 2048,
        model_name: embedding?.model_name || 'nvidia/nemotron-3-embed-1b',
        is_active: embedding?.is_active || false,
      },
    };
  }

  /**
   * Atomic self-serve update of organization metadata and sub-profiles.
   */
  async updatePassport(orgId: string, userId: string, dto: UpdatePassportDto) {
    await this.assertOrgAccess(orgId, userId);

    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['institutionProfile', 'industryProfile'],
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    // Update base fields
    if (dto.description !== undefined) org.description = dto.description;
    if (dto.website !== undefined) org.website = dto.website;
    if (dto.email !== undefined) org.email = dto.email;
    if (dto.phone !== undefined) org.phone = dto.phone;
    if (dto.address !== undefined) org.address = dto.address;
    if (dto.district !== undefined) org.district = dto.district;
    if (dto.state !== undefined) org.state = dto.state;
    if (dto.geographic_reach !== undefined) org.geographic_reach = dto.geographic_reach;

    await this.orgRepo.save(org);

    // Update HEI profile if applicable
    if (org.organization_type === OrganizationType.INSTITUTION) {
      let inst = org.institutionProfile;
      if (!inst) {
        inst = await this.instProfileRepo.save(
          this.instProfileRepo.create({
            organization_id: org.id,
            institution_code: dto.institution_code || `HEI-${Date.now().toString().slice(-6)}`,
          }),
        );
      }
      if (dto.institution_category !== undefined) inst.institution_category = dto.institution_category;
      if (dto.established_year !== undefined) inst.established_year = dto.established_year;
      if (dto.campus_area !== undefined) inst.campus_area = dto.campus_area;
      await this.instProfileRepo.save(inst);

      // Handle departments
      if (dto.departments && dto.departments.length > 0) {
        for (const deptDto of dto.departments) {
          const existing = await this.deptRepo.findOne({
            where: { institution_id: inst.id, name: deptDto.name },
          });
          if (!existing) {
            await this.deptRepo.save(
              this.deptRepo.create({
                institution_id: inst.id,
                name: deptDto.name,
                code: deptDto.code || deptDto.name.substring(0, 4).toUpperCase(),
              }),
            );
          }
        }
      }

      // Handle labs
      if (dto.laboratories && dto.laboratories.length > 0) {
        for (const labDto of dto.laboratories) {
          const existing = await this.labRepo.findOne({
            where: { institution_id: inst.id, name: labDto.name },
          });
          if (!existing) {
            await this.labRepo.save(
              this.labRepo.create({
                institution_id: inst.id,
                name: labDto.name,
                description: labDto.description || null,
              }),
            );
          }
        }
      }

      // Handle research areas
      if (dto.research_areas && dto.research_areas.length > 0) {
        for (const raDto of dto.research_areas) {
          const existing = await this.researchAreaRepo.findOne({
            where: { institution_id: inst.id, title: raDto.name },
          });
          if (!existing) {
            await this.researchAreaRepo.save(
              this.researchAreaRepo.create({
                institution_id: inst.id,
                title: raDto.name,
                description: raDto.description || null,
              }),
            );
          }
        }
      }
    }

    // Update Industry profile if applicable
    if (org.organization_type !== OrganizationType.INSTITUTION) {
      let ind = org.industryProfile;
      if (!ind) {
        ind = await this.indProfileRepo.save(
          this.indProfileRepo.create({
            organization_id: org.id,
            company_registration_number: dto.company_registration_number,
          }),
        );
      }
      if (dto.industry_type !== undefined) ind.industry_type = dto.industry_type;
      if (dto.headquarters !== undefined) ind.headquarters = dto.headquarters;
      if (dto.company_registration_number !== undefined) ind.company_registration_number = dto.company_registration_number;
      await this.indProfileRepo.save(ind);
    }

    // Emit event for async AI indexing
    this.eventEmitter.emit('organization.updated', { organizationId: org.id });

    return this.getPassport(org.id);
  }

  /**
   * Attaches a master capability to the organization passport in UNVERIFIED trust state.
   */
  async addCapability(orgId: string, userId: string, dto: AddCapabilityDto) {
    await this.assertOrgAccess(orgId, userId);

    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['institutionProfile', 'industryProfile'],
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    // Validate that capability exists in Master Taxonomy
    const cap = await this.capRepo.findOne({ where: { id: dto.capability_id } });
    if (!cap) {
      throw new BadRequestException(`Capability with ID "${dto.capability_id}" does not exist in master taxonomy.`);
    }

    if (org.organization_type === OrganizationType.INSTITUTION) {
      let inst = org.institutionProfile;
      if (!inst) {
        inst = await this.instProfileRepo.save(
          this.instProfileRepo.create({
            organization_id: org.id,
            institution_code: `HEI-${Date.now().toString().slice(-6)}`,
          }),
        );
      }

      const existing = await this.instCapRepo.findOne({
        where: { institution_id: inst.id, capability_id: cap.id },
      });

      if (existing) {
        throw new BadRequestException('This capability is already attached to your institution passport.');
      }

      await this.instCapRepo.save(
        this.instCapRepo.create({
          institution_id: inst.id,
          capability_id: cap.id,
          department_id: dto.department_id || null,
          laboratory_id: dto.laboratory_id || null,
          source: CapabilitySource.ORGANIZATION_PROVIDED,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.5,
          evidence_summary: dto.evidence_summary || null,
        }),
      );
    } else {
      let ind = org.industryProfile;
      if (!ind) {
        ind = await this.indProfileRepo.save(
          this.indProfileRepo.create({
            organization_id: org.id,
            industry_type: 'General',
          }),
        );
      }

      const existing = await this.indCapRepo.findOne({
        where: { industry_id: ind.id, capability_id: cap.id },
      });

      if (existing) {
        throw new BadRequestException('This capability is already attached to your industry passport.');
      }

      await this.indCapRepo.save(
        this.indCapRepo.create({
          industry_id: ind.id,
          capability_id: cap.id,
          support_type_id: dto.support_type_id || null,
          source: CapabilitySource.ORGANIZATION_PROVIDED,
          verification_status: VerificationStatus.UNVERIFIED,
          confidence_score: 0.5,
          notes: dto.notes || null,
        }),
      );
    }

    this.eventEmitter.emit('organization.capabilities_updated', { organizationId: org.id });

    return {
      message: `Capability "${cap.name}" added to passport in UNVERIFIED state awaiting verification review.`,
      capability_id: cap.id,
      name: cap.name,
      verification_status: VerificationStatus.UNVERIFIED,
    };
  }

  /**
   * CRITICAL MUTATION RULE:
   * Edits/updates a capability claim. If it was previously VERIFIED,
   * verification CANNOT survive modification and must be downgraded:
   * - VERIFIED -> PENDING_VERIFICATION if valid supporting evidence remains.
   * - VERIFIED -> UNVERIFIED if no supporting evidence remains.
   */
  async updateCapability(
    orgId: string,
    userId: string,
    capabilityId: string,
    dto: {
      notes?: string;
      evidence_summary?: string;
      department_id?: string;
      laboratory_id?: string;
      support_type_id?: string;
    },
  ) {
    await this.assertOrgAccess(orgId, userId);

    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['institutionProfile', 'industryProfile'],
    });
    if (!org) {
      throw new NotFoundException(`Organization "${orgId}" not found.`);
    }

    let affectedClaim: any = null;
    let isHei = org.organization_type === OrganizationType.INSTITUTION;

    if (isHei && org.institutionProfile) {
      affectedClaim = await this.instCapRepo.findOne({
        where: { institution_id: org.institutionProfile.id, capability_id: capabilityId },
      });
      if (affectedClaim) {
        if (dto.department_id !== undefined) affectedClaim.department_id = dto.department_id;
        if (dto.laboratory_id !== undefined) affectedClaim.laboratory_id = dto.laboratory_id;
        if (dto.evidence_summary !== undefined) affectedClaim.evidence_summary = dto.evidence_summary;

        // Mutation Rule Invariant: Downgrade verification if previously VERIFIED
        if (affectedClaim.verification_status === VerificationStatus.VERIFIED) {
          const evidenceCount = await this.evidenceRepo.count({
            where: { institution_capability_id: affectedClaim.id },
          });
          if (evidenceCount > 0) {
            affectedClaim.verification_status = VerificationStatus.PENDING_VERIFICATION;
            affectedClaim.confidence_score = 0.70;
          } else {
            affectedClaim.verification_status = VerificationStatus.UNVERIFIED;
            affectedClaim.confidence_score = 0.50;
          }
        }
        await this.instCapRepo.save(affectedClaim);
      }
    } else if (org.industryProfile) {
      affectedClaim = await this.indCapRepo.findOne({
        where: { industry_id: org.industryProfile.id, capability_id: capabilityId },
      });
      if (affectedClaim) {
        if (dto.support_type_id !== undefined) affectedClaim.support_type_id = dto.support_type_id;
        if (dto.notes !== undefined) affectedClaim.notes = dto.notes;

        // Mutation Rule Invariant: Downgrade verification if previously VERIFIED
        if (affectedClaim.verification_status === VerificationStatus.VERIFIED) {
          const evidenceCount = await this.evidenceRepo.count({
            where: { industry_capability_id: affectedClaim.id },
          });
          if (evidenceCount > 0) {
            affectedClaim.verification_status = VerificationStatus.PENDING_VERIFICATION;
            affectedClaim.confidence_score = 0.70;
          } else {
            affectedClaim.verification_status = VerificationStatus.UNVERIFIED;
            affectedClaim.confidence_score = 0.50;
          }
        }
        await this.indCapRepo.save(affectedClaim);
      }
    }

    if (!affectedClaim) {
      throw new NotFoundException(`Capability claim "${capabilityId}" not found on organization passport.`);
    }

    this.eventEmitter.emit('organization.capabilities_updated', { organizationId: org.id });

    return {
      message: 'Capability claim updated. Verification status updated in accordance with governance invariants.',
      capability: affectedClaim,
    };
  }

  /**
   * Detaches a capability from the organization passport.
   */
  async removeCapability(orgId: string, userId: string, capabilityId: string) {
    await this.assertOrgAccess(orgId, userId);

    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['institutionProfile', 'industryProfile'],
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    if (org.organization_type === OrganizationType.INSTITUTION && org.institutionProfile) {
      await this.instCapRepo.delete({
        institution_id: org.institutionProfile.id,
        capability_id: capabilityId,
      });
    } else if (org.industryProfile) {
      await this.indCapRepo.delete({
        industry_id: org.industryProfile.id,
        capability_id: capabilityId,
      });
    }

    this.eventEmitter.emit('organization.capabilities_updated', { organizationId: org.id });

    return { message: 'Capability removed from passport successfully.' };
  }

  /**
   * Uploads documentary evidence to the organization passport.
   * Evidence enters PENDING_VERIFICATION and transitions linked capability claims to PENDING_VERIFICATION (0.70 confidence).
   */
  async addEvidence(orgId: string, userId: string, dto: CreateOrganizationEvidenceDto) {
    await this.assertOrgAccess(orgId, userId);

    const org = await this.orgRepo.findOne({
      where: { id: orgId },
      relations: ['institutionProfile', 'industryProfile'],
    });
    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    let linkedInstCapId: string | null = dto.institution_capability_id || null;
    let linkedIndCapId: string | null = dto.industry_capability_id || null;
    let linkedCapId: string | null = dto.capability_id || null;

    // Graceful backward compatibility: if capability_id was passed, check if it maps to an InstitutionCapability or IndustryCapability
    if (!linkedInstCapId && !linkedIndCapId && linkedCapId) {
      if (org.institutionProfile) {
        const matchingInstCap = await this.instCapRepo.findOne({
          where: [
            { id: linkedCapId, institution_id: org.institutionProfile.id },
            { capability_id: linkedCapId, institution_id: org.institutionProfile.id },
          ],
        });
        if (matchingInstCap) {
          linkedInstCapId = matchingInstCap.id;
          linkedCapId = matchingInstCap.capability_id;
        }
      } else if (org.industryProfile) {
        const matchingIndCap = await this.indCapRepo.findOne({
          where: [
            { id: linkedCapId, industry_id: org.industryProfile.id },
            { capability_id: linkedCapId, industry_id: org.industryProfile.id },
          ],
        });
        if (matchingIndCap) {
          linkedIndCapId = matchingIndCap.id;
          linkedCapId = matchingIndCap.capability_id;
        }
      }
    }

    // Verify and update linked HEI capability claim if present
    if (linkedInstCapId && org.institutionProfile) {
      const instCap = await this.instCapRepo.findOne({
        where: { id: linkedInstCapId, institution_id: org.institutionProfile.id },
      });
      if (instCap) {
        linkedCapId = instCap.capability_id;
        // Transition capability to PENDING_VERIFICATION with 0.70 confidence if not already VERIFIED
        if (instCap.verification_status !== VerificationStatus.VERIFIED) {
          instCap.verification_status = VerificationStatus.PENDING_VERIFICATION;
          instCap.confidence_score = 0.70;
        }
        if (!instCap.evidence_summary) {
          instCap.evidence_summary = dto.title.trim();
        }
        await this.instCapRepo.save(instCap);
      } else {
        linkedInstCapId = null;
      }
    }

    // Verify and update linked Industry capability claim if present
    if (linkedIndCapId && org.industryProfile) {
      const indCap = await this.indCapRepo.findOne({
        where: { id: linkedIndCapId, industry_id: org.industryProfile.id },
      });
      if (indCap) {
        linkedCapId = indCap.capability_id;
        if (indCap.verification_status !== VerificationStatus.VERIFIED) {
          indCap.verification_status = VerificationStatus.PENDING_VERIFICATION;
          indCap.confidence_score = 0.70;
        }
        await this.indCapRepo.save(indCap);
      } else {
        linkedIndCapId = null;
      }
    }

    const evidence = this.evidenceRepo.create({
      organization_id: org.id,
      uploaded_by: userId,
      title: dto.title.trim(),
      description: dto.description?.trim() || null,
      url: dto.url.trim(),
      evidence_type: dto.evidence_type,
      mime_type: dto.mime_type || null,
      institution_capability_id: linkedInstCapId,
      industry_capability_id: linkedIndCapId,
      capability_id: linkedCapId,
      is_public: dto.is_public ?? false,
      verification_status: VerificationStatus.PENDING_VERIFICATION,
    });

    const saved = await this.evidenceRepo.save(evidence);

    this.eventEmitter.emit('organization.capabilities_updated', { organizationId: org.id });

    return {
      message: 'Evidence uploaded successfully and submitted for verification.',
      evidence: saved,
    };
  }

  /**
   * Lists all evidence for an organization.
   */
  async getEvidence(orgId: string) {
    return this.evidenceRepo.find({
      where: { organization_id: orgId },
      relations: ['capability', 'institutionCapability', 'industryCapability', 'uploader'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * CRITICAL EVIDENCE DELETION INVARIANT:
   * Deleting evidence re-evaluates dependent capability verification.
   * If the capability was verified on the basis of this evidence:
   * - Downgrades to PENDING_VERIFICATION if other evidence remains.
   * - Downgrades to UNVERIFIED if no supporting evidence remains.
   * Verification NEVER silently survives deletion of its proof!
   */
  async deleteEvidence(orgId: string, userId: string, evidenceId: string) {
    await this.assertOrgAccess(orgId, userId);

    const evidence = await this.evidenceRepo.findOne({
      where: { id: evidenceId, organization_id: orgId },
    });

    if (!evidence) {
      throw new NotFoundException('Evidence not found.');
    }

    const linkedInstCapId = evidence.institution_capability_id;
    const linkedIndCapId = evidence.industry_capability_id;

    // Delete evidence record
    await this.evidenceRepo.delete(evidence.id);

    // Re-evaluate dependent HEI capability verification
    if (linkedInstCapId) {
      const instCap = await this.instCapRepo.findOne({ where: { id: linkedInstCapId } });
      if (instCap) {
        const remainingEvidence = await this.evidenceRepo.find({
          where: { institution_capability_id: linkedInstCapId },
        });
        const hasVerifiedRemaining = remainingEvidence.some((e) => e.verification_status === VerificationStatus.VERIFIED);
        const hasAnyRemaining = remainingEvidence.length > 0;

        if (hasVerifiedRemaining) {
          instCap.verification_status = VerificationStatus.VERIFIED;
          instCap.confidence_score = 0.90;
        } else if (hasAnyRemaining) {
          instCap.verification_status = VerificationStatus.PENDING_VERIFICATION;
          instCap.confidence_score = 0.70;
        } else {
          instCap.verification_status = VerificationStatus.UNVERIFIED;
          instCap.confidence_score = 0.50;
        }
        await this.instCapRepo.save(instCap);
      }
    }

    // Re-evaluate dependent Industry capability verification
    if (linkedIndCapId) {
      const indCap = await this.indCapRepo.findOne({ where: { id: linkedIndCapId } });
      if (indCap) {
        const remainingEvidence = await this.evidenceRepo.find({
          where: { industry_capability_id: linkedIndCapId },
        });
        const hasVerifiedRemaining = remainingEvidence.some((e) => e.verification_status === VerificationStatus.VERIFIED);
        const hasAnyRemaining = remainingEvidence.length > 0;

        if (hasVerifiedRemaining) {
          indCap.verification_status = VerificationStatus.VERIFIED;
          indCap.confidence_score = 0.90;
        } else if (hasAnyRemaining) {
          indCap.verification_status = VerificationStatus.PENDING_VERIFICATION;
          indCap.confidence_score = 0.70;
        } else {
          indCap.verification_status = VerificationStatus.UNVERIFIED;
          indCap.confidence_score = 0.50;
        }
        await this.indCapRepo.save(indCap);
      }
    }

    this.eventEmitter.emit('organization.capabilities_updated', { organizationId: orgId });

    return { message: 'Evidence deleted successfully and dependent claim verification re-evaluated.' };
  }
}

