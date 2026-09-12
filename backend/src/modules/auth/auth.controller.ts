import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@CurrentUser('id') userId: string) {
    return this.authService.getProfile(userId);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @CurrentUser('id') userId: string,
    @Body() dto: any,
  ) {
    return this.authService.updateProfile(userId, dto);
  }

  @Patch('admin/users/:id/jurisdiction')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async adminUpdateJurisdiction(
    @Param('id', ParseUUIDPipe) targetUserId: string,
    @Body() jurisdictionDto: any,
    @CurrentUser() adminUser: any,
  ) {
    return this.authService.adminUpdateJurisdiction(targetUserId, jurisdictionDto, adminUser);
  }

  /**
   * Protected administrative test endpoint to verify RBAC enforcement.
   * Only accessible to PLATFORM_ADMIN. Returns 403 Forbidden for all other roles.
   */
  @Get('admin-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  async adminTest(@CurrentUser() user: any) {
    return {
      message: 'Platform administrator authorization successfully verified.',
      user,
      timestamp: new Date().toISOString(),
    };
  }
}
