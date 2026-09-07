import type { Metadata } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const nunito = Nunito_Sans({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: `${site.name} · ${site.tagline}`,
    template: `%s · ${site.name}`,
  },
  description: site.description,
  openGraph: {
    title: `${site.name} · ${site.tagline}`,
    description: site.description,
    type: "website",
    locale: "fr_FR",
  },
  icons: { icon: "/images/logo-set-et-brique.png" },
};

const clerkAppearance = {
  variables: {
    colorPrimary: "#e63b2e",
    colorText: "#120f5a",
    borderRadius: "0.25rem",
    fontFamily: "var(--font-nunito), system-ui, sans-serif",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          localization={frFR}
          appearance={clerkAppearance}
          signInUrl="/connexion"
          signUpUrl="/inscription"
          signInFallbackRedirectUrl="/compte"
          signUpFallbackRedirectUrl="/compte"
          afterSignOutUrl="/"
        >
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </ClerkProvider>
      </body>
    </html>
  );
}
