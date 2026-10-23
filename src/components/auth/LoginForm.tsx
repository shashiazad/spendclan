"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { GoogleButton, OAUTH_ERRORS } from "@/components/auth/GoogleButton";
import { FormEvent, useState, Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

/** "Registration successful" / "Password reset" banners: the only part that reads the URL. */
function LoginNotice() {
  const searchParams = useSearchParams();
  const oauthError = searchParams.get("error");
  const message =
    oauthError && OAUTH_ERRORS[oauthError]
      ? OAUTH_ERRORS[oauthError]
      : searchParams.get("registered") === "1"
      ? "Registration successful! Please sign in."
      : searchParams.get("reset") === "1"
        ? "Password reset successful! Please sign in."
        : null;
  if (!message) return null;
  const failed = !!(oauthError && OAUTH_ERRORS[oauthError]);
  return (
    <div
      role={failed ? "alert" : "status"}
      className={`rounded-lg border px-4 py-3 text-sm ${
        failed
          ? "border-[var(--expense)]/30 bg-[var(--expense-dim)] text-[var(--expense)]"
          : "border-[var(--income)]/30 bg-[var(--income-dim)] text-[var(--income)]"
      }`}
    >
      {message}
    </div>
  );
}

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        identifier,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid mobile number/email or password");
        setLoading(false);
        return;
      }

      // Force a full page load to propagate session cookies and avoid Next.js router caching issues
      window.location.href = "/groups";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to see your groups and balances"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Only the notice waits for the URL; the form itself is rendered on the server */}
        <Suspense fallback={null}>
          <LoginNotice />
        </Suspense>

        {error && (
          <div className="rounded-lg border border-[var(--expense)]/30 bg-[var(--expense-dim)] px-4 py-3 text-sm text-[var(--expense)]">
            {error}
          </div>
        )}

        <Input
          label="Mobile Number or Email"
          type="text"
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          placeholder="+919876543210 or you@example.com"
          required
          autoComplete="username"
        />

        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
        />

        <div className="flex items-center justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-[var(--income)] transition-colors hover:text-[var(--income)]"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>

        {googleEnabled && <GoogleButton />}

        <p className="text-center text-sm text-[var(--foreground-muted)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-[var(--income)] transition-colors hover:text-[var(--income)]"
          >
            Create one
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}
