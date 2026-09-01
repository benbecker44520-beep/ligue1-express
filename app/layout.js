import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ligue 1 Express — Le football français en un clin d'œil",
    template: "%s | Ligue 1 Express"
  },
  description: "Actualités, mercato, pronostics, résultats, classements et statistiques du football français : Ligue 1, Ligue 2 et Ligue 3.",
  applicationName: "Ligue 1 Express",
  category: "sports",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Ligue 1 Express",
    title: "Ligue 1 Express",
    description: "Le football français en un clin d'œil : actualités, championnats, pronostics, résultats et statistiques.",
    images: [{ url: "/logo-ligue1-express.png", width: 131, height: 54, alt: "Ligue 1 Express" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Ligue 1 Express",
    description: "Le football français en un clin d'œil."
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
      </body>
    </html>
  );
}
