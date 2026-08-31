import Image from "next/image";
import Link from "next/link";
import NewsletterForm from "@/components/NewsletterForm";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Image src="/logo-ligue1-express.png" width={131} height={54} alt="Ligue 1 Express" />
          <p>L'actualité du football français, en un clin d'œil.</p>
        </div>
        <div>
          <h3>Navigation</h3>
          <p><Link href="/actualites">Actualités</Link> · <Link href="/championnats">Championnats</Link> · <Link href="/prono">Prono</Link> · <Link href="/mercato">Mercato</Link></p>
        </div>
        <div>
          <h3>Newsletter</h3>
          <NewsletterForm />
        </div>
      </div>
      <div className="footer-bottom">© Ligue 1 Express · Football français</div>
    </footer>
  );
}
