import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { db } from '../prisma/db.js';

@Injectable()
export class NotificationsService {

  async create(
    userId: number,
    type: string,
    title: string,
    message: string,
  ) {
    return db.orm.public.Notification.create({
      userId,
      type,
      title,
      message,
      isRead: false,
    });
  }
  async findAll(userId: number) {
    const notifications = await db.orm.public.Notification.where({
      userId,
    }).all();

    return notifications.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
  }

  async getUnreadCount(userId: number) {
    const notifications = await db.orm.public.Notification.where({
      userId,
      isRead: false,
    }).all();

    return {
      count: notifications.length,
    };
  }

  async markAsRead(id: number, userId: number) {
    const notification = await db.orm.public.Notification.where({
      id,
    }).first();

    if (!notification) {
      throw new NotFoundException('Notifikasi tidak ditemukan');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses ke notifikasi ini',
      );
    }

    const updated = await db.orm.public.Notification.where({
      id,
    }).update({
      isRead: true,
      updatedAt: new Date().toISOString(),
    });

    return {
      message: 'Notifikasi ditandai sudah dibaca',
      notification: updated,
    };
  }

  async markAllAsRead(userId: number) {
    const notifications = await db.orm.public.Notification.where({
      userId,
      isRead: false,
    }).all();

    for (const notification of notifications) {
      await db.orm.public.Notification.where({
        id: notification.id,
      }).update({
        isRead: true,
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      message: 'Semua notifikasi sudah ditandai dibaca',
      count: notifications.length,
    };
  }
}
