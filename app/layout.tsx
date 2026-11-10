import type { Metadata } from "next";
import { Inter } from "next/font/google";
import LogoutButton from "@/components/LogoutButton";
import Providers from "@/components/Providers";
import { sitePassword } from "@/lib/auth";

const inter = Inter({ variable: "--font-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Periscope",
  description: "View web apps at a glance",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body>
        <Providers>
          {children}
          {sitePassword() && <LogoutButton />}
        </Providers>
      </body>
    </html>
  );
}
