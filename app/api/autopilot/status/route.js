import { NextResponse } from "next/server";
import { serviceSupabase } from "@/lib/push-server";
import { requireAdmin } from "@/lib/newsletter-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    await requireAdmin(request);
    const supabase = serviceSupabase();
    const now = Date.now();
    const since = new Date(now - 86400000).toISOString();
    const [heartbeat, engine, predictionEngine, articles, automaticPredictions, events] = await Promise.all([
      supabase.from("article_automation_runs").select("last_run_at").eq("run_key","autopilot-heartbeat").maybeSingle(),
      supabase.from("article_automation_runs").select("last_run_at").eq("run_key","post-match-articles").maybeSingle(),
      supabase.from("article_automation_runs").select("last_run_at").eq("run_key","automatic-predictions").maybeSingle(),
      supabase.from("articles").select("id,status,generated_at").eq("auto_generated",true).gte("generated_at",since),
      supabase.from("predictions").select("id,status,generated_at").eq("is_automatic",true).gte("generated_at",since),
      supabase.from("live_notification_events").select("event_type,created_at").gte("created_at",since)
    ]);
    const heartbeatAt = heartbeat.data?.last_run_at || null;
    const age = heartbeatAt ? now - new Date(heartbeatAt).getTime() : null;
    const rows = articles.data || [];
    const eventRows = events.data || [];
    return NextResponse.json({
      ok:true,
      autopilot:{status:age != null && age < 300000 ? "healthy" : "attention",autonomous:true,humanReviewRequired:false,heartbeatAt,heartbeatAgeSeconds:age == null ? null : Math.max(0,Math.round(age/1000)),postMatchEngineAt:engine.data?.last_run_at || null,predictionEngineAt:predictionEngine.data?.last_run_at || null},
      last24h:{articlesGenerated:rows.length,articlesPublished:rows.filter(a=>a.status==="published").length,predictionsGenerated:(automaticPredictions.data || []).length,eventsProcessed:eventRows.length,articleNotifications:eventRows.filter(e=>e.event_type==="article_published").length,lineups:eventRows.filter(e=>e.event_type==="lineup").length}
    });
  } catch (error) {
    return NextResponse.json({ok:false,error:error?.message || "Etat Autopilot indisponible."},{status:500});
  }
}
