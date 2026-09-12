import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Capability } from './entities/capability.entity';
import { TaxonomyAdditionRequest } from './entities/taxonomy-addition-request.entity';
import { Organization } from '../organizations/entities/organization.entity';
import { TaxonomyRequestsService } from './services/taxonomy-requests.service';
import { TaxonomyRequestsController } from './controllers/taxonomy-requests.controller';
import { AdminTaxonomyRequestsController } from './controllers/admin-taxonomy-requests.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Capability,
      TaxonomyAdditionRequest,
      Organization,
    ]),
  ],
  controllers: [
    TaxonomyRequestsController,
    AdminTaxonomyRequestsController,
  ],
  providers: [TaxonomyRequestsService],
  exports: [TaxonomyRequestsService, TypeOrmModule],
})
export class CapabilitiesModule {}
