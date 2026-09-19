import { db } from './src/prisma/db.js';

async function main() {
  console.log(
    '\n========== REMOVE LOAN_VIEW ==========\n',
  );

  const roleNames = [
    'STUDENT',
    'LECTURER',
  ];

  const permission =
    await db.orm.public.Permission
      .where({
        code: 'LOAN_VIEW',
      })
      .first();

  if (!permission) {
    console.log(
      'Permission LOAN_VIEW tidak ditemukan',
    );

    return;
  }

  for (const roleName of roleNames) {
    const role =
      await db.orm.public.Role
        .where({
          name: roleName,
        })
        .first();

    if (!role) {
      console.log(
        `Role ${roleName} tidak ditemukan`,
      );

      continue;
    }

    const rolePermission =
      await db.orm.public.RolePermission
        .where({
          roleId: role.id,
          permissionId: permission.id,
        })
        .first();

    if (!rolePermission) {
      console.log(
        `SKIP: ${roleName} tidak memiliki LOAN_VIEW`,
      );

      continue;
    }

    await db.orm.public.RolePermission
      .where({
        id: rolePermission.id,
      })
      .delete();

    console.log(
      `REMOVED: LOAN_VIEW dari ${roleName}`,
    );
  }

  console.log(
    '\n========== SELESAI ==========\n',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });