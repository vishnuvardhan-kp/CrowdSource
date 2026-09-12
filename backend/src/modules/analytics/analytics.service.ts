import {
  Injectable,
  Logger,
  UnauthorizedException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Challenge } from '../challenges/entities/challenge.entity';
import { District } from '../locations/entities/district.entity';
import { UserRole } from '../../common/enums';

export interface AnalyticsFilters {
  district?: string;
  district_id?: string;
  domain?: string;
  priority?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const METRIC_DEFINITIONS = [
  {
    metric_name: 'Total Problems',
    key: 'totalChallenges',
    tables: ['challenges'],
    filtering_condition: "status != 'DRAFT'",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT c.id)',
  },
  {
    metric_name: 'New Problems (Last 7 Days)',
    key: 'newChallenges',
    tables: ['challenges'],
    filtering_condition: "status != 'DRAFT' AND submitted_at >= NOW() - INTERVAL '7 days'",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT c.id)',
  },
  {
    metric_name: 'High Priority Problems',
    key: 'highPriorityChallenges',
    tables: ['challenges'],
    filtering_condition: "status != 'DRAFT' AND priority IN ('HIGH', 'CRITICAL')",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT c.id)',
  },
  {
    metric_name: 'Pending Government Review',
    key: 'pendingReview',
    tables: ['challenges'],
    filtering_condition: "status IN ('SUBMITTED', 'UNDER_REVIEW')",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT c.id)',
  },
  {
    metric_name: 'Verified Problems',
    key: 'verifiedChallenges',
    tables: ['challenges'],
    filtering_condition: "status IN ('VALIDATED', 'MATCHING', 'MATCHED', 'IN_PROGRESS', 'PROJECT_INITIATED', 'COMPLETED', 'CLOSED')",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT c.id)',
  },
  {
    metric_name: 'Problems with Institutional Interest',
    key: 'problemsWithInstitutionalInterest',
    tables: ['challenges', 'expression_of_interests'],
    filtering_condition: "c.status != 'DRAFT' AND c.id IN (SELECT challenge_id FROM expression_of_interests WHERE status != 'DRAFT')",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT c.id)',
  },
  {
    metric_name: 'Active Solution Pilots',
    key: 'activePilotEngagements',
    tables: ['projects', 'challenges'],
    filtering_condition: "p.status IN ('ACTIVE', 'INITIATED', 'KICKOFF_PENDING')",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT p.id)',
  },
  {
    metric_name: 'Resolved / Closed Problems',
    key: 'resolvedClosedProblems',
    tables: ['challenges', 'projects'],
    filtering_condition: "c.status IN ('COMPLETED', 'CLOSED') OR c.id IN (SELECT challenge_id FROM projects WHERE status IN ('COMPLETED', 'IMPACT_VERIFIED'))",
    jurisdiction_condition: 'c.district_id = user.district_id (District Officer) or statewide (State Admin)',
    calculation: 'COUNT(DISTINCT c.id)',
  },
];

export const PIPELINE_STAGE_DEFINITIONS = [
  {
    stage: 'Reported',
    tables: ['challenges'],
    filtering_condition: "status != 'DRAFT'",
    calculation: 'COUNT(DISTINCT c.id)',
    description: 'Total societal problems submitted by citizens into the system intake queue.',
  },
  {
    stage: 'AI Structured',
    tables: ['challenges'],
    filtering_condition: "status != 'DRAFT' AND (cluster_id IS NOT NULL OR clustering_status = 'CLUSTERED' OR category IS NOT NULL)",
    calculation: 'COUNT(DISTINCT c.id)',
    description: 'Problems classified by domain, assigned severity, or structured into semantic clusters.',
  },
  {
    stage: 'Government Validated',
    tables: ['challenges'],
    filtering_condition: "status IN ('VALIDATED', 'MATCHING', 'MATCHED', 'IN_PROGRESS', 'PROJECT_INITIATED', 'COMPLETED', 'CLOSED')",
    calculation: 'COUNT(DISTINCT c.id)',
    description: 'Problems formally approved by an authorized district or state government reviewer.',
  },
  {
    stage: 'Matched',
    tables: ['challenges', 'recommendation_reviews'],
    filtering_condition: 'c.id IN (SELECT challenge_id FROM recommendation_reviews)',
    calculation: 'COUNT(DISTINCT c.id)',
    description: 'Validated problems with AI-generated institutional capability matches.',
  },
  {
    stage: 'Institution Interested',
    tables: ['challenges', 'expression_of_interests'],
    filtering_condition: "c.id IN (SELECT challenge_id FROM expression_of_interests WHERE status IN ('UNDER_REVIEW', 'DISCUSSION_REQUIRED', 'ACCEPTED', 'PROJECT_FORMED'))",
    calculation: 'COUNT(DISTINCT c.id)',
    description: 'Problems where matched institutions expressed active intent and advanced beyond passive recommendation.',
  },
  {
    stage: 'EOI Submitted',
    tables: ['expression_of_interests', 'challenges'],
    filtering_condition: "eoi.status != 'DRAFT'",
    calculation: 'COUNT(DISTINCT eoi.id)',
    description: 'Formal Expressions of Interest submitted by educational institutions or industry partners.',
  },
  {
    stage: 'Pilot',
    tables: ['projects', 'challenges'],
    filtering_condition: "p.status IN ('ACTIVE', 'INITIATED', 'KICKOFF_PENDING', 'PILOT_DEPLOYMENT', 'IN_DEVELOPMENT')",
    calculation: 'COUNT(DISTINCT p.id)',
    description: 'Authorized multi-stakeholder collaborative pilots deployed in the field.',
  },
  {
    stage: 'Resolved',
    tables: ['projects', 'challenges'],
    filtering_condition: "p.status IN ('COMPLETED', 'IMPACT_VERIFIED') OR c.status IN ('COMPLETED', 'CLOSED')",
    calculation: 'COUNT(DISTINCT c.id)',
    description: 'Problems where pilots concluded with verified civic impact and official sign-off.',
  },
];

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional()
    @InjectRepository(User)
    private readonly userRepo?: Repository<User>,
    @Optional()
    @InjectRepository(District)
    private readonly districtRepo?: Repository<District>,
    @Optional()
    @InjectRepository(Challenge)
    private readonly challengeRepo?: Repository<Challenge>,
  ) {}

  /**
   * Resolves the authoritative jurisdiction scope for the requesting user.
   * STRICT ENFORCEMENT:
   * - District Officers are locked to user.district_id. Query params cannot override this.
   * - State Admins default to statewide, with authorized district filtering.
   * - Platform Admins have universal platform access.
   */
  async resolveJurisdictionScope(
    user?: any,
    filters?: AnalyticsFilters,
  ): Promise<{
    effectiveDistrictId: string | null;
    districtName: string | null;
    scope: string;
    role: string;
    isDistrictOfficer: boolean;
  }> {
    const effectiveUser = user || { role: UserRole.PLATFORM_ADMIN };
    const authUser = (effectiveUser?.id && this.userRepo)
      ? await this.userRepo.findOne({ where: { id: effectiveUser.id }, relations: ['districtRef'] })
      : effectiveUser;

    if (!authUser) {
      throw new UnauthorizedException('Authentication required for government analytics.');
    }

    if (authUser.role === UserRole.GOVERNMENT_OFFICER) {
      if (!authUser.district_id) {
        throw new ForbiddenException('Government officer has no assigned district ID. Access denied.');
      }
      return {
        effectiveDistrictId: authUser.district_id,
        districtName: authUser.districtRef?.name || authUser.district || 'Assigned District',
        scope: 'DISTRICT',
        role: authUser.role,
        isDistrictOfficer: true,
      };
    }

    if (authUser.role === UserRole.GOVERNMENT_ADMIN) {
      let filterDistId: string | null = null;
      let filterDistName: string | null = null;

      if (filters?.district_id) {
        filterDistId = filters.district_id;
        if (this.districtRepo) {
          const d = await this.districtRepo.findOne({ where: { id: filterDistId } });
          filterDistName = d?.name || null;
        }
      } else if (filters?.district) {
        if (this.districtRepo) {
          const d = await this.districtRepo
            .createQueryBuilder('d')
            .where('LOWER(d.name) = LOWER(:name)', { name: filters.district.trim() })
            .getOne();
          if (d) {
            filterDistId = d.id;
            filterDistName = d.name;
          } else {
            filterDistName = filters.district;
          }
        } else {
          filterDistName = filters.district;
        }
      }

      return {
        effectiveDistrictId: filterDistId,
        districtName: filterDistName || 'All Districts (Jharkhand State)',
        scope: filterDistId ? 'DISTRICT_FILTERED' : 'STATE',
        role: authUser.role,
        isDistrictOfficer: false,
      };
    }

    if (authUser.role === UserRole.PLATFORM_ADMIN) {
      let filterDistId: string | null = null;
      let filterDistName: string | null = null;

      if (filters?.district_id) {
        filterDistId = filters.district_id;
        if (this.districtRepo) {
          const d = await this.districtRepo.findOne({ where: { id: filterDistId } });
          filterDistName = d?.name || null;
        }
      } else if (filters?.district) {
        if (this.districtRepo) {
          const d = await this.districtRepo
            .createQueryBuilder('d')
            .where('LOWER(d.name) = LOWER(:name)', { name: filters.district.trim() })
            .getOne();
          if (d) {
            filterDistId = d.id;
            filterDistName = d.name;
          }
        }
      }

      return {
        effectiveDistrictId: filterDistId,
        districtName: filterDistName || 'National Scope (Universal)',
        scope: filterDistId ? 'DISTRICT_FILTERED' : 'NATIONAL',
        role: authUser.role,
        isDistrictOfficer: false,
      };
    }

    throw new ForbiddenException('Access denied: Unauthorized role for government intelligence.');
  }

  /**
   * Executive Overview: 8 Verified KPIs + 8-Stage Ecosystem Pipeline Funnel.
   * 100% database-aggregated, traceable metrics with freshness timestamp.
   */
  async getOverview(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const jurisdiction = await this.resolveJurisdictionScope(user, filters);
    const qRunner = this.dataSource.createQueryRunner();

    try {
      const params: any[] = [];
      let whereClause = "c.status != 'DRAFT'";

      if (jurisdiction.effectiveDistrictId) {
        params.push(jurisdiction.effectiveDistrictId);
        whereClause += ` AND c.district_id = $${params.length}`;
      }

      if (filters?.domain) {
        params.push(filters.domain.trim());
        whereClause += ` AND LOWER(c.category) = LOWER($${params.length})`;
      }

      // 1. Executive KPIs query
      const kpiSql = `
        SELECT
          COUNT(DISTINCT c.id)::int as total_challenges,
          COUNT(DISTINCT CASE WHEN c.submitted_at >= NOW() - INTERVAL '7 days' THEN c.id END)::int as new_challenges,
          COUNT(DISTINCT CASE WHEN c.priority IN ('HIGH', 'CRITICAL') THEN c.id END)::int as high_priority_challenges,
          COUNT(DISTINCT CASE WHEN c.status IN ('SUBMITTED', 'UNDER_REVIEW') THEN c.id END)::int as pending_government_review,
          COUNT(DISTINCT CASE WHEN c.status IN ('VALIDATED', 'MATCHING', 'MATCHED', 'IN_PROGRESS', 'PROJECT_INITIATED', 'COMPLETED', 'CLOSED') THEN c.id END)::int as verified_challenges,
          COUNT(DISTINCT CASE WHEN c.id IN (SELECT challenge_id FROM expression_of_interests WHERE status != 'DRAFT') THEN c.id END)::int as problems_with_institutional_interest,
          COUNT(DISTINCT CASE WHEN c.id IN (SELECT challenge_id FROM projects WHERE status IN ('ACTIVE', 'INITIATED', 'KICKOFF_PENDING')) THEN c.id END)::int as active_pilot_engagements,
          COUNT(DISTINCT CASE WHEN c.status IN ('COMPLETED', 'CLOSED') OR c.id IN (SELECT challenge_id FROM projects WHERE status IN ('COMPLETED', 'IMPACT_VERIFIED')) THEN c.id END)::int as resolved_closed_problems
        FROM challenges c
        WHERE ${whereClause}
      `;
      const kpiRes = await qRunner.query(kpiSql, params);
      const kpis = kpiRes[0] || {};

      // 2. Pipeline Funnel query
      const eoiDistCondition = jurisdiction.effectiveDistrictId
        ? `AND sub_c.district_id = '${jurisdiction.effectiveDistrictId}'`
        : '';

      const pipelineSql = `
        SELECT
          COUNT(DISTINCT c.id)::int as reported,
          COUNT(DISTINCT CASE WHEN c.cluster_id IS NOT NULL OR c.clustering_status = 'CLUSTERED' OR c.category IS NOT NULL THEN c.id END)::int as ai_structured,
          COUNT(DISTINCT CASE WHEN c.status IN ('VALIDATED', 'MATCHING', 'MATCHED', 'IN_PROGRESS', 'PROJECT_INITIATED', 'COMPLETED', 'CLOSED') THEN c.id END)::int as government_validated,
          COUNT(DISTINCT CASE WHEN c.id IN (SELECT challenge_id FROM recommendation_reviews) THEN c.id END)::int as matched,
          COUNT(DISTINCT CASE WHEN c.id IN (SELECT challenge_id FROM expression_of_interests WHERE status IN ('UNDER_REVIEW', 'DISCUSSION_REQUIRED', 'ACCEPTED', 'PROJECT_FORMED')) THEN c.id END)::int as institution_interested,
          (
            SELECT COUNT(DISTINCT eoi.id)::int 
            FROM expression_of_interests eoi 
            INNER JOIN challenges sub_c ON sub_c.id = eoi.challenge_id 
            WHERE eoi.status != 'DRAFT'
              ${eoiDistCondition}
          ) as eoi_submitted,
          COUNT(DISTINCT CASE WHEN c.id IN (SELECT challenge_id FROM projects WHERE status IN ('ACTIVE', 'INITIATED', 'KICKOFF_PENDING', 'PILOT_DEPLOYMENT', 'IN_DEVELOPMENT')) THEN c.id END)::int as pilot,
          COUNT(DISTINCT CASE WHEN c.status IN ('COMPLETED', 'CLOSED') OR c.id IN (SELECT challenge_id FROM projects WHERE status IN ('COMPLETED', 'IMPACT_VERIFIED')) THEN c.id END)::int as resolved
        FROM challenges c
        WHERE ${whereClause}
      `;
      const pipelineRes = await qRunner.query(pipelineSql, params);
      const pipe = pipelineRes[0] || {};

      const acadRes = await qRunner.query(`
        SELECT COUNT(*)::int as count FROM project_academic_members WHERE status = 'ACTIVE'
      `);
      const fundingRes = await qRunner.query(`
        SELECT COALESCE(SUM(value), 0)::numeric as total FROM project_contributions WHERE status = 'VERIFIED'
      `);
      const innovRes = await qRunner.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END)::int as verified
        FROM project_innovation_outcomes
      `);
      const clusterRes = await qRunner.query(`
        SELECT 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'VALIDATED' THEN 1 END)::int as validated,
          COALESCE(SUM(report_count), 0)::int as total_clustered_reports
        FROM problem_clusters
      `);

      return {
        executive_kpis: {
          totalChallenges: Number(kpis.total_challenges || 0),
          newChallenges: Number(kpis.new_challenges || 0),
          highPriorityChallenges: Number(kpis.high_priority_challenges || 0),
          pendingGovernmentReview: Number(kpis.pending_government_review || 0),
          verifiedChallenges: Number(kpis.verified_challenges || 0),
          problemsWithInstitutionalInterest: Number(kpis.problems_with_institutional_interest || 0),
          activePilotEngagements: Number(kpis.active_pilot_engagements || 0),
          resolvedClosedProblems: Number(kpis.resolved_closed_problems || 0),
        },
        pipeline: {
          reported: Number(pipe.reported || 0),
          aiStructured: Number(pipe.ai_structured || 0),
          governmentValidated: Number(pipe.government_validated || 0),
          matched: Number(pipe.matched || 0),
          institutionInterested: Number(pipe.institution_interested || 0),
          eoiSubmitted: Number(pipe.eoi_submitted || 0),
          pilot: Number(pipe.pilot || 0),
          resolved: Number(pipe.resolved || 0),
        },
        challenges: {
          total: Number(kpis.total_challenges || 0),
          new: Number(kpis.new_challenges || 0),
          highPriority: Number(kpis.high_priority_challenges || 0),
        },
        projects: {
          total: Number(pipe.pilot || 0),
          active: Number(pipe.pilot || 0),
          resolved: Number(pipe.resolved || 0),
        },
        ecosystem: {
          academicMembers: Number(acadRes[0]?.count || 0),
          organizations: Number(pipe.matched || 0),
        },
        impact: {
          totalFundingMobilized: Number(fundingRes[0]?.total || 0),
        },
        innovation: {
          totalOutcomes: Number(innovRes[0]?.total || 0),
          verifiedOutcomes: Number(innovRes[0]?.verified || 0),
        },
        problemClusters: {
          total: Number(clusterRes[0]?.total || 0),
          validated: Number(clusterRes[0]?.validated || 0),
          totalClusteredReports: Number(clusterRes[0]?.total_clustered_reports || 0),
        },
        metadata: {
          refreshed_at: new Date().toISOString(),
          jurisdiction: {
            role: jurisdiction.role,
            scope: jurisdiction.scope,
            district_id: jurisdiction.effectiveDistrictId,
            district_name: jurisdiction.districtName,
            is_district_officer: jurisdiction.isDistrictOfficer,
          },
          definitions: METRIC_DEFINITIONS,
          pipeline_definitions: PIPELINE_STAGE_DEFINITIONS,
        },
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Challenges Intelligence: Grouped by Domain, Priority, Lifecycle Status, and Time Trend.
   */
  async getChallengesAnalytics(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const jurisdiction = await this.resolveJurisdictionScope(user, filters);
    const qRunner = this.dataSource.createQueryRunner();

    try {
      const params: any[] = [];
      let whereClause = "c.status != 'DRAFT'";

      if (jurisdiction.effectiveDistrictId) {
        params.push(jurisdiction.effectiveDistrictId);
        whereClause += ` AND c.district_id = $${params.length}`;
      }

      // 1. By Domain (Category)
      const byDomain = await qRunner.query(
        `SELECT COALESCE(NULLIF(c.category, ''), 'General') as name, COUNT(*)::int as count 
         FROM challenges c 
         WHERE ${whereClause} 
         GROUP BY name 
         ORDER BY count DESC`,
        params,
      );

      // 2. By Priority
      const byPriority = await qRunner.query(
        `SELECT c.priority as priority, COUNT(*)::int as count 
         FROM challenges c 
         WHERE ${whereClause} 
         GROUP BY c.priority 
         ORDER BY count DESC`,
        params,
      );

      // 3. By Status
      const byStatus = await qRunner.query(
        `SELECT c.status as status, COUNT(*)::int as count 
         FROM challenges c 
         WHERE ${whereClause} 
         GROUP BY c.status 
         ORDER BY count DESC`,
        params,
      );

      // 4. Over Time (Monthly volume)
      const overTime = await qRunner.query(
        `SELECT TO_CHAR(c.submitted_at, 'YYYY-MM') as month, COUNT(*)::int as count 
         FROM challenges c 
         WHERE ${whereClause} AND c.submitted_at IS NOT NULL 
         GROUP BY month 
         ORDER BY month ASC 
         LIMIT 12`,
        params,
      );

      return {
        byDomain,
        byPriority,
        byStatus,
        overTime,
        jurisdiction: {
          role: jurisdiction.role,
          scope: jurisdiction.scope,
          district_name: jurisdiction.districtName,
        },
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * District / Local Intelligence:
   * - State Admin / Platform Admin: 24-district comparative metrics matrix.
   * - District Officer: Block-level distribution within their assigned district only.
   */
  async getDistrictsAnalytics(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const jurisdiction = await this.resolveJurisdictionScope(user, filters);
    const qRunner = this.dataSource.createQueryRunner();

    try {
      if (jurisdiction.isDistrictOfficer) {
        // District Officer: Block-level distribution within assigned district
        const blocksData = await qRunner.query(
          `SELECT
            b.id as block_id,
            b.name as block_name,
            COUNT(c.id)::int as total_problems,
            COUNT(CASE WHEN c.priority IN ('HIGH', 'CRITICAL') THEN 1 END)::int as high_priority,
            COUNT(CASE WHEN c.status IN ('SUBMITTED', 'UNDER_REVIEW') THEN 1 END)::int as pending_review,
            COUNT(CASE WHEN c.status = 'VALIDATED' THEN 1 END)::int as validated
          FROM blocks b
          LEFT JOIN challenges c ON c.block_id = b.id AND c.status != 'DRAFT'
          WHERE b.district_id = $1
          GROUP BY b.id, b.name
          ORDER BY total_problems DESC`,
          [jurisdiction.effectiveDistrictId],
        );

        return {
          view_type: 'BLOCK_MATRIX',
          district_name: jurisdiction.districtName,
          district_id: jurisdiction.effectiveDistrictId,
          data: blocksData,
          notice: 'District Officer scope: Viewing block breakdown within assigned jurisdiction.',
        };
      }

      // State Admin / Platform Admin: 24-district comparative view
      const districtsData = await qRunner.query(`
        SELECT
          d.id as district_id,
          d.name as district_name,
          COUNT(c.id)::int as total_problems,
          COUNT(CASE WHEN c.priority IN ('HIGH', 'CRITICAL') THEN 1 END)::int as high_priority,
          COUNT(CASE WHEN c.status IN ('SUBMITTED', 'UNDER_REVIEW') THEN 1 END)::int as pending_review,
          COUNT(CASE WHEN c.id IN (SELECT challenge_id FROM expression_of_interests WHERE status != 'DRAFT') THEN 1 END)::int as institutional_interest,
          COUNT(CASE WHEN c.id IN (SELECT challenge_id FROM projects WHERE status IN ('ACTIVE', 'INITIATED')) THEN 1 END)::int as active_pilots,
          COUNT(CASE WHEN c.status IN ('COMPLETED', 'CLOSED') OR c.id IN (SELECT challenge_id FROM projects WHERE status IN ('COMPLETED', 'IMPACT_VERIFIED')) THEN 1 END)::int as resolved
        FROM districts d
        LEFT JOIN challenges c ON c.district_id = d.id AND c.status != 'DRAFT'
        GROUP BY d.id, d.name
        ORDER BY total_problems DESC
      `);

      return {
        view_type: 'DISTRICT_COMPARISON',
        district_name: jurisdiction.districtName,
        data: districtsData,
        map_integration_status: 'Scheduled future enhancement (Pending Survey of India administrative boundary GeoJSON integration)',
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Action Queue: Prominent list of problems requiring government attention in user's jurisdiction.
   */
  async getActionQueue(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const jurisdiction = await this.resolveJurisdictionScope(user, filters);
    const qRunner = this.dataSource.createQueryRunner();

    try {
      const params: any[] = [];
      let whereClause = "c.status IN ('SUBMITTED', 'UNDER_REVIEW')";

      if (jurisdiction.effectiveDistrictId) {
        params.push(jurisdiction.effectiveDistrictId);
        whereClause += ` AND c.district_id = $${params.length}`;
      }

      if (filters?.domain) {
        params.push(filters.domain.trim());
        whereClause += ` AND LOWER(c.category) = LOWER($${params.length})`;
      }

      if (filters?.priority) {
        params.push(filters.priority.trim());
        whereClause += ` AND c.priority = $${params.length}`;
      }

      const sql = `
        SELECT
          c.id,
          c.title,
          c.description,
          COALESCE(NULLIF(c.category, ''), 'General') as domain,
          COALESCE(d.name, c.district) as district_name,
          c.district_id,
          COALESCE(b.name, c.village_locality, 'Local') as location_detail,
          c.priority,
          c.status,
          c.submitted_at,
          c.created_at,
          (SELECT COUNT(*)::int FROM challenge_confirmations cc WHERE cc.challenge_id = c.id) as confirmations_count,
          (SELECT COUNT(*)::int FROM challenge_evidence ce WHERE ce.challenge_id = c.id) as evidence_count,
          (SELECT COUNT(DISTINCT rr.recommended_organization_id)::int FROM recommendation_reviews rr WHERE rr.challenge_id = c.id) as matched_institutions_count,
          (SELECT COUNT(*)::int FROM expression_of_interests eoi WHERE eoi.challenge_id = c.id AND eoi.status != 'DRAFT') as eois_count
        FROM challenges c
        LEFT JOIN districts d ON d.id = c.district_id
        LEFT JOIN blocks b ON b.id = c.block_id
        WHERE ${whereClause}
        ORDER BY
          CASE WHEN c.priority = 'CRITICAL' THEN 1 WHEN c.priority = 'HIGH' THEN 2 WHEN c.priority = 'MEDIUM' THEN 3 ELSE 4 END ASC,
          c.submitted_at DESC
        LIMIT 25
      `;

      const items = await qRunner.query(sql, params);

      return {
        count: items.length,
        items,
        jurisdiction: {
          role: jurisdiction.role,
          scope: jurisdiction.scope,
          district_name: jurisdiction.districtName,
        },
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Matching Insights: Shows validated problems with top AI-matched solution providers.
   * Displays capability verification breakdown (VERIFIED / PENDING / UNVERIFIED).
   * Zero exposure of private institutional evidence files.
   */
  async getMatchingInsights(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const jurisdiction = await this.resolveJurisdictionScope(user, filters);
    const qRunner = this.dataSource.createQueryRunner();

    try {
      const params: any[] = [];
      let whereClause = "c.status IN ('VALIDATED', 'MATCHING', 'MATCHED', 'IN_PROGRESS', 'PROJECT_INITIATED', 'COMPLETED')";

      if (jurisdiction.effectiveDistrictId) {
        params.push(jurisdiction.effectiveDistrictId);
        whereClause += ` AND c.district_id = $${params.length}`;
      }

      const sql = `
        SELECT
          c.id as challenge_id,
          c.title as challenge_title,
          COALESCE(NULLIF(c.category, ''), 'General') as domain,
          COALESCE(d.name, c.district) as district_name,
          rr.id as recommendation_id,
          org.id as organization_id,
          org.name as organization_name,
          org.organization_type,
          rr.ai_recommendation_score,
          rr.ai_match_reasons,
          rr.human_review_status,
          (
            SELECT COUNT(*)::int 
            FROM institution_capabilities ic 
            WHERE ic.institution_id IN (SELECT id FROM institution_profiles WHERE organization_id = org.id)
              AND ic.verification_status = 'VERIFIED'
          ) as verified_capabilities_count,
          (
            SELECT COUNT(*)::int 
            FROM institution_capabilities ic 
            WHERE ic.institution_id IN (SELECT id FROM institution_profiles WHERE organization_id = org.id)
              AND ic.verification_status = 'PENDING_VERIFICATION'
          ) as pending_capabilities_count,
          (
            SELECT COUNT(*)::int 
            FROM institution_capabilities ic 
            WHERE ic.institution_id IN (SELECT id FROM institution_profiles WHERE organization_id = org.id)
              AND ic.verification_status = 'UNVERIFIED'
          ) as unverified_capabilities_count
        FROM recommendation_reviews rr
        INNER JOIN challenges c ON c.id = rr.challenge_id
        LEFT JOIN districts d ON d.id = c.district_id
        INNER JOIN organizations org ON org.id = rr.recommended_organization_id
        WHERE ${whereClause}
        ORDER BY rr.ai_recommendation_score DESC
        LIMIT 25
      `;

      const matches = await qRunner.query(sql, params);

      // Group matches by challenge
      const grouped: { [chalId: string]: any } = {};
      for (const m of matches) {
        if (!grouped[m.challenge_id]) {
          grouped[m.challenge_id] = {
            challenge_id: m.challenge_id,
            challenge_title: m.challenge_title,
            domain: m.domain,
            district_name: m.district_name,
            recommendations: [],
          };
        }
        grouped[m.challenge_id].recommendations.push({
          organization_id: m.organization_id,
          organization_name: m.organization_name,
          organization_type: m.organization_type,
          alignment_score: Math.round(Number(m.ai_recommendation_score || 0)),
          verified_capabilities_count: Number(m.verified_capabilities_count || 0),
          pending_capabilities_count: Number(m.pending_capabilities_count || 0),
          unverified_capabilities_count: Number(m.unverified_capabilities_count || 0),
          reasons: Array.isArray(m.ai_match_reasons)
            ? m.ai_match_reasons
            : m.ai_match_reasons?.reasons || ['Ecosystem capability match'],
          review_status: m.human_review_status,
        });
      }

      return {
        total_matched_challenges: Object.keys(grouped).length,
        insights: Object.values(grouped),
        challenges: Object.values(grouped),
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Ecosystem Participation Analytics.
   */
  async getEcosystemAnalytics(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const qRunner = this.dataSource.createQueryRunner();
    try {
      const ecoRes = await qRunner.query(`
        SELECT
          COUNT(DISTINCT CASE WHEN org.organization_type = 'INSTITUTION' THEN org.id END)::int as participating_heis,
          COUNT(DISTINCT CASE WHEN org.organization_type = 'INDUSTRY' THEN org.id END)::int as participating_industries,
          COUNT(DISTINCT pp.project_id)::int as active_consortiums
        FROM project_participants pp
        INNER JOIN organizations org ON org.id = pp.organization_id
      `);

      const acadRes = await qRunner.query(`
        SELECT
          COUNT(*)::int as total_academic_members,
          COUNT(CASE WHEN role = 'STUDENT' THEN 1 END)::int as students_count,
          COUNT(CASE WHEN role = 'FACULTY_MENTOR' THEN 1 END)::int as faculty_mentors_count
        FROM project_academic_members
        WHERE status = 'ACTIVE'
      `);

      const eoiStats = await qRunner.query(`
        SELECT
          COUNT(*)::int as total_eois,
          COUNT(CASE WHEN status = 'SUBMITTED' THEN 1 END)::int as submitted_eois,
          COUNT(CASE WHEN status IN ('UNDER_REVIEW', 'DISCUSSION_REQUIRED') THEN 1 END)::int as under_review_eois,
          COUNT(CASE WHEN status IN ('ACCEPTED', 'PROJECT_FORMED') THEN 1 END)::int as accepted_eois
        FROM expression_of_interests
      `);

      return {
        participatingHeis: ecoRes[0]?.participating_heis || 0,
        participatingIndustries: ecoRes[0]?.participating_industries || 0,
        activeConsortiums: ecoRes[0]?.active_consortiums || 0,
        academicMembers: acadRes[0]?.total_academic_members || 0,
        students: acadRes[0]?.students_count || 0,
        facultyMentors: acadRes[0]?.faculty_mentors_count || 0,
        orgBreakdown: [
          { type: 'INSTITUTION', count: ecoRes[0]?.participating_heis || 0 },
          { type: 'INDUSTRY', count: ecoRes[0]?.participating_industries || 0 },
        ],
        academicRoles: [
          { role: 'STUDENT', count: acadRes[0]?.students_count || 0 },
          { role: 'FACULTY_MENTOR', count: acadRes[0]?.faculty_mentors_count || 0 },
        ],
        eois: {
          total: eoiStats[0]?.total_eois || 0,
          submitted: eoiStats[0]?.submitted_eois || 0,
          underReview: eoiStats[0]?.under_review_eois || 0,
          accepted: eoiStats[0]?.accepted_eois || 0,
        },
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Impact Analytics.
   */
  async getImpactAnalytics(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const qRunner = this.dataSource.createQueryRunner();
    try {
      const impactRes = await qRunner.query(`
        SELECT
          COALESCE(SUM(beneficiaries_reached), 0)::bigint as total_beneficiaries,
          COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END)::int as verified_assessments
        FROM impact_assessments
      `);

      const fundingRes = await qRunner.query(`
        SELECT
          COALESCE(SUM(value), 0)::numeric as total_funding_mobilized,
          COUNT(CASE WHEN contribution_type = 'TECHNOLOGY_TRANSFER' AND status = 'VERIFIED' THEN 1 END)::int as verified_tech_transfers
        FROM project_contributions
        WHERE status = 'VERIFIED'
      `);

      return {
        totalBeneficiaries: Number(impactRes[0]?.total_beneficiaries || 0),
        verifiedAssessments: impactRes[0]?.verified_assessments || 0,
        totalFundingMobilized: Number(fundingRes[0]?.total_funding_mobilized || 0),
        verifiedTechTransfers: fundingRes[0]?.verified_tech_transfers || 0,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Innovation Outcomes Analytics.
   */
  async getInnovationOutcomes(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const qRunner = this.dataSource.createQueryRunner();
    try {
      const outcomesByType = await qRunner.query(`
        SELECT 
          outcome_type, 
          COUNT(*)::int as total,
          COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END)::int as verified
        FROM project_innovation_outcomes
        GROUP BY outcome_type
      `);

      const outcomesByStatus = await qRunner.query(`
        SELECT 
          status, 
          COUNT(*)::int as count
        FROM project_innovation_outcomes
        GROUP BY status
      `);

      const recentVerifiedOutcomes = await qRunner.query(`
        SELECT 
          pio.*, 
          p.title as project_title, 
          o.name as organization_name
        FROM project_innovation_outcomes pio
        LEFT JOIN projects p ON p.id = pio.project_id
        LEFT JOIN organizations o ON o.id = pio.organization_id
        WHERE pio.status = 'VERIFIED'
        ORDER BY pio.created_at DESC
        LIMIT 10
      `);

      const innovationRes = await qRunner.query(`
        SELECT
          COUNT(*)::int as total_outcomes,
          COUNT(CASE WHEN status = 'VERIFIED' THEN 1 END)::int as verified_outcomes,
          COUNT(CASE WHEN outcome_type IN ('PATENT', 'PATENT_APPLICATION') AND status = 'VERIFIED' THEN 1 END)::int as verified_patents,
          COUNT(CASE WHEN outcome_type = 'STARTUP_CREATED' AND status = 'VERIFIED' THEN 1 END)::int as verified_startups,
          COUNT(CASE WHEN outcome_type = 'IP_GENERATED' AND status = 'VERIFIED' THEN 1 END)::int as verified_ip,
          COUNT(CASE WHEN outcome_type = 'TECHNOLOGY_TRANSFER' AND status = 'VERIFIED' THEN 1 END)::int as verified_tech_transfers
        FROM project_innovation_outcomes
      `);

      const res = innovationRes[0] || {};
      return {
        totalOutcomes: res.total_outcomes || 0,
        verifiedOutcomes: res.verified_outcomes || 0,
        patents: res.verified_patents || 0,
        startups: res.verified_startups || 0,
        ipGenerated: res.verified_ip || 0,
        techTransfers: res.verified_tech_transfers || 0,
        outcomesByType,
        outcomesByStatus,
        recentVerifiedOutcomes,
      };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Problem Clusters Analytics.
   */
  async getProblemClustersAnalytics(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const jurisdiction = await this.resolveJurisdictionScope(user, filters);
    const qRunner = this.dataSource.createQueryRunner();
    try {
      const params: any[] = [];
      let whereClause = '1=1';

      if (jurisdiction.effectiveDistrictId) {
        params.push(jurisdiction.effectiveDistrictId);
        whereClause = `district_id = $${params.length}`;
      }

      const byDistrict = await qRunner.query(
        `SELECT 
           COALESCE(NULLIF(district, ''), 'Unknown') as district,
           COUNT(*)::int as count,
           COALESCE(SUM(report_count), 0)::int as total_reports
         FROM problem_clusters 
         WHERE ${whereClause} 
         GROUP BY COALESCE(NULLIF(district, ''), 'Unknown') 
         ORDER BY total_reports DESC`,
        params,
      );

      const byCategory = await qRunner.query(
        `SELECT COALESCE(NULLIF(category, ''), 'General') as category, COUNT(*)::int as count 
         FROM problem_clusters 
         WHERE ${whereClause} 
         GROUP BY category 
         ORDER BY count DESC`,
        params,
      );

      const byPriority = await qRunner.query(
        `SELECT priority, COUNT(*)::int as count 
         FROM problem_clusters 
         WHERE ${whereClause} 
         GROUP BY priority 
         ORDER BY count DESC`,
        params,
      );

      const byStatus = await qRunner.query(
        `SELECT status, COUNT(*)::int as count 
         FROM problem_clusters 
         WHERE ${whereClause} 
         GROUP BY status 
         ORDER BY count DESC`,
        params,
      );

      return { byDistrict, byCategory, byPriority, byStatus };
    } finally {
      await qRunner.release();
    }
  }

  /**
   * Projects Analytics.
   */
  async getProjectsAnalytics(user?: any, filters?: AnalyticsFilters): Promise<any> {
    const qRunner = this.dataSource.createQueryRunner();
    try {
      const projRes = await qRunner.query(`
        SELECT
          COUNT(*)::int as total_projects,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END)::int as active_projects,
          COUNT(CASE WHEN status = 'BLOCKED' THEN 1 END)::int as blocked_projects,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END)::int as completed_projects,
          COUNT(CASE WHEN status = 'IMPACT_VERIFIED' THEN 1 END)::int as impact_verified_projects
        FROM projects
      `);

      const res = projRes[0] || {};
      const totalProj = res.total_projects || 0;
      const finishedProj = (res.completed_projects || 0) + (res.impact_verified_projects || 0);
      const completionRate = totalProj > 0 ? Math.round((finishedProj / totalProj) * 100) : 0;

      return {
        total: totalProj,
        active: res.active_projects || 0,
        blocked: res.blocked_projects || 0,
        completed: res.completed_projects || 0,
        impactVerified: res.impact_verified_projects || 0,
        completionRate,
        pipeline: [
          { stage: 'Active', count: res.active_projects || 0 },
          { stage: 'Completed', count: res.completed_projects || 0 },
        ],
      };
    } finally {
      await qRunner.release();
    }
  }
}
