import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import "./globals.css";
import { BackgroundParticles } from "@/components/background-particles";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { site } from "@/lib/site";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
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
    colorPrimary: "#e3000b",
    colorText: "#172554",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-poppins), system-ui, sans-serif",
  },
};

/**
 * `frFR` avec un intitulé maison sur le bouton d'enregistrement du nom dans
 * l'onglet Compte (« Mettre à jour le profil » de Clerk devient « Enregistrer »,
 * comme partout ailleurs sur le site). Sa position reste celle décidée par Clerk :
 * l'onglet Compte est son écran natif, pas un des nôtres.
 */
const clerkLocalization = {
  ...frFR,
  userProfile: {
    ...frFR.userProfile,
    start: {
      ...frFR.userProfile!.start,
      profileSection: {
        ...frFR.userProfile!.start!.profileSection,
        primaryButton: "Enregistrer",
      },
    },
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <BackgroundParticles />
        <ClerkProvider
          localization={clerkLocalization}
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
