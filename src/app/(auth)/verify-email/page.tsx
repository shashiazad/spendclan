"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState, useEffect, Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? searchParams.get("identifier") ?? "";

  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);

  const displayError = error || (!email ? "Missing email address" : "");

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, token: token.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Verification failed");
        return;
      }

      setSuccess("Email verified successfully! Redirecting to login...");
      setTimeout(() => {
        router.push("/login?registered=1");
      }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0) return;
    setError("");
    setSuccess("");
    setResending(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email }),
      });

      const data = await res.json();

      if (data.attemptsRemaining !== undefined) {
        setAttemptsRemaining(data.attemptsRemaining);
      }

      if (!res.ok) {
        setError(data.error ?? "Failed to resend code");
        return;
      }

      setSuccess("A new verification code has been sent to your email!");
      setCooldown(60);
    } catch {
      setError("Failed to resend code. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthCard
      title="Verify your email"
      subtitle={`Enter the 6-digit code sent to ${email || "your email"}`}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {displayError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400 animate-slide-up">
            {displayError}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 animate-slide-up">
            {success}
          </div>
        )}

        <Input
          label="Verification Code"
          type="text"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="123456"
          required
          maxLength={6}
          pattern="[0-9]{6}"
          className="text-center text-xl font-bold tracking-widest"
          hint="Check your email inbox or spam folder for the 6-digit code"
        />

        <Button type="submit" className="w-full" loading={loading} disabled={!email || token.length !== 6}>
          Verify Email
        </Button>

        <div className="text-center text-sm space-y-2">
          <div>
            <button
              type="button"
              onClick={handleResend}
              disabled={resending || cooldown > 0 || attemptsRemaining === 0}
              className={`font-medium transition-colors ${
                cooldown > 0 || attemptsRemaining === 0
                  ? "text-slate-500 cursor-not-allowed"
                  : "text-emerald-400 hover:text-emerald-300"
              }`}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : "Resend code"}
            </button>
          </div>

          {attemptsRemaining !== null && (
            <p className="text-xs text-slate-400">
              {attemptsRemaining > 0
                ? `${attemptsRemaining} resend attempt${attemptsRemaining > 1 ? "s" : ""} remaining today`
                : "No resend attempts remaining today (Max 3). Please wait 24 hours."}
            </p>
          )}
        </div>
      </form>
    </AuthCard>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
