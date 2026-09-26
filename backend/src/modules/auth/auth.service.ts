import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../../common/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { normalizePhoneNumber } from '../../common/utils/phone.utils';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user account.
   * Public registration strictly enforces UserRole.CITIZEN.
   * Privileged roles (PLATFORM_ADMIN, UNIVERSITY_ADMIN, etc.) cannot be self-assigned.
   */
  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const normalizedPhone = normalizePhoneNumber(dto.phone);

    const existingUser = await this.userRepo.findOne({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new ConflictException('An account with this email address already exists.');
    }

    if (normalizedPhone) {
      const existingPhone = await this.userRepo.findOne({
        where: { phone: normalizedPhone },
      });
      if (existingPhone) {
        throw new ConflictException('An account with this phone number already exists.');
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(dto.password, salt);

    const user = this.userRepo.create({
      name: dto.name.trim(),
      email: normalizedEmail,
      password_hash,
      phone: normalizedPhone,
      role: UserRole.CITIZEN, // Strictly enforce default role
      preferred_language: dto.preferred_language || 'en',
      is_active: true,
    });

    const savedUser = await this.userRepo.save(user);

    return {
      id: savedUser.id,
      name: savedUser.name,
      email: savedUser.email,
      role: savedUser.role,
      phone: savedUser.phone,
      preferred_language: savedUser.preferred_language,
      is_active: savedUser.is_active,
      created_at: savedUser.created_at,
    };
  }

  /**
   * Validate user credentials (email or phone) and return a signed JWT token.
   */
  async login(dto: LoginDto) {
    const rawIdentifier = (dto.identifier || dto.email || dto.phone || '').trim();
    if (!rawIdentifier) {
      throw new UnauthorizedException('Invalid email, phone, or password.');
    }

    let user: User | null = null;

    if (rawIdentifier.includes('@')) {
      const normalizedEmail = rawIdentifier.toLowerCase();
      user = await this.userRepo
        .createQueryBuilder('user')
        .addSelect('user.password_hash')
        .where('LOWER(user.email) = :email', { email: normalizedEmail })
        .getOne();
    } else {
      const normalizedPhone = normalizePhoneNumber(rawIdentifier);
      const query = this.userRepo
        .createQueryBuilder('user')
        .addSelect('user.password_hash');

      if (normalizedPhone) {
        query.where('user.phone = :phone', { phone: normalizedPhone })
             .orWhere('LOWER(user.email) = :raw', { raw: rawIdentifier.toLowerCase() });
      } else {
        query.where('LOWER(user.email) = :raw', { raw: rawIdentifier.toLowerCase() });
      }
      user = await query.getOne();
    }

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid email, phone, or password.');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    if (!user.is_active) {
      throw new UnauthorizedException('Account has been deactivated. Please contact an administrator.');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      preferred_language: user.preferred_language,
      district_id: user.district_id,
      district: user.district,
      state: user.state,
      jurisdiction_scope: user.jurisdiction_scope,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        preferred_language: user.preferred_language,
        district_id: user.district_id,
        district: user.district,
        state: user.state,
        jurisdiction_scope: user.jurisdiction_scope,
      },
    };
  }

  /**
   * Retrieve safe profile of the authenticated user including approved organization memberships.
   */
  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization', 'memberships', 'memberships.organization', 'districtRef'],
    });

    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      is_active: user.is_active,
      district_id: user.district_id,
      district: user.district,
      districtName: user.districtRef?.name || user.district,
      state: user.state,
      jurisdiction_scope: user.jurisdiction_scope,
      primaryOrganization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            organization_type: user.organization.organization_type,
            district_id: user.organization.district_id,
            district: user.organization.district,
            state: user.organization.state,
          }
        : null,
      memberships: (user.memberships || []).map((m) => ({
        id: m.id,
        organization_id: m.organization_id,
        organization_name: m.organization ? m.organization.name : null,
        organization_type: m.organization ? m.organization.organization_type : null,
        organization_role: m.organization_role,
        membership_status: m.membership_status,
        created_at: m.created_at,
      })),
      created_at: user.created_at,
    };
  }

  /**
   * Safe user profile update endpoint with strict anti-tamper protections:
   * Users CANNOT self-assign or modify district_id, district, role, or jurisdiction_scope.
   */
  async updateProfile(userId: string, dto: any) {
    // TAMPER DEFENSE: Strict rejection of self-jurisdiction modification attempts
    if (
      dto.district_id !== undefined ||
      dto.district !== undefined ||
      dto.role !== undefined ||
      dto.jurisdiction_scope !== undefined
    ) {
      throw new ForbiddenException(
        'Security violation: Modifying assigned jurisdiction, district, role, or scope is strictly reserved for higher-level Platform Administrators.',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User profile not found.');
    }

    if (dto.name !== undefined && dto.name.trim().length > 0) user.name = dto.name.trim();
    if (dto.phone !== undefined) user.phone = dto.phone ? dto.phone.trim() : null;

    const saved = await this.userRepo.save(user);
    return this.getProfile(saved.id);
  }

  /**
   * Administrative Jurisdiction Assignment: Strictly restricted to PLATFORM_ADMIN.
   */
  async adminUpdateJurisdiction(targetUserId: string, jurisdictionDto: any, adminUser: any) {
    if (adminUser.role !== UserRole.PLATFORM_ADMIN) {
      throw new ForbiddenException('Only Platform Administrators can reassign user jurisdiction or district.');
    }

    const user = await this.userRepo.findOne({ where: { id: targetUserId } });
    if (!user) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found.`);
    }

    if (jurisdictionDto.district_id !== undefined) user.district_id = jurisdictionDto.district_id;
    if (jurisdictionDto.district !== undefined) user.district = jurisdictionDto.district;
    if (jurisdictionDto.state !== undefined) user.state = jurisdictionDto.state;
    if (jurisdictionDto.jurisdiction_scope !== undefined) user.jurisdiction_scope = jurisdictionDto.jurisdiction_scope;
    if (jurisdictionDto.role !== undefined) user.role = jurisdictionDto.role;

    const saved = await this.userRepo.save(user);
    return this.getProfile(saved.id);
  }
}
