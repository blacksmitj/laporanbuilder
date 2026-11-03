import "dotenv/config";
import postgres from "postgres";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:!tkml2026BandungBarat@100.110.120.15:5433/laporanbuilder";

// Connect to default 'postgres' database first to create 'laporanbuilder'
const url = new URL(connectionString);
url.pathname = "/postgres";

async function main() {
  const sql = postgres(url.toString(), { max: 1 });
  try {
    console.log("Memeriksa & membuat database 'laporanbuilder'...");
    const exists = await sql`
      SELECT 1 FROM pg_database WHERE datname = 'laporanbuilder'
    `;
    if (exists.length === 0) {
      await sql.unsafe(`CREATE DATABASE "laporanbuilder";`);
      console.log("✓ Database 'laporanbuilder' berhasil dibuat!");
    } else {
      console.log("ℹ Database 'laporanbuilder' sudah ada.");
    }
  } catch (error) {
    console.error("Gagal membuat database:", error);
  } finally {
    await sql.end();
  }
}

main();

