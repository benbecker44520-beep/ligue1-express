import { unstable_cache } from "next/cache";

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123";

function normalized(value = "") {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export async function getPlayerPhoto(name) {
  if (!name) return { ok: true, data: null };

  try {
    return await unstable_cache(
      async () => {
        const response = await fetch(`${API_BASE}/searchplayers.php?p=${encodeURIComponent(name)}`, {
          cache: "no-store"
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(`TheSportsDB HTTP ${response.status}`);

        const players = Array.isArray(json?.player) ? json.player : [];
        if (!players.length) return { ok: true, data: null };

        const exact = players.find((p) => normalized(p.strPlayer) === normalized(name));
        const player = exact || players[0];
        const image = player?.strCutout || player?.strRender || player?.strThumb || null;

        return {
          ok: true,
          data: image ? {
            image,
            cutout: player?.strCutout || null,
            render: player?.strRender || null,
            thumb: player?.strThumb || null,
            sourceName: player?.strPlayer || name
          } : null
        };
      },
      [`ligue1-player-photo-v54-${normalized(name)}`],
      { revalidate: 604800 }
    )();
  } catch (error) {
    // Une panne de l'API photo ne doit jamais casser la fiche joueur.
    return { ok: false, error: error?.message || "Photo temporairement indisponible" };
  }
}
