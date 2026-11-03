import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { officials, users } from "@/lib/db/schema";

async function seed() {
  const adminName = process.env.SEED_ADMIN_NAME ?? "Administrator";
  const adminEmail = (
    process.env.SEED_ADMIN_EMAIL ?? "admin@kemnaker.go.id"
  ).toLowerCase();
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD ?? "AdminPassword123!";

  console.log(`[seed] Memeriksa akun administrator (${adminEmail})...`);

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (existing.length === 0) {
    const result = await auth.api.signUpEmail({
      body: {
        name: adminName,
        email: adminEmail,
        password: adminPassword,
      },
    });

    if (result?.user?.id) {
      await db
        .update(users)
        .set({ role: "admin", emailVerified: true })
        .where(eq(users.id, result.user.id));

      console.log(
        `[seed] Akun admin berhasil dibuat: ${adminEmail} (role: admin)`,
      );
    }
  } else {
    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, existing[0].id));
    console.log(
      `[seed] Akun admin sudah ada (${adminEmail}), memastikan role = admin.`,
    );
  }

  const existingOfficials = await db.select().from(officials).limit(1);
  if (existingOfficials.length === 0) {
    await db.insert(officials).values([
      {
        name: "Budi Santoso, S.Sos., M.Si.",
        nip: "198504122010011008",
        position: "Pengantar Kerja Ahli Muda",
        institution: "BBPKK Bandung Barat",
      },
      {
        name: "Siti Rahmawati, S.E.",
        nip: "199008212015032004",
        position: "Analis Tenaga Kerja",
        institution: "Direktorat Bina Perluasan Kesempatan Kerja",
      },
    ]);
    console.log("[seed] Master data petugas awal berhasil ditambahkan.");
  }

  console.log("[seed] Selesai.");
  process.exit(0);
}

seed().catch((error) => {
  console.error("[seed] Gagal melakukan seeding:", error);
  process.exit(1);
});

