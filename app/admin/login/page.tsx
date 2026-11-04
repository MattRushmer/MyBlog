"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, TextInput } from "@/components/admin/form-controls";

/**
 * Deliberately outside the (authenticated) route group's layout - it must
 * never call requireSession, or signing in would become impossible.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [challengeToken, setChallengeToken] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;
    fetch("/api/admin/session")
      .then((response) => response.json())
      .then((body) => {
        if (isMounted && body?.data?.session) {
          router.replace("/admin");
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [router]);

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Login failed");
        return;
      }
      if (body.data.challengeRequired) {
        setChallengeToken(body.data.challengeToken);
        return;
      }
      router.push("/admin");
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMfa(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/session/mfa", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ challengeToken, code: mfaCode }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error?.message ?? "Verification failed");
        return;
      }
      router.push("/admin");
    } catch {
      setError("Network error - please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <h1 className="mb-6 text-xl font-semibold text-foreground">Admin sign in</h1>

        {!challengeToken ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <Field label="Username">
              <TextInput
                name="username"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleMfa} className="flex flex-col gap-4">
            <p className="text-sm text-muted">Enter the verification code from your authenticator app.</p>
            <Field label="MFA code">
              <TextInput
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify"}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
