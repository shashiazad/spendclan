"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

/** "Or continue with Google". Only rendered when Google sign-in is configured on the server. */
export function GoogleButton({ label = "Continue with Google" }: { label?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function go() {
    setPending(true);
    setError(null);
    try {
      // Redirects to Google; on return NextAuth sends the user to /groups
      await signIn("google", { callbackUrl: "/groups" });
    } catch {
      setError("Couldn't reach Google. Check your connection and try again.");
      setPending(false);
    }
  }

  return (
    <>
      <div className="my-4 flex items-center gap-3" role="presentation">
        <span className="h-px flex-1 bg-[var(--border)]" />
        <span className="text-xs uppercase text-[var(--foreground-subtle)]">Or</span>
        <span className="h-px flex-1 bg-[var(--border)]" />
      </div>
      <button
        type="button"
        onClick={go}
        disabled={pending}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--foreground)] transition-colors hover:border-[var(--border-hover)] disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#ea4335" d="M12 5.04c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.83 14.97.75 12 .75 7.7.75 3.99 3.22 2.18 6.81l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          <path fill="#4285f4" d="M22.56 12c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31l3.57 2.77c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#fbbc05" d="M5.84 13.84c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V6.81H2.18C1.43 8.3 1 9.97 1 11.75s.43 3.45 1.18 4.94l3.66-2.85z" />
          <path fill="#34a853" d="M12 22.75c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.28 7.7 22.75 12 22.75z" />
        </svg>
        {pending ? "Opening Google…" : label}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-[var(--expense)]">{error}</p>}
    </>
  );
}

/** Messages NextAuth puts in ?error= after a failed Google sign-in. */
export const OAUTH_ERRORS: Record<string, string> = {
  OAuthSignin: "Google sign-in couldn't start. Please try again.",
  OAuthCallback: "Google sign-in didn't complete. Please try again.",
  OAuthAccountNotLinked: "This email is already registered. Sign in with your password instead.",
  AccessDenied: "Google sign-in was cancelled or isn't allowed for this account.",
  Configuration: "Google sign-in isn't set up correctly on the server.",
  Callback: "Google sign-in didn't complete. Please try again.",
};
