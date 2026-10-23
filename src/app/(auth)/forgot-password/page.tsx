"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }

      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle="We'll send you a reset link if the email exists"
    >
      {success ? (
        <div className="space-y-5 text-center">
          <div className="rounded-lg border border-[var(--income)]/30 bg-[var(--income-dim)] px-4 py-3 text-sm text-[var(--income)]">
            If an account exists with that email, a reset link has been sent.
            Check your inbox.
          </div>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-[var(--income)] transition-colors hover:text-[var(--income)]"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-[var(--expense)]/30 bg-[var(--expense-dim)] px-4 py-3 text-sm text-[var(--expense)]">
              {error}
            </div>
          )}

          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />

          <Button type="submit" className="w-full" loading={loading}>
            Send reset link
          </Button>

          <div className="flex flex-col items-center gap-2 text-sm">
            <Link
              href="/reset-password-qa"
              className="text-[var(--income)] transition-colors hover:text-[var(--income)]"
            >
              Reset via security question
            </Link>
            <Link
              href="/login"
              className="text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground-muted)]"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
