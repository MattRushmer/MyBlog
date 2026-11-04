"use client";

import { useState, type FormEvent } from "react";
import type { Certification } from "@/core/schemas/certification";
import { Button } from "@/components/ui/Button";
import { Field, TextArea, TextInput, Select } from "@/components/admin/form-controls";
import { CoverPhotoPicker } from "@/components/admin/photos/CoverPhotoPicker";
import type { PhotoViewModel } from "@/components/admin/photos/types";

interface CertificationFormProps {
  readonly initialCertification?: Certification;
  readonly initialPhotos: readonly PhotoViewModel[];
  readonly maxUploadBytes: number;
  readonly nextSortOrder: number;
  readonly onSaved: (certification: Certification) => void;
  readonly onCancel: () => void;
}

const YEAR_MONTH_PATTERN = /^\d{4}-\d{2}$/;

function toYearMonthOrNull(value: string): string | null {
  const trimmed = value.trim();
  return YEAR_MONTH_PATTERN.test(trimmed) ? trimmed : null;
}

export function CertificationForm({
  initialCertification,
  initialPhotos,
  maxUploadBytes,
  nextSortOrder,
  onSaved,
  onCancel,
}: CertificationFormProps) {
  const [name, setName] = useState(initialCertification?.name ?? "");
  const [issuer, setIssuer] = useState(initialCertification?.issuer ?? "");
  const [state, setState] = useState<Certification["state"]>(initialCertification?.state ?? "earned");
  const [issuedOn, setIssuedOn] = useState(initialCertification?.issuedOn ?? "");
  const [expiresOn, setExpiresOn] = useState(initialCertification?.expiresOn ?? "");
  const [credentialUrl, setCredentialUrl] = useState(initialCertification?.credentialUrl ?? "");
  const [credentialId, setCredentialId] = useState(initialCertification?.credentialId ?? "");
  const [badgePhotoId, setBadgePhotoId] = useState<string | null>(initialCertification?.badgePhotoId ?? null);
  const [progressNote, setProgressNote] = useState(initialCertification?.progressNote ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const payload = {
      name,
      issuer,
      state,
      issuedOn: toYearMonthOrNull(issuedOn),
      expiresOn: toYearMonthOrNull(expiresOn),
      credentialUrl: credentialUrl.trim() || null,
      credentialId: credentialId.trim() || null,
      badgePhotoId,
      badgeIconKey: initialCertification?.badgeIconKey ?? null,
      progressNote: progressNote.trim() || null,
      sortOrder: initialCertification?.sortOrder ?? nextSortOrder,
    };

    setIsSubmitting(true);
    try {
      const endpoint = initialCertification ? `/api/admin/certifications/${initialCertification.id}` : "/api/admin/certifications";
      const response = await fetch(endpoint, {
        method: initialCertification ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Failed to save certification");
        return;
      }
      onSaved(body.data as Certification);
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-token border border-border bg-surface p-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Name">
          <TextInput required value={name} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Issuer">
          <TextInput required value={issuer} onChange={(event) => setIssuer(event.target.value)} />
        </Field>
      </div>

      <Field label="State">
        <Select value={state} onChange={(event) => setState(event.target.value as Certification["state"])}>
          <option value="earned">Earned</option>
          <option value="in-progress">In progress</option>
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Issued on" hint="YYYY-MM, leave blank if unknown.">
          <TextInput placeholder="2024-01" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} />
        </Field>
        <Field label="Expires on" hint="YYYY-MM, leave blank if none.">
          <TextInput placeholder="2027-01" value={expiresOn} onChange={(event) => setExpiresOn(event.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Field label="Credential URL">
          <TextInput type="url" value={credentialUrl} onChange={(event) => setCredentialUrl(event.target.value)} />
        </Field>
        <Field label="Credential ID">
          <TextInput value={credentialId} onChange={(event) => setCredentialId(event.target.value)} />
        </Field>
      </div>

      <Field label="Badge image">
        <CoverPhotoPicker
          initialPhotos={initialPhotos}
          selectedId={badgePhotoId}
          onChange={setBadgePhotoId}
          maxUploadBytes={maxUploadBytes}
          uploadKind="asset"
        />
      </Field>

      {state === "in-progress" && (
        <Field label="Progress note">
          <TextArea rows={2} maxLength={300} value={progressNote} onChange={(event) => setProgressNote(event.target.value)} />
        </Field>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save certification"}
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
