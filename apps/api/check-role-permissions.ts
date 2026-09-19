import { db } from './src/prisma/db.js';

async function main() {
  const roles =
    await db.orm.public.Role.all();

  console.log(
    '\n========== ROLE PERMISSIONS ==========\n',
  );

  for (const role of roles) {
    console.log(`\nROLE: ${role.name}`);

    const rolePermissions =
      await db.orm.public.RolePermission
        .where({
          roleId: role.id,
        })
        .all();

    if (rolePermissions.length === 0) {
      console.log('  Tidak ada permission');

      continue;
    }

    for (
      const rolePermission
      of rolePermissions
    ) {
      const permission =
        await db.orm.public.Permission
          .where({
            id: rolePermission.permissionId,
          })
          .first();

      if (permission) {
        console.log(
          `  - ${permission.code}`,
        );
      }
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
  });
