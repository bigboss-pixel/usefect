import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { db } from '../prisma/db.js';

import { CreateEBookDto } from './dto/create-ebook.dto.js';
import { UpdateEBookDto } from './dto/update-ebook.dto.js';
import { EBookQueryDto } from './dto/ebook-query.dto.js';
import { ModerateEBookDto } from './dto/moderate-ebook.dto.js';
import { EbookFileStorage } from './storage/ebook-file.storage.js';

@Injectable()
export class EBooksService {
  constructor(
    private readonly ebookFileStorage: EbookFileStorage,
  ) {}
  // =========================
  // CREATE E-BOOK
  // =========================
  async create(
    userId: number,
    createEBookDto: CreateEBookDto,
  ) {
    const {
      title,
      author,
      isbn,
      publisher,
      publicationYear,
      category,
      language,
      description,
      coverUrl,
      fileUrl,
      fileType,
      license,
      source,
      permissionStatus,
      permissionEvidence,
      permissionGrantedAt,
      translationAllowed,
      downloadAllowed,
      aiRagAllowed,
    } = createEBookDto;

    // Cek ISBN jika diberikan
    if (isbn) {
      const existingEBook =
        await db.orm.public.EBook
          .where({ isbn })
          .first();

      if (existingEBook) {
        throw new BadRequestException(
          'ISBN sudah digunakan',
        );
      }
    }

    const ebook =
      await db.orm.public.EBook
        .create({
          title,
          author,
          isbn: isbn ?? null,
          publisher: publisher ?? null,
          publicationYear:
            publicationYear ?? null,
          category: category ?? null,
          language:
            language ?? 'Indonesia',
          description:
            description ?? null,
          coverUrl: coverUrl ?? null,
          fileUrl: fileUrl ?? null,
          fileType: fileType ?? null,
          license: license ?? null,
          source: source ?? null,
          // Contributor tidak boleh menerbitkan atau
          // mengaktifkan download saat upload.
          accessType: 'READ_ONLY',
          status: 'DRAFT',
          uploadedByUserId: userId,
        });

    return {
      message:
        'E-Book berhasil dibuat',

      ebook: {
        id: ebook.id,
        title: ebook.title,
        author: ebook.author,
        isbn: ebook.isbn,
        publisher: ebook.publisher,
        publicationYear:
          ebook.publicationYear,
        category: ebook.category,
        language: ebook.language,
        description: ebook.description,
        coverUrl: ebook.coverUrl,
        fileUrl: ebook.fileUrl,
        fileType: ebook.fileType,
        license: ebook.license,
        source: ebook.source,
        accessType: ebook.accessType,
        status: ebook.status,
        uploadedByUserId: ebook.uploadedByUserId,
        createdAt: ebook.createdAt,
        updatedAt: ebook.updatedAt,
      },
    };
  }

  // =========================
  // GET ALL E-BOOKS
  // SEARCH + FILTER + PAGINATION
  // =========================
  // =========================
  // GET USER ROLES
  // =========================
  private async getUserRoleNames(
    userId: number,
  ): Promise<string[]> {
    const userRoles =
      await db.orm.public.UserRole
        .where({
          userId,
        })
        .all();

    const roleNames: string[] = [];

    for (const userRole of userRoles) {
      const role =
        await db.orm.public.Role
          .where({
            id: userRole.roleId,
          })
          .first();

      if (role) {
        roleNames.push(role.name);
      }
    }

    return roleNames;
  }

  async findAll(
    params?: EBookQueryDto,
  ) {
    const search =
      params?.search?.trim().toLowerCase();

    const category =
      params?.category?.trim().toLowerCase();

    const language =
      params?.language?.trim().toLowerCase();

    const license =
      params?.license?.trim().toLowerCase();

    const publicationYear =
      params?.publicationYear;

    const status =
      params?.status;

    const accessType =
      params?.accessType;

    const page = Math.max(
      params?.page ?? 1,
      1,
    );

    const limit = Math.min(
      Math.max(
        params?.limit ?? 12,
        1,
      ),
      100,
    );

    const sortBy =
      params?.sortBy ?? 'title';

    const sortOrder =
      params?.sortOrder === 'desc'
        ? 'desc'
        : 'asc';

    let ebooks =
      await db.orm.public.EBook.all();

    // Public collection hanya menampilkan E-Book
    // yang sudah lolos moderasi dan berstatus PUBLISHED.
    ebooks = ebooks.filter(
      (ebook) => ebook.status === 'PUBLISHED',
    );

    // =========================
    // SEARCH
    // =========================
    if (search) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.title
            .toLowerCase()
            .includes(search) ||
          ebook.author
            .toLowerCase()
            .includes(search) ||
          Boolean(
            ebook.isbn
              ?.toLowerCase()
              .includes(search),
          ) ||
          Boolean(
            ebook.description
              ?.toLowerCase()
              .includes(search),
          ),
      );
    }

    // =========================
    // FILTER CATEGORY
    // =========================
    if (category) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.category
            ?.toLowerCase()
            .includes(category),
      );
    }

    // =========================
    // FILTER LANGUAGE
    // =========================
    if (language) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.language
            .toLowerCase()
            .includes(language),
      );
    }

    // =========================
    // FILTER YEAR
    // =========================
    if (
      publicationYear !== undefined
    ) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.publicationYear ===
          publicationYear,
      );
    }

    // =========================
    // FILTER LICENSE
    // =========================
    if (license) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.license
            ?.toLowerCase()
            .includes(license),
      );
    }

    // =========================
    // FILTER STATUS
    // =========================
    if (status) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.status === status,
      );
    }

    // =========================
    // FILTER ACCESS TYPE
    // =========================
    if (accessType) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.accessType ===
          accessType,
      );
    }

    // =========================
    // SORTING
    // =========================
    ebooks.sort((a, b) => {
      let valueA:
        | string
        | number = a.title;

      let valueB:
        | string
        | number = b.title;

      if (sortBy === 'author') {
        valueA = a.author;
        valueB = b.author;
      }

      if (
        sortBy === 'publicationYear'
      ) {
        valueA =
          a.publicationYear ?? 0;

        valueB =
          b.publicationYear ?? 0;
      }

      if (
        typeof valueA === 'string' &&
        typeof valueB === 'string'
      ) {
        const comparison =
          valueA.localeCompare(
            valueB,
          );

        return sortOrder === 'desc'
          ? -comparison
          : comparison;
      }

      const comparison =
        Number(valueA) -
        Number(valueB);

      return sortOrder === 'desc'
        ? -comparison
        : comparison;
    });

    const total =
      ebooks.length;

    const totalPages =
      Math.ceil(total / limit);

    const skip =
      (page - 1) * limit;

    const paginatedEBooks =
      ebooks.slice(
        skip,
        skip + limit,
      );

    const data =
      paginatedEBooks.map(
        (ebook) => ({
          id: ebook.id,
          title: ebook.title,
          author: ebook.author,
          isbn: ebook.isbn,
          publisher: ebook.publisher,
          publicationYear:
            ebook.publicationYear,
          category: ebook.category,
          language: ebook.language,
          description:
            ebook.description,
          coverUrl: ebook.coverUrl,
          fileUrl: ebook.fileUrl,
          fileType: ebook.fileType,
          license: ebook.license,
          source: ebook.source,
          accessType:
            ebook.accessType,
          status: ebook.status,
          uploadedByUserId:
            ebook.uploadedByUserId,
          createdAt:
            ebook.createdAt,
          updatedAt:
            ebook.updatedAt,
        }),
      );

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  // =========================
  // GET MY E-BOOKS
  // =========================
  async findMy(userId: number) {
    const ebooks =
      await db.orm.public.EBook
        .where({
          uploadedByUserId: userId,
        })
        .all();

    return ebooks.map(
      (ebook) => ({
        id: ebook.id,
        title: ebook.title,
        author: ebook.author,
        isbn: ebook.isbn,
        publisher: ebook.publisher,
        publicationYear:
          ebook.publicationYear,
        category: ebook.category,
        language: ebook.language,
        description:
          ebook.description,
        coverUrl: ebook.coverUrl,
        fileUrl: ebook.fileUrl,
        fileType: ebook.fileType,
        license: ebook.license,
        source: ebook.source,
        accessType:
          ebook.accessType,
        status: ebook.status,
        uploadedByUserId:
          ebook.uploadedByUserId,
        createdAt:
          ebook.createdAt,
        updatedAt:
          ebook.updatedAt,
      }),
    );
  }

  // =========================
  // GET ALL E-BOOKS FOR MODERATION
  // ADMIN / SUPER ADMIN ONLY
  // =========================
  async findForModeration(
    userId: number,
    params?: EBookQueryDto,
  ) {
    const roles =
      await this.getUserRoleNames(userId);

    const isAdmin =
      roles.includes('ADMIN');

    const isSuperAdmin =
      roles.includes('SUPER_ADMIN');

    if (!isAdmin && !isSuperAdmin) {
      throw new ForbiddenException(
        'Akses moderasi E-Book hanya untuk Admin atau Super Admin',
      );
    }

    // Moderation memakai koleksi lengkap.
    // Filter dan pagination tetap mengikuti findAll,
    // tetapi tidak membatasi status ke PUBLISHED.
    const search =
      params?.search?.trim().toLowerCase();

    const category =
      params?.category?.trim().toLowerCase();

    const language =
      params?.language?.trim().toLowerCase();

    const status =
      params?.status;

    let ebooks =
      await db.orm.public.EBook.all();

    if (search) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.title
            .toLowerCase()
            .includes(search) ||
          ebook.author
            .toLowerCase()
            .includes(search) ||
          Boolean(
            ebook.isbn
              ?.toLowerCase()
              .includes(search),
          ) ||
          Boolean(
            ebook.description
              ?.toLowerCase()
              .includes(search),
          ),
      );
    }

    if (category) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.category
            ?.toLowerCase()
            .includes(category),
      );
    }

    if (language) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.language
            .toLowerCase()
            .includes(language),
      );
    }

    if (status) {
      ebooks = ebooks.filter(
        (ebook) =>
          ebook.status === status,
      );
    }

    ebooks.sort((a, b) =>
      a.title.localeCompare(b.title),
    );

    return {
      data: ebooks.map(
        (ebook) => ({
          id: ebook.id,
          title: ebook.title,
          author: ebook.author,
          isbn: ebook.isbn,
          publisher: ebook.publisher,
          publicationYear:
            ebook.publicationYear,
          category: ebook.category,
          language: ebook.language,
          description:
            ebook.description,
          coverUrl: ebook.coverUrl,
          fileUrl: ebook.fileUrl,
          fileType: ebook.fileType,
          license: ebook.license,
          source: ebook.source,
          accessType:
            ebook.accessType,
          status:
            ebook.status,
          uploadedByUserId:
            ebook.uploadedByUserId,
          createdAt:
            ebook.createdAt,
          updatedAt:
            ebook.updatedAt,
        }),
      ),
      total: ebooks.length,
    };
  }

  // =========================
  // GET E-BOOK BY ID
  // =========================
  async findOne(id: number) {
    const ebook =
      await db.orm.public.EBook
        .where({ id })
        .first();

    if (
      !ebook ||
      ebook.status !== 'PUBLISHED'
    ) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    return {
      id: ebook.id,
      title: ebook.title,
      author: ebook.author,
      isbn: ebook.isbn,
      publisher: ebook.publisher,
      publicationYear:
        ebook.publicationYear,
      category: ebook.category,
      language: ebook.language,
      description:
        ebook.description,
      coverUrl: ebook.coverUrl,
      fileUrl: ebook.fileUrl,
      fileType: ebook.fileType,
      license: ebook.license,
      source: ebook.source,
      accessType:
        ebook.accessType,
      status: ebook.status,
      uploadedByUserId:
        ebook.uploadedByUserId,
      createdAt:
        ebook.createdAt,
      updatedAt:
        ebook.updatedAt,
    };
  }

  // =========================
  // CHECK E-BOOK ACCESS
  // =========================
  async getAccess(id: number) {
    const ebook =
      await db.orm.public.EBook
        .where({ id })
        .first();

    if (
      !ebook ||
      ebook.status !== 'PUBLISHED'
    ) {
      throw new NotFoundException(
        'E-Book tidak tersedia untuk publik',
      );
    }

    if (!ebook.fileUrl) {
      throw new BadRequestException(
        'File E-Book belum tersedia',
      );
    }

    const legalVerified =
      ebook.permissionStatus === 'VERIFIED';

    const canRead =
      Boolean(ebook.fileUrl) &&
      legalVerified;

    const canDownload =
      legalVerified &&
      ebook.downloadAllowed &&
      (
        ebook.accessType === 'DOWNLOAD' ||
        ebook.accessType === 'READ_AND_DOWNLOAD'
      );

    if (!canRead) {
      throw new ForbiddenException(
        'E-Book belum memiliki izin publik yang terverifikasi',
      );
    }

    const readToken =
      this.ebookFileStorage.createSignedToken(
        ebook.id,
        'read',
        300,
      );

    const fileUrl =
      `/ebooks/${ebook.id}/file?token=${encodeURIComponent(readToken)}`;

    let downloadUrl: string | null = null;

    if (canDownload) {
      const downloadToken =
        this.ebookFileStorage.createSignedToken(
          ebook.id,
          'download',
          300,
        );

      downloadUrl =
        `/ebooks/${ebook.id}/file?token=${encodeURIComponent(downloadToken)}`;
    }

    return {
      id: ebook.id,
      fileType: ebook.fileType,
      accessType: ebook.accessType,
      canRead,
      canDownload,
      fileUrl,
      downloadUrl,
      aiRagAllowed:
        legalVerified && ebook.aiRagAllowed,
    };
  }

  async getFile(
    id: number,
    token: string,
  ) {
    if (!token) {
      throw new BadRequestException(
        'Token file wajib disertakan',
      );
    }

    const ebook =
      await db.orm.public.EBook
        .where({ id })
        .first();

    if (
      !ebook ||
      ebook.status !== 'PUBLISHED'
    ) {
      throw new NotFoundException(
        'E-Book tidak tersedia untuk publik',
      );
    }

    if (!ebook.fileUrl) {
      throw new NotFoundException(
        'File E-Book belum tersedia',
      );
    }

    const decodedToken =
      Buffer.from(
        token.split('.')[0] ?? '',
        'base64url',
      ).toString('utf8');

    let purpose:
      | 'read'
      | 'download';

    try {
      const payload = JSON.parse(
        decodedToken,
      );

      purpose =
        payload.purpose === 'download'
          ? 'download'
          : 'read';
    } catch {
      throw new BadRequestException(
        'Token file tidak valid',
      );
    }

    this.ebookFileStorage.verifySignedToken(
      token,
      id,
      purpose,
    );

    const legalVerified =
      ebook.permissionStatus === 'VERIFIED';

    if (!legalVerified) {
      throw new ForbiddenException(
        'Izin E-Book belum terverifikasi',
      );
    }

    if (
      purpose === 'download' &&
      (
        !ebook.downloadAllowed ||
        (
          ebook.accessType !== 'DOWNLOAD' &&
          ebook.accessType !== 'READ_AND_DOWNLOAD'
        )
      )
    ) {
      throw new ForbiddenException(
        'Download E-Book tidak diizinkan',
      );
    }

    const file =
      this.ebookFileStorage.openFile(
        ebook.fileUrl,
      );

    const contentType =
      ebook.fileType?.toLowerCase() === 'pdf'
        ? 'application/pdf'
        : ebook.fileType?.toLowerCase() === 'epub'
          ? 'application/epub+zip'
          : 'application/octet-stream';

    return {
      stream: file.stream,
      size: file.size,
      contentType,
      disposition:
        purpose === 'download'
          ? 'attachment'
          : 'inline',
    };
  }

  // =========================
  // SUBMIT E-BOOK FOR REVIEW
  // OWNER ONLY
  // =========================
  async submitForReview(
    id: number,
    userId: number,
  ) {
    const ebook =
      await db.orm.public.EBook
        .where({ id })
        .first();

    if (!ebook) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    if (
      ebook.uploadedByUserId !== userId
    ) {
      throw new ForbiddenException(
        'Hanya pemilik E-Book yang dapat mengajukan review',
      );
    }

    if (ebook.status !== 'DRAFT') {
      throw new BadRequestException(
        `E-Book dengan status ${ebook.status} tidak dapat diajukan untuk review`,
      );
    }

    const updatedEBook =
      await db.orm.public.EBook
        .where({ id })
        .update({
          status: 'PENDING_REVIEW',
          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedEBook) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    return {
      message:
        'E-Book berhasil diajukan untuk review',
      ebook: {
        id: updatedEBook.id,
        title: updatedEBook.title,
        status: updatedEBook.status,
        uploadedByUserId:
          updatedEBook.uploadedByUserId,
        updatedAt:
          updatedEBook.updatedAt,
      },
    };
  }

  // =========================
  // MODERATE E-BOOK
  // ADMIN / SUPER ADMIN ONLY
  // =========================
  async moderate(
    id: number,
    userId: number,
    moderateEBookDto: ModerateEBookDto,
  ) {
    const ebook =
      await db.orm.public.EBook
        .where({ id })
        .first();

    if (!ebook) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    const roles =
      await this.getUserRoleNames(userId);

    const isAdmin =
      roles.includes('ADMIN');

    const isSuperAdmin =
      roles.includes('SUPER_ADMIN');

    if (!isAdmin && !isSuperAdmin) {
      throw new ForbiddenException(
        'Moderasi E-Book hanya untuk Admin atau Super Admin',
      );
    }

    const {
      status,
      accessType,
    } = moderateEBookDto;

    if (
      status === undefined &&
      accessType === undefined &&
      moderateEBookDto.permissionStatus === undefined &&
      moderateEBookDto.permissionEvidence === undefined &&
      moderateEBookDto.translationAllowed === undefined &&
      moderateEBookDto.downloadAllowed === undefined &&
      moderateEBookDto.aiRagAllowed === undefined
    ) {
      throw new BadRequestException(
        'Tidak ada perubahan moderasi yang diberikan',
      );
    }

    // =====================================================
    // STATUS WORKFLOW
    // =====================================================
    // Status hanya boleh bergerak melalui alur moderasi
    // yang telah ditentukan. Admin tidak dapat melompati
    // proses verifikasi secara sembarangan.
    if (status !== undefined) {
      const allowedTransitions: Record<string, string[]> = {
        DRAFT: [
          'PENDING_REVIEW',
        ],
        PENDING_REVIEW: [
          'DRAFT',
          'LICENSE_VERIFIED',
        ],
        LICENSE_VERIFIED: [
          'DRAFT',
          'TRANSLATING',
          'PUBLISHED',
        ],
        TRANSLATING: [
          'DRAFT',
          'TRANSLATION_REVIEW',
        ],
        TRANSLATION_REVIEW: [
          'DRAFT',
          'PUBLISHED',
        ],
        PUBLISHED: [
          'SUSPENDED',
        ],
        SUSPENDED: [
          'DRAFT',
        ],
      };

      const allowed =
        allowedTransitions[ebook.status] ?? [];

      if (!allowed.includes(status)) {
        throw new BadRequestException(
          `Transisi status tidak diizinkan: ${ebook.status} → ${status}`,
        );
      }
    }

    const updatedEBook =
      await db.orm.public.EBook
        .where({ id })
        .update({
          status:
            status !== undefined
              ? status
              : ebook.status,

          accessType:
            accessType !== undefined
              ? accessType
              : ebook.accessType,

          permissionStatus:
            moderateEBookDto.permissionStatus !== undefined
              ? moderateEBookDto.permissionStatus
              : ebook.permissionStatus,

          permissionEvidence:
            moderateEBookDto.permissionEvidence !== undefined
              ? moderateEBookDto.permissionEvidence
              : ebook.permissionEvidence,

          translationAllowed:
            moderateEBookDto.translationAllowed !== undefined
              ? moderateEBookDto.translationAllowed
              : ebook.translationAllowed,

          downloadAllowed:
            moderateEBookDto.downloadAllowed !== undefined
              ? moderateEBookDto.downloadAllowed
              : ebook.downloadAllowed,

          aiRagAllowed:
            moderateEBookDto.aiRagAllowed !== undefined
              ? moderateEBookDto.aiRagAllowed
              : ebook.aiRagAllowed,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedEBook) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    return {
      message:
        'Moderasi E-Book berhasil diperbarui',

      ebook: {
        id: updatedEBook.id,
        title: updatedEBook.title,
        author: updatedEBook.author,
        accessType:
          updatedEBook.accessType,
        status:
          updatedEBook.status,
        uploadedByUserId:
          updatedEBook.uploadedByUserId,
        updatedAt:
          updatedEBook.updatedAt,
      },
    };
  }

  // =========================
  // UPDATE E-BOOK
  // =========================
  async update(
    id: number,
    userId: number,
    updateEBookDto: UpdateEBookDto,
  ) {
    const ebook =
      await db.orm.public.EBook
        .where({ id })
        .first();

    if (!ebook) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    const isOwner =
      ebook.uploadedByUserId === userId;

    if (!isOwner) {
      throw new ForbiddenException(
        'Anda hanya dapat mengubah E-Book yang Anda tambahkan sendiri',
      );
    }

    const {
      title,
      author,
      isbn,
      publisher,
      publicationYear,
      category,
      language,
      description,
      coverUrl,
      fileUrl,
      fileType,
      license,
      source,
    } = updateEBookDto;

    // Cek ISBN jika diubah
    if (
      isbn !== undefined &&
      isbn !== ebook.isbn
    ) {
      const existingEBook =
        await db.orm.public.EBook
          .where({ isbn })
          .first();

      if (existingEBook) {
        throw new BadRequestException(
          'ISBN sudah digunakan',
        );
      }
    }

    const updatedEBook =
      await db.orm.public.EBook
        .where({ id })
        .update({
          title:
            title !== undefined
              ? title
              : ebook.title,

          author:
            author !== undefined
              ? author
              : ebook.author,

          isbn:
            isbn !== undefined
              ? isbn
              : ebook.isbn,

          publisher:
            publisher !== undefined
              ? publisher
              : ebook.publisher,

          publicationYear:
            publicationYear !==
            undefined
              ? publicationYear
              : ebook.publicationYear,

          category:
            category !== undefined
              ? category
              : ebook.category,

          language:
            language !== undefined
              ? language
              : ebook.language,

          description:
            description !== undefined
              ? description
              : ebook.description,

          coverUrl:
            coverUrl !== undefined
              ? coverUrl
              : ebook.coverUrl,

          fileUrl:
            fileUrl !== undefined
              ? fileUrl
              : ebook.fileUrl,

          fileType:
            fileType !== undefined
              ? fileType
              : ebook.fileType,

          license:
            license !== undefined
              ? license
              : ebook.license,

          source:
            source !== undefined
              ? source
              : ebook.source,

          // Hak akses dan status moderasi hanya
          // dapat diubah melalui endpoint moderasi.
          accessType:
            ebook.accessType,

          status:
            ebook.status,

          updatedAt:
            new Date().toISOString(),
        });

    if (!updatedEBook) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    return {
      message:
        'E-Book berhasil diperbarui',

      ebook: {
        id: updatedEBook.id,
        title: updatedEBook.title,
        author: updatedEBook.author,
        isbn: updatedEBook.isbn,
        publisher:
          updatedEBook.publisher,
        publicationYear:
          updatedEBook.publicationYear,
        category:
          updatedEBook.category,
        language:
          updatedEBook.language,
        description:
          updatedEBook.description,
        coverUrl:
          updatedEBook.coverUrl,
        fileUrl:
          updatedEBook.fileUrl,
        fileType:
          updatedEBook.fileType,
        license:
          updatedEBook.license,
        source:
          updatedEBook.source,
        accessType:
          updatedEBook.accessType,
        status:
          updatedEBook.status,
        uploadedByUserId:
          updatedEBook.uploadedByUserId,
        createdAt:
          updatedEBook.createdAt,
        updatedAt:
          updatedEBook.updatedAt,
      },
    };
  }

  // =========================
  // DELETE E-BOOK
  // =========================
  async remove(
    id: number,
    userId: number,
  ) {
    const ebook =
      await db.orm.public.EBook
        .where({ id })
        .first();

    if (!ebook) {
      throw new NotFoundException(
        'E-Book tidak ditemukan',
      );
    }

    const roles =
      await this.getUserRoleNames(userId);

    const isAdmin =
      roles.includes('ADMIN');

    const isSuperAdmin =
      roles.includes('SUPER_ADMIN');

    const isOwner =
      ebook.uploadedByUserId === userId;

    if (
      !isOwner &&
      !isAdmin &&
      !isSuperAdmin
    ) {
      throw new ForbiddenException(
        'Anda hanya dapat menghapus E-Book yang Anda tambahkan sendiri',
      );
    }

    await db.orm.public.EBook
      .where({ id })
      .delete();

    return {
      message:
        'E-Book berhasil dihapus',
    };
  }
}
