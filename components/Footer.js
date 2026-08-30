import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <Image src="/logo-ligue1-express.png" width={131} height={54} alt="Ligue 1 Express" />
          <p>L'actualité de la Ligue 1, en un clin d'œil.</p>
        </div>
        <div>
          <h3>Navigation</h3>
          <p><Link href="/actualites">Actualités</Link> · <Link href="/mercato">Mercato</Link> · <Link href="/analyses">Analyses</Link></p>
        </div>
        <div>
          <h3>Newsletter</h3>
          <div className="newsletter">
            <input aria-label="Adresse e-mail" placeholder="Ton e-mail" />
            <button>S'inscrire</button>
          </div>
        </div>
      </div>
      <div className="footer-bottom">© Ligue 1 Express · Prototype V1</div>
    </footer>
  );
}
