import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import postgres from "postgres";

function logSuccess(msg: string) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function logError(msg: string, err?: unknown) {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
  if (err) {
    if (err instanceof Error) {
      console.error(`  [Penyebab] : ${err.message}`);
      const errWithCode = err as { code?: string; errno?: number | string; syscall?: string; $metadata?: { httpStatusCode?: number } };
      if (errWithCode.code) console.error(`  [Kode Error]: ${errWithCode.code}`);
      if (errWithCode.syscall) console.error(`  [Syscall]   : ${errWithCode.syscall}`);
      if (errWithCode.$metadata?.httpStatusCode) console.error(`  [HTTP Status]: ${errWithCode.$metadata.httpStatusCode}`);
      
      // Diagnostik ramah pengguna
      if (errWithCode.code === "ECONNREFUSED") {
        console.error("  💡 Solusi: Server/service tidak sedang berjalan atau port salah. Pastikan service sudah dinyalakan.");
      } else if (errWithCode.code === "ETIMEDOUT") {
        console.error("  💡 Solusi: Koneksi timeout. Periksa IP/host, firewall, atau jaringan.");
      } else if (errWithCode.code === "28P01") {
        console.error("  💡 Solusi (PostgreSQL): Password atau username salah (password authentication failed).");
      } else if (errWithCode.code === "3D000") {
        console.error("  💡 Solusi (PostgreSQL): Nama database tidak ditemukan. Periksa nama DB di DATABASE_URL.");
      } else if (err.name === "InvalidAccessKeyId" || err.name === "SignatureDoesNotMatch") {
        console.error("  💡 Solusi (S3/MinIO): Access Key ID atau Secret Access Key tidak valid.");
      } else if (err.name === "NoSuchBucket") {
        console.error("  💡 Solusi (S3/MinIO): Bucket belum dibuat di MinIO/RustFS. Buat bucket terlebih dahulu.");
      }
    } else {
      console.error("  Detail:", err);
    }
  }
}

function logInfo(msg: string) {
  console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
}

async function testPostgres() {
  console.log("\n==============================");
  console.log("  Testing PostgreSQL...");
  console.log("==============================");

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logError("DATABASE_URL tidak ditemukan di environment (.env)!");
    return false;
  }

  // Mask credentials in log
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ":****@");
  logInfo(`Connecting to: ${maskedUrl}`);

  let sql: ReturnType<typeof postgres> | null = null;
  try {
    sql = postgres(databaseUrl, {
      max: 1,
      connect_timeout: 5,
    });

    const result = await sql`SELECT NOW() as current_time, current_database() as db_name, version();`;
    const row = result[0];

    logSuccess("Koneksi PostgreSQL BERHASIL!");
    console.log(`  - Database : ${row.db_name}`);
    console.log(`  - Server Time: ${row.current_time}`);
    console.log(`  - Version    : ${String(row.version).split(" on ")[0]}`);
    return true;
  } catch (error) {
    logError("Koneksi PostgreSQL GAGAL!", error);
    return false;
  } finally {
    if (sql) {
      await sql.end({ timeout: 2 });
    }
  }
}

async function testMinio() {
  console.log("\n==============================");
  console.log("  Testing MinIO / S3 / RustFS...");
  console.log("==============================");

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
  const bucket = process.env.S3_BUCKET_NAME || "laporanbuilder";
  const region = process.env.S3_REGION || "us-east-1";
  const forcePathStyle = process.env.S3_FORCE_PATH_STYLE !== "false";

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    logError("Konfigurasi S3 belum lengkap di .env:");
    console.log(`  - S3_ENDPOINT: ${endpoint ? "OK" : "MISSING"}`);
    console.log(`  - S3_ACCESS_KEY_ID: ${accessKeyId ? "OK" : "MISSING"}`);
    console.log(`  - S3_SECRET_ACCESS_KEY: ${secretAccessKey ? "OK" : "MISSING"}`);
    return false;
  }

  logInfo(`Connecting to: ${endpoint} (Bucket: ${bucket})`);

  const s3 = new S3Client({
    endpoint,
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle,
  });

  try {
    // 1. List Buckets
    logInfo("1. Mengambil daftar bucket...");
    const listRes = await s3.send(new ListBucketsCommand({}));
    logSuccess("Koneksi ke endpoint MinIO/S3 BERHASIL!");
    const bucketNames = (listRes.Buckets || []).map((b) => b.Name);
    console.log(`  - Daftar Bucket: ${bucketNames.length > 0 ? bucketNames.join(", ") : "(belum ada bucket)"}`);

    // 2. Test Write (PutObject)
    const testKey = `_connection_test_${Date.now()}.txt`;
    const testContent = "Koneksi MinIO / RustFS berhasil diverifikasi.";
    logInfo(`2. Menguji write (upload file test: ${testKey})...`);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: testKey,
        Body: Buffer.from(testContent),
        ContentType: "text/plain",
      })
    );
    logSuccess(`Upload ke bucket '${bucket}' BERHASIL!`);

    // 3. Test Read (GetObject)
    logInfo("3. Menguji read (download file test)...");
    const getRes = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: testKey,
      })
    );
    const readBody = await getRes.Body?.transformToString();
    if (readBody === testContent) {
      logSuccess("Read file test BERHASIL dan isi data cocok!");
    } else {
      logError("Read file test gagal mencocokkan isi data.");
    }

    // 4. Cleanup
    logInfo("4. Membersihkan file test...");
    await s3.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: testKey,
      })
    );
    logSuccess("Cleanup file test BERHASIL!");

    return true;
  } catch (error) {
    logError("Koneksi / Operasi MinIO/S3 GAGAL!", error);
    return false;
  }
}

async function run() {
  console.log("Menjalankan verifikasi koneksi PostgreSQL & MinIO/RustFS...");
  const pgOk = await testPostgres();
  const minioOk = await testMinio();

  console.log("\n==============================");
  console.log("  HASIL AKHIR RINGKASAN");
  console.log("==============================");
  console.log(`PostgreSQL       : ${pgOk ? "\x1b[32mTERHUBUNG\x1b[0m" : "\x1b[31mGAGAL\x1b[0m"}`);
  console.log(`MinIO / RustFS   : ${minioOk ? "\x1b[32mTERHUBUNG\x1b[0m" : "\x1b[31mGAGAL\x1b[0m"}`);
  console.log("==============================\n");

  if (!pgOk || !minioOk) {
    process.exit(1);
  }
}

run();

