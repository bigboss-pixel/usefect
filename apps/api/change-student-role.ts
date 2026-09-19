import { db } from './src/prisma/db.js';

async function main() {
  console.log(
    '\n========== CHANGE USER ROLE ==========\n',
  );

  const userId = 2;
  const studentRoleId = 1;
  const publicRoleId = 5;

  // Hapus role PUBLIC
  const publicUserRole =
    await db.orm.public.UserRole
      .where({
        userId,
        roleId: publicRoleId,
      })
      .first();

  if (publicUserRole) {
    await db.orm.public.UserRole
      .where({
        id: publicUserRole.id,
      })
      .delete();

    console.log(
      'REMOVED: PUBLIC',
    );
  }

  // Cek apakah STUDENT sudah dimiliki
  const existingStudentRole =
    await db.orm.public.UserRole
      .where({
        userId,
        roleId: studentRoleId,
      })
      .first();

  if (!existingStudentRole) {
    await db.orm.public.UserRole.create({
      userId,
      roleId: studentRoleId,
    });

    console.log(
      'ADDED: STUDENT',
    );
  }

  console.log(
    '\n========== SELESAI ==========\n',
  );
}

main()
  .catch((error) => {
    console.error(error);
  });
