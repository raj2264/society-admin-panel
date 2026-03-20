import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "../components/ui/theme-provider";
import { ReactQueryProvider } from "../components/providers/react-query-provider";
import SupabaseProviderClient from "../components/supabase-provider-client";
import { Toaster } from "@/components/ui/toaster";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "MySocietyDetails - Society Admin Panel",
  description: "Manage your society details with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <ReactQueryProvider>
            <SupabaseProviderClient>
              {children}
              <Toaster />
            </SupabaseProviderClient>
          </ReactQueryProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
} 