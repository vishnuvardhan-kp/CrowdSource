import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../lib/auth-context";
import { I18nProvider } from "../lib/i18n";
import { Navbar } from "./components/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SamadhanSetu | Societal Innovation Collaboration Platform",
  description:
    "A societal innovation collaboration platform connecting citizens, AI analysis, universities, industry partners, and government impact analytics.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#FAF9F6] text-stone-900 min-h-screen flex flex-col selection:bg-emerald-100 selection:text-emerald-900`}>
        <AuthProvider>
          <I18nProvider>
            <Navbar />
            <div className="flex-1">{children}</div>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
