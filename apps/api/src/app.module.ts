import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { HealthService } from './health.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { StudentsModule } from './students/students.module.js';
import { LecturersModule } from './lecturers/lecturers.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { BooksModule } from './books/books.module.js';
import { BookCopiesModule } from './book-copies/book-copies.module.js';
import { LoansModule } from './loans/loans.module.js';
import { RolesModule } from './roles/roles.module.js';
import { AdminManagementModule } from './admin-management/admin-management.module.js';
import { MembersModule } from './members/members.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { ReservationsModule } from './reservations/reservations.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { MemberQrModule } from './member-qr/member-qr.module.js';
import { LibrarySettingsModule } from './library-settings/library-settings.module.js';
import { AiModule } from './ai/ai.module.js';
import { AuditLogModule } from './audit-log/audit-log.module.js';
import { OpacModule } from './opac/opac.module.js';
import { EBooksModule } from './ebooks/ebooks.module.js';
import { DexModule } from './dex/dex.module.js';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    StudentsModule,
    LecturersModule,
    CategoriesModule,
    BooksModule,
    BookCopiesModule,
    LoansModule,
    RolesModule,
    AdminManagementModule,
    MembersModule,
    PermissionsModule,
    ReservationsModule,
    NotificationsModule,
    MemberQrModule,
    LibrarySettingsModule,
    AiModule,
    AuditLogModule,
    OpacModule,
    EBooksModule,
    DexModule,
  ],
  controllers: [AppController],
  providers: [AppService, HealthService],
})
export class AppModule {}
