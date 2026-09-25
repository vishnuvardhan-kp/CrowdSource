import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Institution } from '../entities/institution.entity';

export interface LgdValidationResult {
  valid: boolean;
  institution?: Institution;
  lgd_code: string;
  source: 'LOCAL_LGD_REGISTRY' | 'EXTERNAL_GOVERNMENT_DIRECTORY';
  details?: {
    name: string;
    name_local?: string | null;
    type: string;
    subtype: string;
    state: string;
    district?: string | null;
    block?: string | null;
    hierarchy_level: string;
    parent_lgd_code?: string | null;
    is_authoritative?: boolean;
    lgd_version?: string;
  };
}

export interface InstitutionDirectoryProvider {
  verifyLgdCode(lgdCode: string): Promise<LgdValidationResult>;
}

@Injectable()
export class LgdDataProvider implements InstitutionDirectoryProvider {
  private readonly logger = new Logger(LgdDataProvider.name);

  constructor(
    @InjectRepository(Institution)
    private readonly institutionRepo: Repository<Institution>,
  ) {}

  /**
   * Verifies whether an institution exists in the authoritative LGD registry by canonical LGD code.
   * NOTE: LGD verification solely confirms the existence and administrative jurisdiction
   * of the local body. It does NOT verify the authorization or identity of any user.
   */
  async verifyLgdCode(lgdCode: string): Promise<LgdValidationResult> {
    const trimmedCode = lgdCode?.trim();
    if (!trimmedCode) {
      return {
        valid: false,
        lgd_code: lgdCode,
        source: 'LOCAL_LGD_REGISTRY',
      };
    }

    const institution = await this.institutionRepo.findOne({
      where: { lgd_code: trimmedCode },
      relations: ['district', 'block', 'parent_institution'],
    });

    if (!institution) {
      return {
        valid: false,
        lgd_code: trimmedCode,
        source: 'LOCAL_LGD_REGISTRY',
      };
    }

    return {
      valid: true,
      institution,
      lgd_code: trimmedCode,
      source: 'LOCAL_LGD_REGISTRY',
      details: {
        name: institution.name,
        name_local: institution.name_local,
        type: institution.type,
        subtype: institution.subtype,
        state: institution.state,
        district: institution.district_name || institution.district?.name,
        block: institution.block_name || institution.block?.name,
        hierarchy_level: institution.hierarchy_level,
        parent_lgd_code: institution.parent_lgd_code,
        is_authoritative: institution.is_authoritative_lgd,
        lgd_version: institution.lgd_version,
      },
    };
  }
}
