export function normalizeEntityName(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(fc|osc|sc|as|ol|ogc|stade|club|football)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CLUB_ALIASES = {
  "tfc": "toulouse",
  "toulouse fc": "toulouse",
  "losc": "lille",
  "lille osc": "lille",
  "psg": "paris saint germain",
  "paris sg": "paris saint germain",
  "om": "marseille",
  "ol": "lyon",
  "asse": "saint etienne",
  "rc lens": "lens",
  "rcl": "lens",
  "stade rennais": "rennes",
  "srfc": "rennes",
  "ogc nice": "nice",
  "asm": "monaco"
};

function canonicalEntityName(value = "") {
  const raw = String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  if (CLUB_ALIASES[raw]) return CLUB_ALIASES[raw];
  return normalizeEntityName(value);
}

export function sameEntityName(a, b) {
  const na = canonicalEntityName(a);
  const nb = canonicalEntityName(b);
  if (!na || !nb) return false;
  return na === nb || na.includes(nb) || nb.includes(na);
}

export function articleMentions(article, value) {
  const needle = normalizeEntityName(value);
  if (!needle || needle.length < 4) return false;
  const haystack = normalizeEntityName([
    article?.title,
    article?.excerpt,
    article?.content,
    ...(article?.body || [])
  ].filter(Boolean).join(" "));
  return haystack.includes(needle);
}
