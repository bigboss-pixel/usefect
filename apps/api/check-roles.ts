import { db } from './src/prisma/db.js';

async function main() {
  const roles =
    await db.orm.public.Role.all();

  console.log(
    '\n========== ROLES ==========\n',
  );

  console.log(roles);
}

main()
  .catch((error) => {
    console.error(error);
  });
