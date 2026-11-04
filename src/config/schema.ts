import { z } from "zod";

/**
 * Only the active branch (local or aws) is required. This lets the app run
 * locally with zero AWS values present, and fails fast with readable errors
 * when a required var for the active mode is missing.
 */
export const deployTargetSchema = z.enum(["local", "aws"]);

export const localEnvSchema = z.object({
  ADMIN_USERNAME: z.string().min(1, "ADMIN_USERNAME is required in local mode"),
  ADMIN_PASSWORD_HASH: z
    .string()
    .min(1, "ADMIN_PASSWORD_HASH is required in local mode (generate with scripts/hash-password.ts)"),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  DATA_DIR: z.string().min(1).default("./data"),
  UPLOADS_DIR: z.string().min(1).default("./data/uploads"),
});

export const awsEnvSchema = z.object({
  AWS_REGION: z.string().min(1).default("ap-southeast-2"),
  CONTENT_TABLE_NAME: z.string().min(1, "CONTENT_TABLE_NAME is required in aws mode"),
  ISR_TABLE_NAME: z.string().min(1, "ISR_TABLE_NAME is required in aws mode"),
  PHOTOS_BUCKET_NAME: z.string().min(1, "PHOTOS_BUCKET_NAME is required in aws mode"),
  CDN_DOMAIN: z.string().min(1, "CDN_DOMAIN is required in aws mode"),
  COGNITO_USER_POOL_ID: z.string().min(1, "COGNITO_USER_POOL_ID is required in aws mode"),
  COGNITO_CLIENT_ID: z.string().min(1, "COGNITO_CLIENT_ID is required in aws mode"),
  COGNITO_CLIENT_SECRET: z.string().optional(),
});

export const sharedEnvSchema = z.object({
  DEPLOY_TARGET: deployTargetSchema.default("local"),
  SITE_URL: z.string().url().default("http://localhost:3000"),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().default(15 * 1024 * 1024),
  UPLOAD_TICKET_TTL_SECONDS: z.coerce.number().int().positive().default(5 * 60),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(12 * 60 * 60),
});

export type LocalEnv = z.infer<typeof localEnvSchema>;
export type AwsEnv = z.infer<typeof awsEnvSchema>;
export type SharedEnv = z.infer<typeof sharedEnvSchema>;
