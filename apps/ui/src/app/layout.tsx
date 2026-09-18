import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Merriweather } from "next/font/google";
import Script from "next/script";
import { ToastProvider } from "../components/Toast";
import { AuthProvider } from "../features/auth/auth-context";
import { QueryProvider } from "../lib/query-client";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jetbrainsMono = JetBrains_Mono({ variable: "--font-jetbrains-mono", subsets: ["latin"] });
const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "FAS ERP",
  description: "FAS ERP — production planning, inventory, and operations.",
};

// Resolves the persisted theme-mode ('light' | 'dark' | 'auto', default
// 'auto') to the `.dark` class on <html> before first paint, so there's no
// flash of the wrong theme. See docs/FAS_ERP_DESIGN_SYSTEM.md §2.
const themeInitScript = `(function () {
  try {
    var mode = localStorage.getItem('theme-mode') || 'auto';
    var isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
  } catch (e) {}
})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} ${merriweather.variable} h-full antialiased`}
      // The theme-init script below adds/removes `.dark` on this element
      // before hydration (to avoid a flash of the wrong theme) — that's an
      // intentional, expected mismatch from SSR's className, not a bug.
      suppressHydrationWarning
    >
      <head>
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <ToastProvider>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
          </QueryProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
