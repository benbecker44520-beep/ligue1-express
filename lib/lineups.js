import { getFreeMatchLineups, getFrenchLineupCandidates as getFreeLineupCandidates } from "@/lib/free-football";

export async function getMatchLineups(matchId) {
  return getFreeMatchLineups(matchId);
}

export async function getFrenchLineupCandidates() {
  return getFreeLineupCandidates();
}
