import { getPublishedPredictions } from "@/lib/predictions";
import { getPublicSupporterEntries, getSupporterLeaderboards } from "@/lib/supporter-leaderboard";
import SupporterDashboard from "@/components/SupporterDashboard";

export const revalidate = 0;
export const metadata = {
  title: "Mon espace supporter",
  description: "Retrouve tes pronostics, tes points, tes séries et tes badges Ligue 1 Express."
};

export default async function SupporterProfilePage() {
  const predictions = await getPublishedPredictions();
  const [entries, leaderboards] = await Promise.all([
    getPublicSupporterEntries(),
    getSupporterLeaderboards(predictions)
  ]);
  const publicPredictions = predictions.map((prediction) => ({
    matchId: String(prediction.match_id),
    homeTeam: prediction.home_team,
    awayTeam: prediction.away_team,
    matchDate: prediction.match_date,
    outcome: prediction.outcome,
    homeScore: prediction.match?.score?.home ?? null,
    awayScore: prediction.match?.score?.away ?? null
  }));

  return <SupporterDashboard entries={entries} predictions={publicPredictions} general={leaderboards.general} weekly={leaderboards.weekly} />;
}
