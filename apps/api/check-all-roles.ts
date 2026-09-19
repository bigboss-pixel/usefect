import { db } from './src/prisma/db.js';

async function main() {
  const roles =
    await db.orm.public.Role
      .all();

  console.log(roles);
}

main();
