export const PROFILE_KEY = "ligue1-express-supporter-profile-v1";
export const VOTER_KEY = "ligue1-express-supporter-voter-v1";
export const CLUB_KEY = "ligue1-express-my-club-v1";
export const ALERTS_KEY = "ligue1-express-alert-preferences-v1";

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}

export function localMemberData() {
  let voterToken = localStorage.getItem(VOTER_KEY);
  if (!voterToken) {
    voterToken = crypto.randomUUID();
    localStorage.setItem(VOTER_KEY, voterToken);
  }
  return {
    voterToken,
    profile: readJson(PROFILE_KEY),
    favoriteClub: readJson(CLUB_KEY),
    alertPreferences: readJson(ALERTS_KEY)
  };
}

export function storeMemberProfile(row) {
  if (!row) return null;
  const profile = { id: row.profile_id, nickname: row.nickname };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(VOTER_KEY, row.voter_token);
  if (row.favorite_club) localStorage.setItem(CLUB_KEY, JSON.stringify(row.favorite_club));
  if (row.alert_preferences && Object.keys(row.alert_preferences).length) localStorage.setItem(ALERTS_KEY, JSON.stringify(row.alert_preferences));
  return profile;
}

export async function loadMemberProfile(supabase) {
  const { data: authData } = await supabase.auth.getUser();
  if (!authData?.user) return { user: null, profile: null };
  const { data, error } = await supabase.rpc("get_my_supporter_profile");
  if (error || !data?.[0]) return { user: authData.user, profile: null, error };
  storeMemberProfile(data[0]);
  return { user: authData.user, profile: data[0] };
}
