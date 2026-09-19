import { db } from './src/prisma/db.js';

async function main() {
  const permissions =
    await db.orm.public.Permission
      .all();

  console.log(
    '\n========== ALL PERMISSIONS ==========\n',
  );

  console.log(permissions);

  console.log(
    '\n========== TOTAL ==========\n',
  );

  console.log(
    `Total permissions: ${permissions.length}`,
  );
}

main()
  .catch((error) => {
    console.error(error);
  });
