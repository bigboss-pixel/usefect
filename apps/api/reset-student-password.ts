import * as bcrypt from 'bcrypt';
import { db } from './src/prisma/db.js';

async function main() {
  const userId = 2;

  const newPassword =
    'student123';

  const passwordHash =
    await bcrypt.hash(
      newPassword,
      10,
    );

  await db.orm.public.User
    .where({ id: userId })
    .update({
      passwordHash,
      updatedAt:
        new Date().toISOString(),
    });

  console.log(
    '\n========== PASSWORD RESET ==========\n',
  );

  console.log(
    'Email: student@test.com',
  );

  console.log(
    `Password: ${newPassword}`,
  );

  console.log(
    '\n========== SELESAI ==========\n',
  );
}

main()
  .catch((error) => {
    console.error(error);
  });
