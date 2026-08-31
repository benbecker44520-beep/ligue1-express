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

export function sameEntityName(a, b) {
  const na = normalizeEntityName(a);
  const nb = normalizeEntityName(b);
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
