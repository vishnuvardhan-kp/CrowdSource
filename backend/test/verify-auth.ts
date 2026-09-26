import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env'), override: true });
dotenv.config({ path: path.resolve(__dirname, '../../.env'), override: true });
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { ConflictException, UnauthorizedException, ForbiddenException, ExecutionContext } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcryptjs';

import { AppDataSource } from '../src/database/data-source';
import { User, Organization, OrganizationMembership, OrganizationClaimRequest } from '../src/database/entities';
import { UserRole, OrganizationRole, MembershipStatus, ClaimRequestStatus, OrganizationType } from '../src/common/enums';
import { AuthService } from '../src/modules/auth/auth.service';
import { OrganizationsService } from '../src/modules/organizations/organizations.service';
import { RegisterDto } from '../src/modules/auth/dto/register.dto';
import { LoginDto } from '../src/modules/auth/dto/login.dto';
import { CreateClaimRequestDto } from '../src/modules/organizations/dto/create-claim-request.dto';
import { RolesGuard } from '../src/modules/auth/guards/roles.guard';
import { ROLES_KEY } from '../src/modules/auth/decorators/roles.decorator';

async function runAuthVerification() {
  console.log('🧪 Starting SamadhanSetu Phase 3 Authentication & Access Control Verification Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ' - ' + detail : ''}`);
      failed++;
    }
  }

  // Ensure DB initialized
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const userRepo = AppDataSource.getRepository(User);
  const orgRepo = AppDataSource.getRepository(Organization);
  const membershipRepo = AppDataSource.getRepository(OrganizationMembership);
  const claimRepo = AppDataSource.getRepository(OrganizationClaimRequest);

  const jwtSecret = process.env.JWT_SECRET || 'dev-jwt-secret-key-change-in-prod';
  const jwtService = new JwtService({
    secret: jwtSecret,
    signOptions: { expiresIn: '1h' },
  });

  const authService = new AuthService(userRepo, jwtService);
  const organizationsService = new OrganizationsService(orgRepo, membershipRepo, claimRepo);

  // Clean up any test users from previous test runs
  const testEmailPrefix = 'auth-test-' + Date.now();
  const testEmail1 = `${testEmailPrefix}-1@test.local`;
  const testEmail2 = `${testEmailPrefix}-2@test.local`;

  // =========================================================================
  // 1. REGISTRATION TESTS
  // =========================================================================
  console.log('📝 Test Suite 1: User Registration');

  // Test 1.1: Valid registration
  let regResult: any;
  try {
    regResult = await authService.register({
      name: 'Ramesh Patel',
      email: testEmail1,
      password: 'SecurePassword123!',
      phone: '+91-9876500001',
    });
    assert(regResult !== undefined && regResult.id !== undefined, 'Valid registration creates user account');
    assert(regResult.name === 'Ramesh Patel', 'Registration preserves user name');
    assert(regResult.email === testEmail1, 'Registration preserves normalized email');
    assert(regResult.password_hash === undefined, 'Registration response NEVER returns password_hash');
  } catch (err: any) {
    assert(false, 'Valid registration creates user account', err.message);
  }

  // Test 1.2: Duplicate email rejected with ConflictException (409)
  let duplicateRejected = false;
  try {
    await authService.register({
      name: 'Duplicate User',
      email: testEmail1,
      password: 'AnotherPassword123!',
    });
  } catch (err) {
    duplicateRejected = err instanceof ConflictException;
  }
  assert(duplicateRejected, 'Duplicate email registration rejected with 409 ConflictException');

  // Test 1.3: Invalid email rejected by DTO validation
  const invalidEmailDto = plainToInstance(RegisterDto, {
    name: 'Invalid Email User',
    email: 'not-a-valid-email',
    password: 'SecurePassword123!',
  });
  const emailErrors = await validate(invalidEmailDto);
  assert(emailErrors.some((e) => e.property === 'email'), 'Invalid email format rejected by DTO validation');

  // Test 1.4: Weak/short password rejected by DTO validation (< 8 characters)
  const weakPasswordDto = plainToInstance(RegisterDto, {
    name: 'Weak Password User',
    email: 'weakpass@test.local',
    password: 'short',
  });
  const passErrors = await validate(weakPasswordDto);
  assert(passErrors.some((e) => e.property === 'password'), 'Weak password (< 8 chars) rejected by DTO validation');

  // Test 1.5: Password is securely hashed with bcrypt in database
  const dbUser = await userRepo
    .createQueryBuilder('user')
    .addSelect('user.password_hash')
    .where('user.id = :id', { id: regResult.id })
    .getOne();

  const isHashFormat = dbUser?.password_hash?.startsWith('$2b$') || dbUser?.password_hash?.startsWith('$2a$');
  const isPlaintextStored = dbUser?.password_hash === 'SecurePassword123!';
  const bcryptMatches = await bcrypt.compare('SecurePassword123!', dbUser?.password_hash || '');
  assert(isHashFormat && !isPlaintextStored, 'Password is stored as bcrypt hash and never plaintext');
  assert(bcryptMatches, 'Bcrypt hash correctly verifies original password');

  // Test 1.6: User defaults to CITIZEN role
  assert(dbUser?.role === UserRole.CITIZEN, 'Newly registered user strictly defaults to CITIZEN role');

  // Test 1.7: User cannot self-assign admin role during registration
  const privilegeEscalationAttempt = await authService.register({
    name: 'Attacker User',
    email: testEmail2,
    password: 'SecurePassword123!',
    // Client attempts to sneak in an admin role
    ...({ role: UserRole.PLATFORM_ADMIN } as any),
  });
  const escalatedDbUser = await userRepo.findOne({ where: { id: privilegeEscalationAttempt.id } });
  assert(
    escalatedDbUser?.role === UserRole.CITIZEN,
    'Client cannot self-assign PLATFORM_ADMIN; role strictly defaults to CITIZEN'
  );

  // =========================================================================
  // 2. LOGIN & CREDENTIAL VALIDATION TESTS
  // =========================================================================
  console.log('\n🔑 Test Suite 2: User Login & Credentials');

  // Test 2.1: Valid login credentials
  let loginResult: any;
  try {
    loginResult = await authService.login({
      email: testEmail1,
      password: 'SecurePassword123!',
    });
    assert(loginResult !== undefined && typeof loginResult.accessToken === 'string', 'Valid credentials return JWT access token');
    assert(loginResult.user.id === regResult.id, 'Login returns safe user id');
    assert(loginResult.user.role === UserRole.CITIZEN, 'Login returns correct user role');
    assert(loginResult.user.password_hash === undefined, 'Login response NEVER exposes password_hash');
  } catch (err: any) {
    assert(false, 'Valid credentials return JWT access token', err.message);
  }

  // Test 2.2: Invalid password rejected with UnauthorizedException (401)
  let wrongPassRejected = false;
  try {
    await authService.login({
      email: testEmail1,
      password: 'IncorrectPassword999!',
    });
  } catch (err) {
    wrongPassRejected = err instanceof UnauthorizedException;
  }
  assert(wrongPassRejected, 'Invalid password rejected with 401 UnauthorizedException');

  // Test 2.3: Unknown user rejected with UnauthorizedException (401)
  let unknownUserRejected = false;
  try {
    await authService.login({
      email: 'nonexistent-user@nowhere.local',
      password: 'SomePassword123!',
    });
  } catch (err) {
    unknownUserRejected = err instanceof UnauthorizedException;
  }
  assert(unknownUserRejected, 'Unknown user rejected with 401 UnauthorizedException');

  // =========================================================================
  // 3. JWT TOKEN INTEGRITY & AUTHENTICATION TESTS
  // =========================================================================
  console.log('\n🛡️ Test Suite 3: JWT Token Integrity & Claims');

  // Test 3.1: JWT generated with correct payload
  const decodedPayload: any = jwtService.verify(loginResult.accessToken);
  assert(decodedPayload.sub === regResult.id, 'JWT sub claim matches user ID');
  assert(decodedPayload.email === testEmail1, 'JWT email claim matches user email');
  assert(decodedPayload.role === UserRole.CITIZEN, 'JWT role claim matches user role');
  assert(decodedPayload.password_hash === undefined, 'JWT does NOT contain sensitive password hash');

  // Test 3.2: Tampered / invalid JWT rejected
  let invalidTokenRejected = false;
  try {
    const tamperedToken = loginResult.accessToken + 'tampered';
    jwtService.verify(tamperedToken);
  } catch (err) {
    invalidTokenRejected = true;
  }
  assert(invalidTokenRejected, 'Tampered / invalid JWT signature rejected');

  // =========================================================================
  // 4. ROLE-BASED ACCESS CONTROL (RBAC) TESTS
  // =========================================================================
  console.log('\n🔒 Test Suite 4: Role-Based Authorization Guard (RolesGuard)');

  const reflector = new Reflector();
  const rolesGuard = new RolesGuard(reflector);

  function createMockContext(user: any, handlerRoles?: UserRole[]): ExecutionContext {
    return {
      getHandler: () => () => {},
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as unknown as ExecutionContext;
  }

  // Spy reflector to return specific roles
  const originalGetAllAndOverride = reflector.getAllAndOverride;

  // Test 4.1: Endpoint without role requirement allows access
  reflector.getAllAndOverride = (() => undefined) as any;
  const publicAccess = rolesGuard.canActivate(createMockContext({ role: UserRole.CITIZEN }));
  assert(publicAccess === true, 'Endpoint without @Roles decorator allows any authenticated user');

  // Test 4.2: Correct role accepted (PLATFORM_ADMIN accessing PLATFORM_ADMIN endpoint)
  reflector.getAllAndOverride = (() => [UserRole.PLATFORM_ADMIN]) as any;
  const adminAccess = rolesGuard.canActivate(createMockContext({ role: UserRole.PLATFORM_ADMIN }));
  assert(adminAccess === true, 'PLATFORM_ADMIN access accepted on PLATFORM_ADMIN-protected endpoint');

  // Test 4.3: Incorrect role rejected with 403 ForbiddenException
  let forbiddenThrown = false;
  try {
    rolesGuard.canActivate(createMockContext({ role: UserRole.CITIZEN }));
  } catch (err) {
    forbiddenThrown = err instanceof ForbiddenException;
  }
  assert(forbiddenThrown, 'CITIZEN role returns 403 ForbiddenException on PLATFORM_ADMIN-protected endpoint');

  // Test 4.4: Multi-role match check
  reflector.getAllAndOverride = (() => [UserRole.UNIVERSITY_ADMIN, UserRole.FACULTY]) as any;
  const facultyAccess = rolesGuard.canActivate(createMockContext({ role: UserRole.FACULTY }));
  assert(facultyAccess === true, 'FACULTY role accepted when allowed roles are [UNIVERSITY_ADMIN, FACULTY]');

  let studentForbidden = false;
  try {
    rolesGuard.canActivate(createMockContext({ role: UserRole.STUDENT }));
  } catch (err) {
    studentForbidden = err instanceof ForbiddenException;
  }
  assert(studentForbidden, 'STUDENT role returns 403 when allowed roles are [UNIVERSITY_ADMIN, FACULTY]');

  // Restore reflector
  reflector.getAllAndOverride = originalGetAllAndOverride;

  // =========================================================================
  // 5. ORGANIZATION MEMBERSHIP & CLAIM REQUEST TESTS
  // =========================================================================
  console.log('\n🏛️ Test Suite 5: Organization Membership & Claim Requests');

  // Find or create test organization
  let testOrg = await orgRepo.findOne({ where: { name: '[TEST-SUITE] Innovation Lab' } });
  if (!testOrg) {
    testOrg = orgRepo.create({
      name: '[TEST-SUITE] Innovation Lab',
      organization_type: OrganizationType.INSTITUTION,
      district: 'Ranchi',
      state: 'Jharkhand',
      is_claimed: false,
    });
    testOrg = await orgRepo.save(testOrg);
  }

  // Test 5.1: Membership relationship works
  const member1 = membershipRepo.create({
    user_id: regResult.id,
    organization_id: testOrg.id,
    organization_role: OrganizationRole.MEMBER,
    membership_status: MembershipStatus.ACTIVE,
  });
  await membershipRepo.save(member1);

  const orgMembers = await organizationsService.findMembers(testOrg.id);
  assert(orgMembers.length >= 1, 'Organization membership successfully created and retrievable');
  assert(orgMembers.some((m) => m.user_id === regResult.id), 'Membership correctly associates user with organization');

  // Test 5.2: Multiple users can belong to the same organization
  const member2 = membershipRepo.create({
    user_id: privilegeEscalationAttempt.id,
    organization_id: testOrg.id,
    organization_role: OrganizationRole.ADMIN,
    membership_status: MembershipStatus.ACTIVE,
  });
  await membershipRepo.save(member2);

  const updatedMembers = await organizationsService.findMembers(testOrg.id);
  assert(
    updatedMembers.filter((m) => [regResult.id, privilegeEscalationAttempt.id].includes(m.user_id)).length === 2,
    'Multiple users can belong to the same organization with distinct organization roles'
  );

  // Test 5.3: Organization claim request can be created in PENDING status
  const claimResult = await organizationsService.createClaimRequest(regResult.id, {
    organization_id: testOrg.id,
    reason: 'Authorized department coordinator applying to verify and manage institutional capabilities.',
  });
  assert(claimResult.claim.status === ClaimRequestStatus.PENDING, 'Claim request submitted in PENDING status');
  assert(claimResult.claim.organization_id === testOrg.id, 'Claim request correctly references organization');

  // Test 5.4: Pending claim does NOT grant administrative access
  // Refresh user from DB to ensure no automatic privilege escalation
  const userWithPendingClaim = await userRepo.findOne({ where: { id: regResult.id } });
  assert(
    userWithPendingClaim?.role === UserRole.CITIZEN,
    'User role remains CITIZEN while claim request is PENDING; zero privileges granted'
  );

  // Test 5.5: Safe profile endpoint (/api/auth/me) returns profile with memberships without password_hash
  const userProfile = await authService.getProfile(regResult.id);
  assert(userProfile.id === regResult.id, 'Profile endpoint returns correct user ID');
  assert(userProfile.role === UserRole.CITIZEN, 'Profile endpoint returns role CITIZEN');
  assert((userProfile as any).password_hash === undefined, 'Profile endpoint NEVER returns password_hash');
  assert(Array.isArray(userProfile.memberships), 'Profile endpoint includes memberships list');
  assert(userProfile.memberships.length >= 1, 'Profile memberships list contains active organization associations');

  // Clean up test data
  try {
    await claimRepo.delete({ organization_id: testOrg.id });
    await membershipRepo.delete({ organization_id: testOrg.id });
    await orgRepo.delete({ id: testOrg.id });
    await userRepo.delete({ id: regResult.id });
    await userRepo.delete({ id: privilegeEscalationAttempt.id });
  } catch (cleanErr) {
    // Ignore cleanup errors
  }

  // Summary
  console.log(`\n========================================`);
  console.log(`Summary: ${passed} passed, ${failed} failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All Phase 3 Authentication, Roles & Organization Membership checks PASSED!\n');
  }
}

runAuthVerification().catch((err) => {
  console.error('Fatal verification error in Phase 3 suite:', err);
  process.exit(1);
});
