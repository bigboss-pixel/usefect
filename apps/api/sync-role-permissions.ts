import { db } from './src/prisma/db.js';

const rolePermissions: Record<string, string[]> = {
  STUDENT: [
  'BOOK_VIEW',
  'LOAN_VIEW_OWN',
  'LOAN_CREATE',
  'LOAN_CANCEL',
  ],

  LECTURER: [
  'BOOK_VIEW',
  'LOAN_VIEW_OWN',
  'LOAN_CREATE',
  'LOAN_CANCEL',
  ],

  LIBRARIAN: [
    'BOOK_VIEW',
    'BOOK_CREATE',
    'BOOK_UPDATE',
    'BOOK_DELETE',

    'CATEGORY_VIEW',
    'CATEGORY_CREATE',
    'CATEGORY_UPDATE',
    'CATEGORY_DELETE',

    'BOOK_COPY_VIEW',
    'BOOK_COPY_CREATE',
    'BOOK_COPY_UPDATE',
    'BOOK_COPY_DELETE',

    'LOAN_VIEW',
    'LOAN_APPROVE',
    'LOAN_REJECT',
    'LOAN_RETURN',
    'LOAN_STATISTICS',

    'STUDENT_VIEW',
    'LECTURER_VIEW',

    'USER_VIEW',
  ],

  ADMIN: [],

  PUBLIC: [
    'BOOK_VIEW',
  ],
};

async function main() {
  console.log(
    '\n========== SYNC ROLE PERMISSIONS ==========\n',
  );

  const allPermissions =
    await db.orm.public.Permission.all();

  const permissionMap = new Map(
    allPermissions.map((permission) => [
      permission.code,
      permission,
    ]),
  );

  const adminPermissions =
    allPermissions.map(
      (permission) => permission.code,
    );

  rolePermissions.ADMIN = adminPermissions;

  for (
    const [roleName, permissionCodes]
    of Object.entries(rolePermissions)
  ) {
    console.log(`\nROLE: ${roleName}`);

    const role =
      await db.orm.public.Role
        .where({
          name: roleName,
        })
        .first();

    if (!role) {
      console.log(
        `ERROR: Role ${roleName} tidak ditemukan`,
      );

      continue;
    }

    for (const permissionCode of permissionCodes) {
      const permission =
        permissionMap.get(permissionCode);

      if (!permission) {
        console.log(
          `ERROR: Permission ${permissionCode} tidak ditemukan`,
        );

        continue;
      }

      const existingRolePermission =
        await db.orm.public.RolePermission
          .where({
            roleId: role.id,
            permissionId: permission.id,
          })
          .first();

      if (existingRolePermission) {
        console.log(
          `SKIP: ${permissionCode}`,
        );

        continue;
      }

      await db.orm.public.RolePermission.create({
        roleId: role.id,
        permissionId: permission.id,
      });

      console.log(
        `ADDED: ${permissionCode}`,
      );
    }
  }

  console.log(
    '\n========== SYNC SELESAI ==========\n',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
