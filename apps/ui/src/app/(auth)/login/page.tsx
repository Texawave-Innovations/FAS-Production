import type { Metadata } from "next";
import { LoginForm } from "../../../features/auth/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in — FAS ERP",
};

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6 sm:py-16">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-md sm:p-8 dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="mb-8 flex flex-col gap-1.5">
          <h1 className="text-title-sm font-semibold text-gray-900 dark:text-white/90">
            Sign in to FAS ERP
          </h1>
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            Enter your credentials to access your workspace.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
