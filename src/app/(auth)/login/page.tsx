"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, useState, Suspense } from "react";
import { AuthCard } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered");
  const reset = searchParams.get("reset");

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
      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to manage your finances"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {registered === "1" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            Registration successful! Please sign in.
          </div>
        )}

        {reset === "1" && (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
            Password reset successful! Please sign in.
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
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
            className="text-sm text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Forgot password?
          </Link>
        </div>

        <Button type="submit" className="w-full" loading={loading}>
          Sign in
        </Button>

        <div className="relative my-4 flex items-center justify-center">
          <div className="absolute w-full border-t border-slate-800"></div>
          <span className="relative bg-[#0b0f19] px-3 text-xs uppercase text-slate-500">
            Or continue with
          </span>
        </div>

        <Button
          type="button"
          variant="secondary"
          className="w-full flex items-center justify-center gap-2 border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors text-slate-200"
          onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path
              fill="#ea4335"
              d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.83 14.97.75 12 .75 7.7.75 3.99 3.22 2.18 6.81l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
            <path
              fill="#4285f4"
              d="M22.56 12c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.57 2.77c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#fbbc05"
              d="M5.84 13.84c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V6.81H2.18C1.43 8.3 1 9.97 1 11.75s.43 3.45 1.18 4.94l3.66-2.85z"
            />
            <path
              fill="#34a853"
              d="M12 22.75c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.28 7.7 22.75 12 22.75z"
            />
          </svg>
          Google
        </Button>

        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-medium text-emerald-400 transition-colors hover:text-emerald-300"
          >
            Create one
          </Link>
        </p>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[200px] items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
