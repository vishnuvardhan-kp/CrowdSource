import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { District } from './entities/district.entity';
import { Block } from './entities/block.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
    @InjectRepository(Block)
    private readonly blockRepo: Repository<Block>,
  ) {}

  async getDistricts(): Promise<District[]> {
    return this.districtRepo.find({
      order: { name: 'ASC' },
    });
  }

  async getBlocksByDistrict(districtId: string): Promise<Block[]> {
    return this.blockRepo.find({
      where: { district_id: districtId },
      order: { name: 'ASC' },
    });
  }

  async getDistrictById(districtId: string): Promise<District | null> {
    return this.districtRepo.findOne({ where: { id: districtId } });
  }

  async getBlockById(blockId: string): Promise<Block | null> {
    return this.blockRepo.findOne({
      where: { id: blockId },
      relations: ['district'],
    });
  }
}
