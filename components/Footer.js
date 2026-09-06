import Image from "next/image";
import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Image src="/logo-ff-express-v2.svg" width={174} height={54} alt="FF Express" unoptimized />
          <p>L'actualité du football français, sans perdre une minute.</p>
        </div>
        <div>
          <h3>Navigation</h3>
          <p><Link href="/live">LIVE</Link> · <Link href="/actualites">Actualités</Link> · <Link href="/championnats">Championnats</Link> · <Link href="/resultats">Résultats</Link> · <Link href="/stats">Stats</Link> · <Link href="/prono">Prono</Link> · <Link href="/mercato">Mercato</Link></p>
        </div>
        <div>
          <h3>Newsletter</h3>
          <NewsletterForm />
        </div>
      </div>
      <div className="footer-bottom">© Foot Français Express · Football français</div>
    </footer>
  );
}
