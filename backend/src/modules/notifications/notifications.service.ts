import { Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationType, UserRole, MembershipStatus } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { OrganizationMembership } from '../organizations/entities/organization-membership.entity';
import { ProjectParticipant } from '../projects/entities/project-participant.entity';

import { District } from '../locations/entities/district.entity';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(OrganizationMembership)
    private readonly memberRepo: Repository<OrganizationMembership>,
    @InjectRepository(ProjectParticipant)
    private readonly participantRepo: Repository<ProjectParticipant>,
    @Optional()
    @InjectRepository(District)
    private readonly districtRepo?: Repository<District>,
  ) {}

  /**
   * Directly notifies a specific user.
   */
  async notifyUser(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceType?: string,
    referenceId?: string,
    districtId?: string,
    district?: string,
  ): Promise<Notification> {
    // Deduplication guard: prevent redundant unread notifications for same reference event
    if (referenceType && referenceId) {
      const existing = await this.notifRepo.findOne({
        where: {
          user_id: userId,
          type,
          reference_type: referenceType,
          reference_id: referenceId,
          is_read: false,
        },
      });
      if (existing) {
        return existing;
      }
    }

    const notif = this.notifRepo.create({
      user_id: userId,
      type,
      title,
      message,
      reference_type: referenceType || null,
      reference_id: referenceId || null,
      district_id: districtId || null,
      district: district || null,
      is_read: false,
    });
    return this.notifRepo.save(notif);
  }

  /**
   * Scoping Level 1: Targeted notification directly to the assigned reviewer.
   */
  async notifyReviewer(
    reviewerId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<Notification> {
    return this.notifyUser(reviewerId, type, title, message, referenceType, referenceId);
  }

  /**
   * District-scoped government notification routing.
   * Authoritative canonical district_id targeting to assigned district officers and state admins.
   * Cross-district broadcasting is strictly prohibited.
   */
  async notifyDistrictOfficers(
    districtOrDistrictId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceType?: string,
    referenceId?: string,
    explicitDistrictId?: string,
    explicitDistrictName?: string,
  ): Promise<Notification[]> {
    let canonicalDistrictId: string | null = explicitDistrictId || null;
    let districtName: string | null = explicitDistrictName || null;

    if (!canonicalDistrictId && districtOrDistrictId) {
      if (this.districtRepo) {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(districtOrDistrictId);
        if (isUuid) {
          const dist = await this.districtRepo.findOne({ where: { id: districtOrDistrictId } });
          if (dist) {
            canonicalDistrictId = dist.id;
            districtName = dist.name;
          } else {
            canonicalDistrictId = districtOrDistrictId;
          }
        } else {
          const dist = await this.districtRepo
            .createQueryBuilder('d')
            .where('LOWER(d.name) = LOWER(:name)', { name: districtOrDistrictId.trim() })
            .getOne();
          if (dist) {
            canonicalDistrictId = dist.id;
            districtName = dist.name;
          } else {
            districtName = districtOrDistrictId;
          }
        }
      } else {
        districtName = districtOrDistrictId;
      }
    }

    if (!canonicalDistrictId) {
      this.logger.warn(
        `Cannot route district notification: no canonical district_id resolved for "${districtOrDistrictId}". Broadcast prevented.`,
      );
      return [];
    }

    // 1. Target District Government Officers strictly assigned to this canonical district_id
    const districtOfficers = await this.userRepo.find({
      where: {
        role: UserRole.GOVERNMENT_OFFICER,
        district_id: canonicalDistrictId,
        is_active: true,
      },
    });

    // 2. Target State-Level Government Admins (state-wide scope, e.g. Jharkhand)
    const stateAdmins = await this.userRepo.find({
      where: {
        role: UserRole.GOVERNMENT_ADMIN,
        is_active: true,
      },
    });

    const targetsMap = new Map<string, User>();
    for (const u of [...districtOfficers, ...stateAdmins]) {
      targetsMap.set(u.id, u);
    }
    const targets = Array.from(targetsMap.values());

    if (targets.length === 0) {
      this.logger.warn(
        `No district officers or state admins found for district_id: ${canonicalDistrictId} (${districtName || ''}). Cross-district broadcast prohibited.`,
      );
      return [];
    }

    const createdNotifications: Notification[] = [];
    for (const officer of targets) {
      const notif = await this.notifyUser(
        officer.id,
        type,
        title,
        message,
        referenceType,
        referenceId,
        canonicalDistrictId,
        districtName || undefined,
      );
      createdNotifications.push(notif);
    }

    return createdNotifications;
  }

  /**
   * Notifies active members belonging to participating organizations in a project.
   */
  async notifyConsortium(
    projectId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<Notification[]> {
    const participants = await this.participantRepo.find({
      where: { project_id: projectId },
    });

    const orgIds = participants.map((p) => p.organization_id);
    if (orgIds.length === 0) return [];

    const memberships = await this.memberRepo
      .createQueryBuilder('mem')
      .where('mem.organization_id IN (:...orgIds)', { orgIds })
      .andWhere('mem.membership_status = :status', { status: MembershipStatus.ACTIVE })
      .getMany();

    const userIds = new Set(memberships.map((m) => m.user_id));

    // Also include active users directly bound via user.organization_id
    const directUsers = await this.userRepo
      .createQueryBuilder('user')
      .where('user.organization_id IN (:...orgIds)', { orgIds })
      .andWhere('user.is_active = true')
      .getMany();
    directUsers.forEach((u) => userIds.add(u.id));

    const notifs: Notification[] = [];

    for (const uId of Array.from(userIds)) {
      const n = await this.notifyUser(uId, type, title, message, referenceType, referenceId);
      notifs.push(n);
    }

    return notifs;
  }

  /**
   * Notifies active members belonging to an organization (e.g., matched educational institution).
   */
  async notifyOrganization(
    organizationId: string,
    type: NotificationType,
    title: string,
    message: string,
    referenceType?: string,
    referenceId?: string,
  ): Promise<Notification[]> {
    const memberships = await this.memberRepo.find({
      where: {
        organization_id: organizationId,
        membership_status: MembershipStatus.ACTIVE,
      },
    });

    const userIds = new Set(memberships.map((m) => m.user_id));

    // Also include active users directly bound via user.organization_id
    const directUsers = await this.userRepo.find({
      where: {
        organization_id: organizationId,
        is_active: true,
      },
    });
    directUsers.forEach((u) => userIds.add(u.id));

    const notifs: Notification[] = [];
    for (const uId of Array.from(userIds)) {
      const n = await this.notifyUser(uId, type, title, message, referenceType, referenceId);
      notifs.push(n);
    }

    return notifs;
  }

  /**
   * Returns user notifications sorted chronologically + unread count.
   * For district officers, enforces strict jurisdiction isolation so notifications
   * from other districts are never accessible.
   */
  async getUserNotifications(
    userId: string,
    limit = 50,
  ): Promise<{ notifications: any[]; unreadCount: number }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    const qb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId', { userId });

    if (user?.role === UserRole.GOVERNMENT_OFFICER && user.district_id) {
      qb.andWhere('(n.district_id IS NULL OR n.district_id = :distId)', {
        distId: user.district_id,
      });
    }

    const notifications = await qb
      .orderBy('n.created_at', 'DESC')
      .take(limit)
      .getMany();

    const countQb = this.notifRepo
      .createQueryBuilder('n')
      .where('n.user_id = :userId AND n.is_read = false', { userId });

    if (user?.role === UserRole.GOVERNMENT_OFFICER && user.district_id) {
      countQb.andWhere('(n.district_id IS NULL OR n.district_id = :distId)', {
        distId: user.district_id,
      });
    }

    const unreadCount = await countQb.getCount();

    const enriched = notifications.map((n) => {
      let actionUrl: string | undefined;
      if (n.reference_type === 'CHALLENGE' && n.reference_id) {
        actionUrl = `/challenges/${n.reference_id}`;
      } else if (n.reference_type === 'PROJECT' && n.reference_id) {
        actionUrl = `/projects/${n.reference_id}`;
      } else if (n.reference_type === 'MILESTONE' && n.reference_id) {
        actionUrl = `/projects/${n.reference_id}`;
      } else if (n.reference_type === 'IMPACT' && n.reference_id) {
        actionUrl = `/projects/${n.reference_id}`;
      } else if (n.reference_type === 'EOI') {
        actionUrl = `/my-eois`;
      } else if (n.reference_type === 'PROBLEM_CLUSTER' && n.reference_id) {
        actionUrl = `/reviewer-queue?cluster=${n.reference_id}`;
      } else if (n.reference_type === 'VERIFICATION' && n.reference_id) {
        actionUrl = `/reviewer-queue?item=${n.reference_id}`;
      } else if (n.reference_type === 'REVIEW') {
        actionUrl = `/reviewer-queue`;
      }
      return {
        ...n,
        action_url: actionUrl,
      };
    });

    return { notifications: enriched, unreadCount };
  }

  /**
   * Marks a single notification as read, ensuring strict user isolation.
   */
  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notif = await this.notifRepo.findOne({
      where: { id, user_id: userId },
    });

    if (!notif) {
      throw new NotFoundException('Notification not found or access denied.');
    }

    notif.is_read = true;
    return this.notifRepo.save(notif);
  }

  /**
   * Bulk marks all unread notifications as read for the authenticated user only.
   */
  async markAllAsRead(userId: string): Promise<{ affected: number }> {
    const result = await this.notifRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ is_read: true })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false')
      .execute();

    return { affected: result.affected || 0 };
  }
}
