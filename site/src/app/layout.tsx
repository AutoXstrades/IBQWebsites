import type { Metadata } from "next";
import { Outfit, Syne } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"] });
const syne = Syne({ variable: "--font-syne", subsets: ["latin"] });
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "IBQ — I Build Quality websites", template: "%s | IBQ" },
  description: "Quality websites you own. Pay once, launch right, and skip the monthly hosting bill.",
  applicationName: "IBQ Websites",
  appleWebApp: { title: "IBQ Websites" },
  openGraph: { title:"I Build Quality websites.", description:"Quality websites you own." },
  twitter: { card:"summary", title:"I Build Quality websites.", description:"Quality websites you own." },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="en" className={`${outfit.variable} ${syne.variable}`}><body>{children}</body></html>;
}
