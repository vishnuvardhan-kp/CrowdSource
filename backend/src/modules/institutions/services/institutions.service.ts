import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '../entities/institution.entity';
import { District } from '../../locations/entities/district.entity';
import { Block } from '../../locations/entities/block.entity';
import { SearchInstitutionsDto } from '../dto/search-institutions.dto';
import { LgdDataProvider, LgdValidationResult } from '../providers/lgd-data.provider';

@Injectable()
export class InstitutionsService {
  private readonly logger = new Logger(InstitutionsService.name);

  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepo: Repository<Institution>,
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
    private readonly lgdDataProvider: LgdDataProvider,
  ) {}

  /**
   * Search institutions with cascading administrative filters and text search.
   */
  async search(dto: SearchInstitutionsDto): Promise<{ items: Institution[]; total: number }> {
    const qb = this.institutionRepo
      .createQueryBuilder('inst')
      .leftJoinAndSelect('inst.district', 'district')
      .leftJoinAndSelect('inst.block', 'block')
      .leftJoinAndSelect('inst.parent_institution', 'parent')
      .orderBy('inst.name', 'ASC');

    if (dto.type) {
      qb.andWhere('inst.type = :type', { type: dto.type });
    }
    if (dto.subtype) {
      qb.andWhere('inst.subtype = :subtype', { subtype: dto.subtype });
    }
    if (dto.state) {
      qb.andWhere('LOWER(inst.state) = LOWER(:state)', { state: dto.state });
    }
    if (dto.district_id) {
      qb.andWhere('inst.district_id = :districtId', { districtId: dto.district_id });
    }
    if (dto.block_id) {
      qb.andWhere('inst.block_id = :blockId', { blockId: dto.block_id });
    }
    if (dto.lgd_code) {
      qb.andWhere('inst.lgd_code = :lgdCode', { lgdCode: dto.lgd_code.trim() });
    }
    if (dto.search) {
      const term = `%${dto.search.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(inst.name) LIKE :term OR LOWER(COALESCE(inst.name_local, \'\')) LIKE :term OR LOWER(inst.lgd_code) LIKE :term OR LOWER(COALESCE(inst.district_name, \'\')) LIKE :term OR LOWER(COALESCE(inst.block_name, \'\')) LIKE :term)',
        { term },
      );
    }

    const limit = Math.min(dto.limit || 50, 100);
    const offset = dto.offset || 0;

    qb.take(limit).skip(offset);

    const [items, total] = await qb.getManyAndCount();
    return { items, total };
  }

  /**
   * Authoritative lookup by unique internal UUID.
   */
  async findById(id: string): Promise<Institution> {
    const institution = await this.institutionRepo.findOne({
      where: { id },
      relations: ['district', 'block', 'parent_institution'],
    });

    if (!institution) {
      throw new NotFoundException(`Institution with ID "${id}" not found.`);
    }

    return institution;
  }

  /**
   * Authoritative lookup by unique canonical LGD code.
   */
  async findByLgdCode(lgdCode: string): Promise<Institution | null> {
    return this.institutionRepo.findOne({
      where: { lgd_code: lgdCode.trim() },
      relations: ['district', 'block', 'parent_institution'],
    });
  }

  /**
   * Verifies LGD code against authoritative directory provider.
   * NOTE: This validates the INSTITUTION exists, NOT the user's authority!
   */
  async verifyLgdCode(lgdCode: string): Promise<LgdValidationResult> {
    return this.lgdDataProvider.verifyLgdCode(lgdCode);
  }

  /**
   * Returns cascading administrative hierarchy for frontend selection filters.
   */
  async getHierarchy(districtId?: string): Promise<any> {
    if (!districtId) {
      // Return all districts with institution count summaries
      const districts = await this.districtRepo.find({ order: { name: 'ASC' } });
      const counts = await this.institutionRepo
        .createQueryBuilder('inst')
        .select('inst.district_id', 'district_id')
        .addSelect('inst.type', 'type')
        .addSelect('COUNT(*)', 'count')
        .groupBy('inst.district_id')
        .addGroupBy('inst.type')
        .getRawMany();

      return districts.map((d) => {
        const districtCounts = counts.filter((c) => c.district_id === d.id);
        const priCount = districtCounts.find((c) => c.type === 'PRI')?.count || '0';
        const ulbCount = districtCounts.find((c) => c.type === 'ULB')?.count || '0';
        return {
          id: d.id,
          name: d.name,
          code: d.code,
          state: d.state,
          pri_count: parseInt(priCount, 10),
          ulb_count: parseInt(ulbCount, 10),
        };
      });
    }

    // If district provided, return blocks and institutions within it
    const blocks = await this.blockRepo.find({
      where: { district_id: districtId },
      order: { name: 'ASC' },
    });

    const institutions = await this.institutionRepo.find({
      where: { district_id: districtId },
      order: { subtype: 'ASC', name: 'ASC' },
    });

    return {
      district_id: districtId,
      blocks: blocks.map((b) => ({
        id: b.id,
        name: b.name,
        code: b.code,
      })),
      institutions: institutions.map((inst) => ({
        id: inst.id,
        name: inst.name,
        type: inst.type,
        subtype: inst.subtype,
        lgd_code: inst.lgd_code,
        block_id: inst.block_id,
        block_name: inst.block_name,
        hierarchy_level: inst.hierarchy_level,
      })),
    };
  }
}
