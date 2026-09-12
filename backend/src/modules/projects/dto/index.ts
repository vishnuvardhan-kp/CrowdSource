import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  MilestoneStatus,
  TaskStatus,
  DeliverableDocumentType,
  ProjectUpdateType,
} from '../../../common/enums';

// -------------------------------------------------------------
// Milestones
// -------------------------------------------------------------

export class CreateMilestoneDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsNumber()
  @IsOptional()
  order_index?: number;
}

export class UpdateMilestoneDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsNumber()
  @IsOptional()
  order_index?: number;

  @IsEnum(MilestoneStatus)
  @IsOptional()
  status?: MilestoneStatus;
}

export class MilestoneReviewDto {
  @IsString()
  @IsNotEmpty()
  decision: 'APPROVE' | 'REQUEST_REVISION';

  @IsString()
  @IsOptional()
  comments?: string;

  @IsOptional()
  feedback?: Record<string, any>;
}

// -------------------------------------------------------------
// Kickoff
// -------------------------------------------------------------

export class ProjectKickoffDto {
  @IsString()
  @IsOptional()
  objectives?: string;

  @IsString()
  @IsOptional()
  expected_outcomes?: string;

  @IsDateString()
  @IsOptional()
  start_date?: string;

  @IsDateString()
  @IsOptional()
  target_completion_date?: string;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMilestoneDto)
  initial_milestones?: CreateMilestoneDto[];
}

export class KickoffReviewDto {
  @IsString()
  @IsNotEmpty()
  decision: 'APPROVE' | 'REQUEST_REVISION';

  @IsString()
  @IsOptional()
  comments?: string;

  @IsOptional()
  feedback?: Record<string, any>;
}

// -------------------------------------------------------------
// Tasks
// -------------------------------------------------------------

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  milestone_id: string;

  @IsString()
  @IsOptional()
  assigned_participant_id?: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;
}

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  assigned_participant_id?: string;
}

// -------------------------------------------------------------
// Deliverables
// -------------------------------------------------------------

export class CreateDeliverableDto {
  @IsString()
  @IsOptional()
  milestone_id?: string;

  @IsEnum(DeliverableDocumentType)
  @IsOptional()
  document_type?: DeliverableDocumentType;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  storage_key?: string;

  @IsString()
  @IsOptional()
  file_name?: string;

  @IsString()
  @IsOptional()
  mime_type?: string;

  @IsNumber()
  @IsOptional()
  file_size?: number;

  @IsOptional()
  metadata?: Record<string, any>;
}

// -------------------------------------------------------------
// Updates & Blockers
// -------------------------------------------------------------

export class CreateProjectUpdateDto {
  @IsEnum(ProjectUpdateType)
  update_type: ProjectUpdateType;

  @IsString()
  @IsNotEmpty()
  summary: string;

  @IsString()
  @IsOptional()
  details?: string;

  @IsString()
  @IsOptional()
  blocker_status?: string;
}

// -------------------------------------------------------------
// Reviews & Governance
// -------------------------------------------------------------

export class ProjectTerminationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsString()
  @IsOptional()
  comments?: string;
}

export class BlockerReviewDto {
  @IsString()
  @IsNotEmpty()
  decision: 'ACKNOWLEDGE' | 'RESOLVE';

  @IsString()
  @IsOptional()
  comments?: string;
}

export class ProjectCompletionDto {
  @IsString()
  @IsOptional()
  comments?: string;

  @IsOptional()
  feedback?: Record<string, any>;
}

export class ImpactVerificationDto {
  @IsString()
  @IsOptional()
  comments?: string;

  @IsOptional()
  feedback?: Record<string, any>;
}

export * from './academic-member.dto';
export * from './project-contribution.dto';
export * from './innovation-outcome.dto';