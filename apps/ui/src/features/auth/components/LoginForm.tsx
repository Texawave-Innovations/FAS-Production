// apps/ui/src/features/auth/components/LoginForm.tsx
"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, useAuth } from "../auth-context";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-error-500/20 bg-error-500/10 px-4 py-3 text-theme-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="email"
          className="text-theme-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          disabled={isSubmitting}
          placeholder="you@company.com"
          className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-theme-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors duration-150 focus:border-brand-500 focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-400"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="password"
          className="text-theme-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={isSubmitting}
          placeholder="••••••••"
          className="rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-theme-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors duration-150 focus:border-brand-500 focus:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:bg-white/[0.03] dark:text-white/90 dark:placeholder:text-gray-500 dark:focus:border-brand-400"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-theme-sm font-medium text-white transition-colors duration-150 hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand-400 dark:hover:bg-brand-300 dark:text-gray-950"
      >
        {isSubmitting ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-gray-950/40 dark:border-t-gray-950"
            />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </button>
    </form>
  );
}
