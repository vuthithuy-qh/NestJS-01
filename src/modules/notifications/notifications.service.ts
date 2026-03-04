import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification as NotificationEntity, NotificationType } from './entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(NotificationEntity)
    private readonly notifRepo: Repository<NotificationEntity>,
  ) {}

  // Tạo notification broadcast (cho tất cả users)
  async createBroadcast(
    type: NotificationType,
    title: string,
    message: string,
    imageUrl?: string,
  ) {
    const notif = this.notifRepo.create({
      type,
      title,
      message,
      imageUrl: imageUrl ?? undefined,
      user: undefined, // undefined = broadcast
    } as any);
    return this.notifRepo.save(notif);
  }

  // Tạo notification cho 1 user cụ thể
  async createForUser(
    userId: number,
    type: NotificationType,
    title: string,
    message: string,
    imageUrl?: string,
  ) {
    const notif = this.notifRepo.create({
      type,
      title,
      message,
      imageUrl: imageUrl ?? undefined,
      user: { id: userId },
    });
    return this.notifRepo.save(notif);
  }

  // Lấy notifications (broadcast + cá nhân) cho 1 user
  async getMyNotifications(userId: number, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notifRepo.findAndCount({
      where: [
        { user: { id: userId } },  // Notifications riêng
        { user: IsNull() },         // Broadcast notifications
      ],
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      data: notifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Đánh dấu đã đọc
  async markAsRead(notifId: number) {
    const notif = await this.notifRepo.findOne({ where: { id: notifId } });
    if (!notif) throw new NotFoundException('Notification not found');

    notif.isRead = true;
    return this.notifRepo.save(notif);
  }

  // Đánh dấu tất cả đã đọc
  async markAllAsRead(userId: number) {
    await this.notifRepo
      .createQueryBuilder()
      .update(NotificationEntity)
      .set({ isRead: true })
      .where('userId = :userId OR userId IS NULL', { userId })
      .andWhere('isRead = false')
      .execute();

    return { message: 'All notifications marked as read' };
  }

  // Đếm số thông báo chưa đọc
  async getUnreadCount(userId: number) {
    const count = await this.notifRepo.count({
      where: [
        { user: { id: userId }, isRead: false },
        { user: IsNull(), isRead: false },
      ],
    });

    return { unreadCount: count };
  }
}
