import { NextResponse } from "next/server";
import { generatePostMatchDrafts, generatePostMatchDraftForMatch } from "@/lib/automatic-articles";
import { getRecentlyFinishedFrenchMatches } from "@/lib/apifootball";
import { serviceSupabase } from "@/lib/push-server";
import { requireAdmin } from "@/lib/newsletter-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }
function retryable(error) { const message=String(error?.message||"").toLowerCase(); return message.includes("fetch failed")||message.includes("apifootball")||message.includes("api-football")||message.includes("tempor")||message.includes("network"); }

async function runBulk({ force = false } = {}) {
  const supabase = serviceSupabase();
  let lastError = null;
  for (let attempt=1; attempt<=3; attempt+=1) {
    try { const result=await generatePostMatchDrafts(supabase,{force}); return NextResponse.json({ok:true,automaticArticles:result,attempts:attempt}); }
    catch(error){ lastError=error; if(!retryable(error)||attempt===3) break; await wait(attempt*800); }
  }
  const raw=String(lastError?.message||"").trim();
  const friendly=/fetch failed|network|apifootball|api-football/i.test(raw)?"API-Football est momentanément indisponible. La génération a été retentée 3 fois. Réessaie dans quelques secondes.":raw||"Génération automatique impossible.";
  return NextResponse.json({ok:false,error:friendly},{status:503});
}

async function runSelected(matchId) {
  const supabase=serviceSupabase();
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt+=1){
    try{
      const result=await getRecentlyFinishedFrenchMatches({days:14});
      if(!result.ok) throw new Error(result.error||"Matchs terminés indisponibles");
      const match=(result.data||[]).find((item)=>String(item.id)===String(matchId));
      if(!match) return NextResponse.json({ok:false,error:"Ce match terminé n'est plus disponible dans le flux API-Football."},{status:404});
      const automaticArticles=await generatePostMatchDraftForMatch(supabase,match);
      return NextResponse.json({ok:true,automaticArticles,attempts:attempt,match:{id:match.id,home:match.home.name,away:match.away.name}});
    }catch(error){ lastError=error; if(!retryable(error)||attempt===3) break; await wait(attempt*800); }
  }
  const raw=String(lastError?.message||"").trim();
  const friendly=/fetch failed|network|apifootball|api-football/i.test(raw)?"API-Football est momentanément indisponible. Réessaie dans quelques secondes.":raw||"Génération automatique impossible.";
  return NextResponse.json({ok:false,error:friendly},{status:503});
}

// Déclenchement automatique serveur uniquement : génération globale autorisée ici.
export async function GET() { return runBulk(); }

// Déclenchement manuel depuis l'administration : un match précis est obligatoire.
export async function POST(request) {
  try {
    await requireAdmin(request);
    const body=await request.json().catch(()=>({}));
    const matchId=String(body?.matchId||"").trim();
    if(!matchId) {
      return NextResponse.json(
        {ok:false,error:"Sélectionne d'abord un match. La génération globale est désactivée depuis l'administration."},
        {status:400}
      );
    }
    return runSelected(matchId);
  } catch (error) {
    return NextResponse.json({ok:false,error:error?.message||"Accès administrateur requis."},{status:401});
  }
}
