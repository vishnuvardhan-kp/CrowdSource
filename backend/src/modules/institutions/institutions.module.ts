import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InstitutionProfile } from './entities/institution-profile.entity';
import { Department } from './entities/department.entity';
import { FacultyMember } from './entities/faculty-member.entity';
import { ResearchArea } from './entities/research-area.entity';
import { Laboratory } from './entities/laboratory.entity';
import { Facility } from './entities/facility.entity';
import { InstitutionCapability } from './entities/institution-capability.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      InstitutionProfile,
      Department,
      FacultyMember,
      ResearchArea,
      Laboratory,
      Facility,
      InstitutionCapability,
    ]),
  ],
  exports: [TypeOrmModule],
})
export class InstitutionsModule {}
