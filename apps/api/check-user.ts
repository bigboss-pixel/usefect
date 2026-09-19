import { db } from './src/prisma/db.js';

async function main() {
  const user =
    await db.orm.public.User
      .where({
        id: 2,
      })
      .first();

  console.log('\n========== USER ==========\n');

  console.log(user);

  console.log('\n========== USER ROLES ==========\n');

  const userRoles =
    await db.orm.public.UserRole
      .where({
        userId: 2,
      })
      .all();

  for (const userRole of userRoles) {
    const role =
      await db.orm.public.Role
        .where({
          id: userRole.roleId,
        })
        .first();

    console.log({
      userId: userRole.userId,
      roleId: userRole.roleId,
      roleName: role?.name,
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
  });