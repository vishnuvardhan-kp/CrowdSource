import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  district_id?: string | null;
  district?: string | null;
  state?: string | null;
  jurisdiction_scope?: string | null;
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
    const secret =
      configService.get<string>('app.jwtSecret') ||
      configService.get<string>('JWT_SECRET') ||
      'dev-jwt-secret-key-change-in-prod';

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or expired token payload');
    }

    // Authoritative Fresh Server-Side Jurisdiction Query
    // Eliminates stale or manipulated client-side JWT claims
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
    });

    if (!user || !user.is_active) {
      throw new UnauthorizedException('Account not found or has been deactivated.');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      district_id: user.district_id,
      district: user.district,
      state: user.state,
      jurisdiction_scope: user.jurisdiction_scope,
    };
  }
}
