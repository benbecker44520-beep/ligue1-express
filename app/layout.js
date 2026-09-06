import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import AppExperience from "@/components/AppExperience";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Foot Français Express — Sans perdre une minute",
    template: "%s | Foot Français Express"
  },
  description: "Actualités, mercato, pronostics, résultats, classements et statistiques du football français : Ligue 1, Ligue 2 et Ligue 3.",
  applicationName: "Foot Français Express",
  category: "sports",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Foot Français Express",
    title: "Foot Français Express",
    description: "L'actualité du football français, sans perdre une minute : championnats, mercato, pronostics, résultats et statistiques.",
    images: [{ url: "/logo-foot-francais-express.svg", width: 360, height: 112, alt: "Foot Français Express" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Foot Français Express",
    description: "L'actualité du football français, sans perdre une minute."
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png"
  },
  manifest: "/manifest.webmanifest"
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#071a46"
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <a className="skip-link" href="#contenu">Aller au contenu</a>
        <Header />
        <AnalyticsTracker />
        <main id="contenu">{children}</main>
        <Footer />
        <AppExperience />
      </body>
    </html>
  );
}
