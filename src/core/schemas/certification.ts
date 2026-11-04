import { z } from "zod";
import { baseEntitySchema } from "./common";

const yearMonthPattern = /^\d{4}-\d{2}$/;

export const certificationSchema = baseEntitySchema.extend({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  state: z.enum(["earned", "in-progress"]),
  issuedOn: z.string().regex(yearMonthPattern, "issuedOn must be YYYY-MM").nullable(),
  expiresOn: z.string().regex(yearMonthPattern, "expiresOn must be YYYY-MM").nullable(),
  credentialUrl: z.string().url().nullable(),
  credentialId: z.string().max(200).nullable(),
  badgePhotoId: z.string().min(1).nullable(),
  badgeIconKey: z.string().min(1).nullable(),
  progressNote: z.string().max(300).nullable(),
  sortOrder: z.number().int(),
});

export type Certification = z.infer<typeof certificationSchema>;

export const certificationInputSchema = certificationSchema.omit({ id: true, createdAt: true, updatedAt: true });
export type CertificationInput = z.infer<typeof certificationInputSchema>;
