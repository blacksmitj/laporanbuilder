import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CreateBucketCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), ".local-storage");

function getStorageConfig() {
  return {
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    region: process.env.S3_REGION?.trim() || "us-east-1",
    accessKeyId: process.env.S3_ACCESS_KEY_ID?.trim() || "",
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY?.trim() || "",
    bucket: process.env.S3_BUCKET_NAME?.trim() || "laporanbuilder",
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
  };
}

let cachedS3Client: S3Client | null = null;
let bucketEnsured = false;

function getS3Client(): S3Client | null {
  const cfg = getStorageConfig();
  if (!cfg.endpoint || !cfg.accessKeyId || !cfg.secretAccessKey) {
    return null;
  }
  if (!cachedS3Client) {
    cachedS3Client = new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.region,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey,
      },
      forcePathStyle: cfg.forcePathStyle,
    });
  }
  return cachedS3Client;
}

async function ensureBucketExists(client: S3Client, bucket: string) {
  if (bucketEnsured) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    bucketEnsured = true;
  } catch {
    try {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
      bucketEnsured = true;
    } catch {
      // Ignore if bucket already exists or creation is managed externally
    }
  }
}

export const storageKeys = {
  reportSourceExcel(reportId: string, batchId: string, ext = ".xlsx") {
    const cleanExt = ext.startsWith(".") ? ext : `.${ext}`;
    return `reports/${reportId}/source/${batchId}/original${cleanExt}`;
  },
  participantDocument(
    reportId: string,
    participantId: string,
    docType: string,
    ext: string,
  ) {
    const cleanExt = ext.startsWith(".") ? ext : `.${ext}`;
    return `reports/${reportId}/participants/${participantId}/${docType}${cleanExt}`;
  },
  reportPdfVersion(reportId: string, version: number) {
    return `reports/${reportId}/pdf/v${version}.pdf`;
  },
};

export async function putStorageObject(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ storageKey: string }> {
  const cfg = getStorageConfig();
  const client = getS3Client();

  if (client) {
    try {
      await ensureBucketExists(client, cfg.bucket);
      await client.send(
        new PutObjectCommand({
          Bucket: cfg.bucket,
          Key: params.key,
          Body: params.body,
          ContentType: params.contentType,
        }),
      );
      return { storageKey: params.key };
    } catch (error) {
      console.warn(
        "[storage] S3 upload gagal, menyimpan ke fallback lokal (.local-storage):",
        error,
      );
    }
  }

  const localPath = path.join(LOCAL_STORAGE_ROOT, ...params.key.split("/"));
  await mkdir(path.dirname(localPath), { recursive: true });
  await writeFile(localPath, params.body);
  return { storageKey: params.key };
}

export async function getStorageObjectBuffer(key: string): Promise<Buffer> {
  const cfg = getStorageConfig();
  const client = getS3Client();

  if (client) {
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: cfg.bucket,
          Key: key,
        }),
      );
      if (response.Body) {
        const bytes = await response.Body.transformToByteArray();
        return Buffer.from(bytes);
      }
    } catch {
      // Fallback to local file if S3 read fails
    }
  }

  const localPath = path.join(LOCAL_STORAGE_ROOT, ...key.split("/"));
  return readFile(localPath);
}

export async function getSignedDownloadUrl(
  key: string,
  expiresInSeconds = 300,
): Promise<string | null> {
  const cfg = getStorageConfig();
  const client = getS3Client();
  if (!client) return null;

  try {
    const command = new GetObjectCommand({
      Bucket: cfg.bucket,
      Key: key,
    });
    return await getSignedUrl(client, command, {
      expiresIn: expiresInSeconds,
    });
  } catch {
    return null;
  }
}

