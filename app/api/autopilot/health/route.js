import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { serviceSupabase } from "@/lib/push-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_HASH = "60c7aac49a913b27596842bfcbc0710ff275901e54d6f3a7cf5817280b547595";
function authorized(request) {
  const expected=String(process.env.CRON_SECRET||"").trim();
  const received=String(request.headers.get("authorization")||"").replace(/^Bearer\s+/i,"").trim();
  if(!received) return false;
  if(expected && expected===received) return true;
  return createHash("sha256").update(received).digest("hex")===TOKEN_HASH;
}

export async function GET(request) {
  if(!authorized(request)) return NextResponse.json({error:"Acces refuse."},{status:401});
  const supabase=serviceSupabase();
  const {data}=await supabase.from("article_automation_runs").select("last_run_at").eq("run_key","autopilot-heartbeat").maybeSingle();
  const at=data?.last_run_at || null;
  const age=at ? Date.now()-new Date(at).getTime() : Infinity;
  if(age < 5*60*1000) return NextResponse.json({ok:true,status:"healthy",heartbeatAt:at});
  const tag="autopilot-health-warning";
  const {error:markerError}=await supabase.from("live_notification_events").insert({event_key:tag+":"+new Date().toISOString().slice(0,13),match_id:"system:autopilot",event_type:"autopilot_warning",payload:{heartbeatAt:at}});
  return NextResponse.json({ok:false,status:"attention",heartbeatAt:at,warningRecorded:!markerError},{status:503});
}
