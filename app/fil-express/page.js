import Link from "next/link";
import { EXPRESS_CATEGORIES, expressMeta, getExpressFeed } from "@/lib/express-feed";

export const revalidate = 0;

function timeOf(value) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" }).format(new Date(value));
}
function dayOf(value) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" }).format(new Date(value));
}

export default async function FilExpressPage() {
  const items = await getExpressFeed({ limit: 100 });
  let currentDay = "";
  return <div className="page-shell express-page">
    <section className="express-hero"><div><span className="eyebrow">LIGUE 1 EXPRESS · EN CONTINU</span><h1>⚡ Fil Express</h1><p>Les infos qui comptent, publiées à la minute par la rédaction.</p></div><div className="express-live-dot"><i></i> ACTUALISÉ EN CONTINU</div></section>
    <div className="express-category-row">{Object.entries(EXPRESS_CATEGORIES).map(([key, meta]) => <span key={key}>{meta.icon} {meta.label}</span>)}</div>
    <section className="express-timeline">
      {items.length === 0 ? <div className="editorial-empty"><span className="eyebrow">FIL EXPRESS</span><h3>Le fil est prêt</h3><p>Les premières brèves publiées depuis l'administration apparaîtront ici.</p></div> : items.map(item => {
        const day = dayOf(item.published_at); const showDay = day !== currentDay; currentDay = day; const meta = expressMeta(item.category);
        const content = <><div className="express-time">{timeOf(item.published_at)}</div><div className="express-dot"></div><article><div className="express-item-meta"><span>{meta.icon} {meta.label}</span>{item.club_name && <b>{item.club_name}</b>}{item.player_name && <b>{item.player_name}</b>}</div><h2>{item.title}</h2>{item.body && <p>{item.body}</p>}{item.link_url && <strong className="express-read">En savoir plus →</strong>}</article></>;
        return <div key={item.id}>{showDay && <div className="express-day">{day}</div>}{item.link_url ? <Link href={item.link_url} className="express-item">{content}</Link> : <div className="express-item">{content}</div>}</div>;
      })}
    </section>
  </div>;
}
