"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function ResetPasswordQaPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStep1(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        `/api/auth/reset-password-qa?email=${encodeURIComponent(email)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not retrieve security question");
        return;
      }

      if (!data.question) {
        setError("No security question found for this account");
        return;
      }

      setQuestion(data.question);
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleStep2(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, answer, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Password reset failed");
        return;
      }

      router.push("/login?reset=1");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Security question reset"
      subtitle={
        step === 1
          ? "Enter your email to retrieve your security question"
          : "Answer your security question to set a new password"
      }
    >
      {step === 1 ? (
        <form onSubmit={handleStep1} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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
            Continue
          </Button>

          <div className="flex flex-col items-center gap-2 text-sm">
            <Link
              href="/forgot-password"
              className="text-emerald-400 transition-colors hover:text-emerald-300"
            >
              Reset via email instead
            </Link>
            <Link
              href="/login"
              className="text-slate-400 transition-colors hover:text-slate-300"
            >
              Back to sign in
            </Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handleStep2} className="space-y-5">
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="rounded-lg border border-slate-700 bg-slate-800/50 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Security question
            </p>
            <p className="mt-1 text-sm text-slate-200">{question}</p>
          </div>

          <Input
            label="Your answer"
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Security answer"
            required
          />

          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <Input
            label="Confirm password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat password"
            required
            minLength={8}
            autoComplete="new-password"
          />

          <div className="flex gap-3">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setStep(1);
                setError("");
                setAnswer("");
                setPassword("");
                setConfirmPassword("");
              }}
            >
              Back
            </Button>
            <Button type="submit" className="flex-1" loading={loading}>
              Reset password
            </Button>
          </div>
        </form>
      )}
    </AuthCard>
  );
}
