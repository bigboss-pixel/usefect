import { db } from './src/prisma/db.js';

const userId = 1;

const userRoles =
  await db.orm.public.UserRole
    .where({ userId })
    .all();

for (const userRole of userRoles) {
  const role =
    await db.orm.public.Role
      .where({
        id: userRole.roleId,
      })
      .first();

  console.log(role);
}
