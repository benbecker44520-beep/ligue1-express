import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getSiteUrl } from "@/lib/site";

const siteUrl = getSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Ligue 1 Express — L'actu Ligue 1 en un clin d'œil",
    template: "%s | Ligue 1 Express"
  },
  description: "Actualités, mercato, analyses, résultats, classement, statistiques, clubs et joueurs de Ligue 1.",
  applicationName: "Ligue 1 Express",
  category: "sports",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "Ligue 1 Express",
    title: "Ligue 1 Express",
    description: "Toute la Ligue 1 en un clin d'œil : actualités, résultats, classement, statistiques, clubs et joueurs.",
    images: [{ url: "/logo-ligue1-express.png", width: 131, height: 54, alt: "Ligue 1 Express" }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Ligue 1 Express",
    description: "Toute la Ligue 1 en un clin d'œil."
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
        <main id="contenu">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
