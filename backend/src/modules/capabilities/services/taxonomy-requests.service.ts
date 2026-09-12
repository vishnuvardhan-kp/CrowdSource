import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaxonomyAdditionRequest } from '../entities/taxonomy-addition-request.entity';
import { Capability } from '../entities/capability.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { ReviewStatus } from '../../../common/enums';
import {
  CreateTaxonomyRequestDto,
  ReviewTaxonomyRequestDto,
} from '../dto/create-taxonomy-request.dto';

@Injectable()
export class TaxonomyRequestsService {
  constructor(
    @InjectRepository(TaxonomyAdditionRequest)
    private readonly requestRepo: Repository<TaxonomyAdditionRequest>,
    @InjectRepository(Capability)
    private readonly capRepo: Repository<Capability>,
    @InjectRepository(Organization)
    private readonly orgRepo: Repository<Organization>,
  ) {}

  /**
   * Organization representative submits a proposal for a missing capability.
   * Status starts as PENDING. It does NOT enter master taxonomy and does NOT participate in matching.
   */
  async createRequest(
    orgId: string,
    userId: string,
    dto: CreateTaxonomyRequestDto,
  ): Promise<TaxonomyAdditionRequest> {
    const org = await this.orgRepo.findOne({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundException(`Organization with ID "${orgId}" not found.`);
    }

    const cleanName = dto.proposed_name.trim();

    // Check if capability already exists in master taxonomy
    const existingCap = await this.capRepo.findOne({
      where: { name: cleanName },
    });
    if (existingCap) {
      throw new ConflictException(
        `Capability "${cleanName}" already exists in the master taxonomy (ID: ${existingCap.id}). You can select it directly.`,
      );
    }

    const request = this.requestRepo.create({
      organization_id: org.id,
      submitted_by: userId,
      proposed_name: cleanName,
      proposed_category: dto.proposed_category?.trim() || 'General',
      reason: dto.reason.trim(),
      status: ReviewStatus.PENDING,
    });

    return this.requestRepo.save(request);
  }

  /**
   * Lists taxonomy requests submitted by a specific organization.
   */
  async getOrgRequests(orgId: string): Promise<TaxonomyAdditionRequest[]> {
    return this.requestRepo.find({
      where: { organization_id: orgId },
      relations: ['submitter', 'reviewer'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Admin queue of all pending taxonomy addition requests.
   */
  async getAdminQueue(): Promise<TaxonomyAdditionRequest[]> {
    return this.requestRepo.find({
      relations: ['organization', 'submitter'],
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Admin approves a proposal:
   * 1. Inserts the capability into the Master Capability Taxonomy table.
   * 2. Updates request status to APPROVED.
   */
  async approveRequest(
    requestId: string,
    adminUserId: string,
    dto: ReviewTaxonomyRequestDto,
  ) {
    const request = await this.requestRepo.findOne({
      where: { id: requestId },
      relations: ['organization'],
    });

    if (!request) {
      throw new NotFoundException(`Taxonomy request "${requestId}" not found.`);
    }

    if (request.status !== ReviewStatus.PENDING) {
      throw new BadRequestException(`Taxonomy request is already ${request.status}.`);
    }

    // Generate unique slug
    const baseSlug = request.proposed_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
    let slug = baseSlug;
    const existingSlug = await this.capRepo.findOne({ where: { slug } });
    if (existingSlug) {
      slug = `${baseSlug}-${Date.now().toString().slice(-4)}`;
    }

    // 1. Create in Master Taxonomy
    const newCap = await this.capRepo.save(
      this.capRepo.create({
        name: request.proposed_name,
        slug,
        category: request.proposed_category || 'General',
        description: `Added via taxonomy request for organization ${request.organization?.name || ''}. Reason: ${request.reason}`,
      }),
    );

    // 2. Update request status to APPROVED
    request.status = ReviewStatus.APPROVED;
    request.reviewed_by = adminUserId;
    request.reviewed_at = new Date();
    request.admin_notes = dto.admin_notes || 'Approved into master taxonomy.';

    const updatedRequest = await this.requestRepo.save(request);

    return {
      message: `Taxonomy addition request approved. Capability "${newCap.name}" is now part of the master taxonomy.`,
      request: updatedRequest,
      created_capability: newCap,
    };
  }

  /**
   * Admin rejects a proposal with mandatory audit notes.
   */
  async rejectRequest(
    requestId: string,
    adminUserId: string,
    dto: ReviewTaxonomyRequestDto,
  ) {
    const request = await this.requestRepo.findOne({ where: { id: requestId } });
    if (!request) {
      throw new NotFoundException(`Taxonomy request "${requestId}" not found.`);
    }

    if (request.status !== ReviewStatus.PENDING) {
      throw new BadRequestException(`Taxonomy request is already ${request.status}.`);
    }

    request.status = ReviewStatus.REJECTED;
    request.reviewed_by = adminUserId;
    request.reviewed_at = new Date();
    request.admin_notes = dto.admin_notes || 'Proposed capability does not meet platform master taxonomy standards.';

    const updatedRequest = await this.requestRepo.save(request);

    return {
      message: 'Taxonomy addition request rejected.',
      request: updatedRequest,
    };
  }
}
