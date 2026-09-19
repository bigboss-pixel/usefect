import { db } from './src/prisma/db.js';

async function main() {
  const users =
    await db.orm.public.User.all();

  console.log('\n========== USERS ==========\n');

  for (const user of users) {
    const userRoles =
      await db.orm.public.UserRole
        .where({
          userId: user.id,
        })
        .all();

    const roles: string[] = [];

    for (const userRole of userRoles) {
      const role =
        await db.orm.public.Role
          .where({
            id: userRole.roleId,
          })
          .first();

      if (role) {
        roles.push(role.name);
      }
    }

    console.log({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      username: user.username,
      isActive: user.isActive,
      roles,
    });
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    process.exit();
  });
