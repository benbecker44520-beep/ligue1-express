import { mapApiFootballMatch } from "@/lib/apifootball";

const API_BASE = "https://apiv3.apifootball.com/";
const COMPETITIONS = [
  { slug: "ligue-des-champions", name: "Ligue des champions", shortName: "LDC", tests: ["champions league", "uefa champions"] },
  { slug: "europa-league", name: "Europa League", shortName: "UEL", tests: ["europa league", "uefa europa"] },
  { slug: "conference-league", name: "Conference League", shortName: "UECL", tests: ["conference league", "europa conference"] }
];
const FRENCH = ["paris saint germain","psg","marseille","monaco","lille","lyon","nice","rennes","lens","strasbourg","nantes","toulouse","brest","auxerre","lorient","le havre","metz","montpellier","reims","saint etienne","angers","paris fc","bordeaux","caen","guingamp","amiens","nancy","sochaux"];

function norm(v){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\b(fc|afc|sc|osc|ac|club|football|foot|olympique|stade)\b/g," ").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();}
function competition(raw){const n=norm(raw?.league_name);return COMPETITIONS.find(c=>c.tests.some(t=>n.includes(t)))||null;}
function frenchSide(raw){const h=norm(raw?.match_hometeam_name),a=norm(raw?.match_awayteam_name);const yes=n=>FRENCH.map(norm).some(f=>f===n||f.includes(n)||n.includes(f));return yes(h)?"home":yes(a)?"away":null;}
async function request(from,to){const key=String(process.env.APIFOOTBALL_API_KEY||"").trim();if(!key)return{ok:false,error:"APIfootball non configurée"};const q=new URLSearchParams({action:"get_events",from,to,timezone:"Europe/Paris",APIkey:key});try{const r=await fetch(`${API_BASE}?${q}`,{headers:{Accept:"application/json"},cache:"no-store"});const j=await r.json().catch(()=>null);if(!r.ok||!Array.isArray(j))return{ok:false,error:j?.error||j?.message||`APIfootball HTTP ${r.status}`};return{ok:true,data:j};}catch(e){return{ok:false,error:e?.message||"APIfootball indisponible"};}}
function iso(d){return d.toISOString().slice(0,10);}
export async function getFrenchEuropeanMatches(){const now=new Date();const from=new Date(now);from.setUTCMonth(from.getUTCMonth()-2);const to=new Date(now);to.setUTCMonth(to.getUTCMonth()+5);const result=await request(iso(from),iso(to));if(!result.ok)return result;const matches=result.data.flatMap(raw=>{const c=competition(raw),side=frenchSide(raw);if(!c||!side)return[];const m=mapApiFootballMatch(raw);return[{...m,league:{...m.league,...c,european:true},leagueName:c.name,european:true,frenchClubSide:side}];}).sort((a,b)=>a.timestamp-b.timestamp);return{ok:true,data:matches,competitions:COMPETITIONS};}
