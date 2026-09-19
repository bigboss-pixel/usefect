import { db } from './src/prisma/db.js';

const permissions = [
  {
    code: 'LOAN_VIEW_OWN',
    description:
      'Melihat peminjaman milik sendiri',
  },
  {
    code: 'LOAN_CANCEL',
    description:
      'Membatalkan peminjaman buku',
  },
  {
    code: 'LOAN_REJECT',
    description:
      'Menolak permintaan peminjaman',
  },
  {
    code: 'LOAN_STATISTICS',
    description:
      'Melihat statistik peminjaman',
  },
];

async function main() {
  console.log(
    '\n========== ADD LOAN PERMISSIONS ==========\n',
  );

  for (const permission of permissions) {
    const existingPermission =
      await db.orm.public.Permission
        .where({
          code: permission.code,
        })
        .first();

    if (existingPermission) {
      console.log(
        `SKIP: ${permission.code} sudah ada`,
      );

      continue;
    }

    const createdPermission =
      await db.orm.public.Permission.create({
        code: permission.code,
        description: permission.description,
      });

    console.log(
      `CREATED: ${createdPermission.code}`,
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
