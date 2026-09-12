import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { JurisdictionService } from './services/jurisdiction.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('app.jwtSecret') ||
          configService.get<string>('JWT_SECRET') ||
          'dev-jwt-secret-key-change-in-prod';
        const expiresIn =
          configService.get<string>('app.jwtExpiresIn') ||
          configService.get<string>('JWT_EXPIRES_IN') ||
          '7d';

        return {
          secret,
          signOptions: {
            expiresIn,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, RolesGuard, JurisdictionService],
  exports: [AuthService, JwtAuthGuard, RolesGuard, JwtModule, JurisdictionService],
})
export class AuthModule {}
