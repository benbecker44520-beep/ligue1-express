function stableIndex(match, length) {
  const seed = String(match?.id || `${match?.home?.name}-${match?.away?.name}`);
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  return Math.abs(hash) % length;
}

export function buildEditorialTitle(match) {
  const hs = Number(match.score.home ?? 0);
  const as = Number(match.score.away ?? 0);
  const home = match.home.name;
  const away = match.away.name;
  const winner = hs === as ? null : hs > as ? home : away;
  const loser = hs === as ? null : hs > as ? away : home;
  const goals = (match.events || []).filter((e) => e.type === "goal");
  const reds = (match.events || []).filter((e) => e.type === "red_card");
  const lateGoal = goals.some((e) => Number(e.minute) >= 85);
  const margin = Math.abs(hs - as);
  const total = hs + as;

  let choices;
  if (hs === as && hs === 0) {
    choices = [
      `${home} – ${away} : un duel fermé sans vainqueur`,
      `${home} et ${away} se neutralisent au terme d'un match verrouillé`,
      `Pas de but entre ${home} et ${away} : les défenses ont le dernier mot`,
      `${home} – ${away} : personne ne trouve la faille`
    ];
  } else if (hs === as) {
    choices = [
      `${home} – ${away} : un partage des points au bout du suspense`,
      `${home} et ${away} dos à dos après un match disputé`,
      `Ni ${home}, ni ${away} : les deux équipes se quittent sur un nul`,
      `${home} – ${away} : un nul qui laisse des regrets des deux côtés`
    ];
  } else if (lateGoal) {
    choices = [
      `${winner} arrache la décision face à ${loser} dans les dernières minutes`,
      `Fin de match renversante : ${winner} fait plier ${loser}`,
      `${winner} frappe tard et s'offre ${loser}`,
      `${loser} craque sur la fin, ${winner} repart avec la victoire`
    ];
  } else if (margin >= 3) {
    choices = [
      `${winner} déroule et ne laisse aucune chance à ${loser}`,
      `Démonstration de ${winner} face à ${loser}`,
      `${winner} surclasse ${loser} dans un match à sens unique`,
      `${loser} subit la loi d'un ${winner} sans pitié`
    ];
  } else if (total >= 5) {
    choices = [
      `Festival offensif : ${winner} sort vainqueur face à ${loser}`,
      `${winner} remporte un match spectaculaire contre ${loser}`,
      `Pluie de buts entre ${home} et ${away} : ${winner} a le dernier mot`,
      `${home} – ${away} : ${winner} gagne au terme d'un match fou`
    ];
  } else if (reds.length) {
    choices = [
      `${winner} profite d'un match sous tension pour battre ${loser}`,
      `Match tendu entre ${home} et ${away} : ${winner} s'impose`,
      `${winner} garde la tête froide et fait tomber ${loser}`,
      `${home} – ${away} : ${winner} s'impose dans une rencontre électrique`
    ];
  } else {
    choices = [
      `${winner} fait la différence face à ${loser}`,
      `${winner} s'impose au terme d'un duel accroché contre ${loser}`,
      `${home} – ${away} : ${winner} trouve la clé`,
      `${winner} prend le meilleur sur ${loser}`,
      `${loser} cède face à un ${winner} plus efficace`,
      `${winner} assure l'essentiel contre ${loser}`
    ];
  }

  const headline = choices[stableIndex(match, choices.length)];
  return `${headline} (${hs}-${as})`;
}
