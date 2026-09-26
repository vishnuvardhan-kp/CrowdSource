import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IndustryProfile } from './entities/industry-profile.entity';
import { IndustrySector } from './entities/industry-sector.entity';
import { IndustrySupportType } from './entities/industry-support-type.entity';
import { IndustryCapability } from './entities/industry-capability.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IndustryProfile,
      IndustrySector,
      IndustrySupportType,
      IndustryCapability,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class IndustriesModule {}
