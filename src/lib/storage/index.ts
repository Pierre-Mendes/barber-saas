import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { buildObjectKey, validateImage, type ImageKind } from "./images"

/**
 * Armazenamento de imagens em qualquer serviço compatível com S3:
 * SeaweedFS (padrão do docker-compose), Garage, MinIO, Cloudflare R2 ou AWS S3.
 */

interface StorageConfig {
  endpoint?: string
  region: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
  forcePathStyle: boolean
  publicUrl: string
}

function readConfig(): StorageConfig | null {
  const { S3_ENDPOINT, S3_REGION, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE, STORAGE_PUBLIC_URL } =
    process.env
  if (!S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !STORAGE_PUBLIC_URL) {
    return null
  }
  return {
    endpoint: S3_ENDPOINT || undefined,
    region: S3_REGION || "us-east-1",
    bucket: S3_BUCKET,
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    forcePathStyle: S3_FORCE_PATH_STYLE !== "false",
    publicUrl: STORAGE_PUBLIC_URL.replace(/\/$/, ""),
  }
}

/** Upload habilitado? Sem configuração, o painel aceita só URL de imagem. */
export function isStorageConfigured(): boolean {
  return readConfig() !== null
}

const globalForStorage = globalThis as unknown as { s3?: S3Client; bucketReady?: Promise<void> }

function client(config: StorageConfig): S3Client {
  globalForStorage.s3 ??= new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
  })
  return globalForStorage.s3
}

/** Cria o bucket com leitura pública na primeira vez (as imagens aparecem nas páginas das barbearias). */
async function ensureBucket(config: StorageConfig): Promise<void> {
  globalForStorage.bucketReady ??= (async () => {
    const s3 = client(config)
    try {
      await s3.send(new HeadBucketCommand({ Bucket: config.bucket }))
      return
    } catch {
      await s3.send(new CreateBucketCommand({ Bucket: config.bucket }))
    }
    const policy = {
      Version: "2012-10-17",
      Statement: [
        { Effect: "Allow", Principal: "*", Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${config.bucket}/*`] },
      ],
    }
    // Nem todo provedor aceita policy (no SeaweedFS a leitura pública vem do s3.json).
    await s3.send(new PutBucketPolicyCommand({ Bucket: config.bucket, Policy: JSON.stringify(policy) })).catch(() => undefined)
  })().catch((error) => {
    globalForStorage.bucketReady = undefined
    throw error
  })
  return globalForStorage.bucketReady
}

export class StorageError extends Error {}

/**
 * Valida (formato real e tamanho) e envia a imagem de uma barbearia. Retorna a URL pública.
 * A chave inclui o `tenantId`, então uma barbearia nunca sobrescreve arquivo de outra.
 */
export async function storeTenantImage(tenantId: string, kind: ImageKind, file: File): Promise<string> {
  const config = readConfig()
  if (!config) {
    throw new StorageError("Upload de imagens não está configurado. Use uma URL.")
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  const validation = validateImage(bytes)
  if (!validation.ok) {
    throw new StorageError(validation.error)
  }
  await ensureBucket(config)
  const key = buildObjectKey(tenantId, kind, validation.type.ext)
  await client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: validation.type.mime,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  )
  return `${config.publicUrl}/${key}`
}

/** Remove uma imagem antiga, se ela for deste storage e desta barbearia. Nunca lança erro. */
export async function removeTenantImage(tenantId: string, url: string | null | undefined): Promise<void> {
  const config = readConfig()
  if (!config || !url?.startsWith(`${config.publicUrl}/tenants/${tenantId}/`)) {
    return
  }
  const key = url.slice(config.publicUrl.length + 1)
  await client(config)
    .send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }))
    .catch((error) => console.error("[storage] falha ao remover", key, error))
}

/** Extrai um arquivo não vazio de um campo de formulário. */
export function fileFromForm(formData: FormData, field: string): File | null {
  const value = formData.get(field)
  return value instanceof File && value.size > 0 ? value : null
}
