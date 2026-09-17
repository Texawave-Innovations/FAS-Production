"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../features/auth/auth-context";

export default function Home() {
  const { status, user, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status === "loading" || status === "unauthenticated") {
    return (
      <div className="flex flex-1 items-center justify-center">
        <span
          aria-hidden
          className="h-6 w-6 animate-spin rounded-full border-2 border-gray-200 border-t-brand-500 dark:border-gray-800 dark:border-t-brand-400"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-theme-md dark:border-gray-800 dark:bg-white/[0.03]">
        <p className="text-theme-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Signed in
        </p>
        <h1 className="mt-1 text-title-sm font-semibold text-gray-900 dark:text-white/90">
          {user?.firstName ? `Welcome, ${user.firstName}` : "Welcome"}
        </h1>
        <dl className="mt-6 flex flex-col gap-3 text-theme-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Email</dt>
            <dd className="text-gray-900 dark:text-white/90">{user?.email}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Organization ID</dt>
            <dd className="text-gray-900 dark:text-white/90">{user?.organizationId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500 dark:text-gray-400">Active plant ID</dt>
            <dd className="text-gray-900 dark:text-white/90">{user?.activePlantId ?? "—"}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => void logout()}
          className="mt-8 w-full rounded-lg border border-gray-300 px-4 py-2.5 text-theme-sm font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
