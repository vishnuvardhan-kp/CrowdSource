import { Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { User } from '../../users/entities/user.entity';
import { Challenge } from '../../challenges/entities/challenge.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { UserRole, JurisdictionScope } from '../../../common/enums';

@Injectable()
export class JurisdictionService {
  /**
   * Validates access to a problem/challenge using CANONICAL district_id.
   * Free-text district strings must NEVER override or bypass structured district_id checks.
   */
  validateChallengeAccess(user: User | any, challenge: Challenge | any): void {
    if (!user) {
      throw new UnauthorizedException('Authentication required to access jurisdiction-protected records.');
    }

    // 1. Platform Administrators have unrestricted platform-wide access
    if (user.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    // 2. Statewide Government Administrators have jurisdiction across the state
    if (user.role === UserRole.GOVERNMENT_ADMIN) {
      const userState = (user.state || 'Jharkhand').toLowerCase().trim();
      const chalState = (challenge.state || 'Jharkhand').toLowerCase().trim();
      if (userState && chalState && userState !== chalState) {
        throw new ForbiddenException(
          `Jurisdiction violation: Government Admin assigned to state "${user.state}" cannot access challenge in state "${challenge.state}".`,
        );
      }
      return;
    }

    // 3. District Government Officers: CANONICAL district_id enforcement
    if (user.role === UserRole.GOVERNMENT_OFFICER) {
      // SECURITY RULE: Missing or NULL district_id must NEVER grant permissive access
      if (!user.district_id) {
        throw new ForbiddenException(
          'Jurisdiction violation: Authenticated government officer has no assigned district ID. Access denied.',
        );
      }

      if (!challenge.district_id) {
        throw new ForbiddenException(
          'Jurisdiction violation: Target problem record lacks a canonical district ID. Access denied.',
        );
      }

      // SECURITY RULE: Authoritative check is strictly user.district_id === challenge.district_id
      // Even if human-readable district names match or are spoofed, conflicting IDs MUST be rejected!
      if (user.district_id !== challenge.district_id) {
        throw new ForbiddenException(
          `Jurisdiction violation: You do not have authorization for problems outside your assigned district. (Officer district ID: ${user.district_id}, Target district ID: ${challenge.district_id}).`,
        );
      }

      return;
    }

    // 4. Other Roles (Citizens, Institutions, etc.)
    if (challenge.status === 'DRAFT') {
      if (challenge.submitted_by !== user.id) {
        throw new ForbiddenException('Access denied: Draft challenges can only be accessed by their creator.');
      }
    }
  }

  /**
   * Validates access to an institutional organization, capability, or evidence
   * using CANONICAL institution organization district_id.
   * Separates problem jurisdiction from institutional jurisdiction.
   */
  validateOrganizationAccess(user: User | any, organization: Organization | any): void {
    if (!user) {
      throw new UnauthorizedException('Authentication required.');
    }

    if (user.role === UserRole.PLATFORM_ADMIN) {
      return;
    }

    if (user.role === UserRole.GOVERNMENT_ADMIN) {
      const userState = (user.state || 'Jharkhand').toLowerCase().trim();
      const orgState = (organization?.state || 'Jharkhand').toLowerCase().trim();
      if (userState && orgState && userState !== orgState) {
        throw new ForbiddenException(
          `Jurisdiction violation: Government Admin assigned to state "${user.state}" cannot verify institutions in state "${organization?.state}".`,
        );
      }
      return;
    }

    if (user.role === UserRole.GOVERNMENT_OFFICER) {
      if (!user.district_id) {
        throw new ForbiddenException('Jurisdiction violation: Government officer has no assigned district ID.');
      }

      if (!organization || !organization.district_id) {
        throw new ForbiddenException(
          'Jurisdiction violation: Target institution/organization lacks a structured canonical district ID. Access denied.',
        );
      }

      // Authoritative canonical district_id check
      if (user.district_id !== organization.district_id) {
        throw new ForbiddenException(
          `Jurisdiction violation: You do not have authorization to verify organizations outside your assigned district. (Officer district ID: ${user.district_id}, Target organization district ID: ${organization.district_id}).`,
        );
      }

      return;
    }

    throw new ForbiddenException('Access denied: Unauthorized role for government verification.');
  }
}
