"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase";

function localDate() {
  const now=new Date();
  const y=now.getFullYear();
  const m=String(now.getMonth()+1).padStart(2,"0");
  const d=String(now.getDate()).padStart(2,"0");
  return `${y}-${m}-${d}`;
}

export default function AdminAutomaticTrigger() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseClient(), []);
  const [open,setOpen]=useState(false);
  const [running,setRunning]=useState(false);
  const [loading,setLoading]=useState(false);
  const [message,setMessage]=useState("");
  const [date,setDate]=useState(localDate());
  const [matches,setMatches]=useState([]);
  const [matchId,setMatchId]=useState("");

  useEffect(()=>{ setMessage(""); setOpen(false); },[pathname]);
  if(!pathname?.startsWith("/admin")) return null;

  async function token() {
    const {data}=await supabase.auth.getSession();
    const accessToken=data?.session?.access_token;
    if(!accessToken) throw new Error("Reconnecte-toi à l’administration.");
    return accessToken;
  }

  async function loadMatches() {
    if(!supabase||loading) return;
    setLoading(true); setMessage("Recherche des matchs…");
    try {
      const accessToken=await token();
      const response=await fetch(`/api/automatic-articles/candidates?date=${encodeURIComponent(date)}`,{headers:{Authorization:`Bearer ${accessToken}`},cache:"no-store"});
      const json=await response.json().catch(()=>({}));
      if(!response.ok||!json?.ok) throw new Error(json?.error||"Impossible de charger les matchs.");
      const list=json.matches||[];
      setMatches(list);
      setMatchId(list[0]?.id||"");
      setMessage(list.length?`${list.length} match${list.length>1?"s":""} terminé${list.length>1?"s":""} disponible${list.length>1?"s":""}.`:`Aucun match terminé disponible à cette date.`);
    } catch(error) { setMatches([]); setMatchId(""); setMessage(error?.message||"Impossible de charger les matchs."); }
    finally { setLoading(false); }
  }

  async function trigger() {
    if(!supabase||running||!matchId) return;
    setRunning(true); setMessage("Génération du brouillon…");
    try {
      const accessToken=await token();
      const response=await fetch("/api/automatic-articles/check",{method:"POST",headers:{Authorization:`Bearer ${accessToken}`,"Content-Type":"application/json"},body:JSON.stringify({matchId}),cache:"no-store"});
      const json=await response.json().catch(()=>({}));
      if(!response.ok||!json?.ok) throw new Error(json?.error||"Génération impossible.");
      const result=json.automaticArticles||{};
      if(result.duplicate) setMessage("Un brouillon ou article existe déjà pour ce match.");
      else if(Number(result.created||0)>0){ setMessage("Brouillon créé ✅"); window.setTimeout(()=>window.location.reload(),900); }
      else setMessage("Aucun nouveau brouillon créé.");
    } catch(error){ setMessage(error?.message||"Impossible de lancer la génération."); }
    finally { setRunning(false); }
  }

  return (
    <div style={{position:"fixed",right:18,bottom:92,zIndex:80,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8,maxWidth:"calc(100vw - 36px)"}}>
      {open && <div style={{width:"min(390px,calc(100vw - 36px))",background:"white",border:"1px solid #dfe4ee",borderRadius:16,padding:14,boxShadow:"0 16px 42px rgba(7,26,70,.2)",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><strong style={{color:"#071a46"}}>Générer un article de match</strong><button type="button" onClick={()=>setOpen(false)} style={{border:0,background:"transparent",fontSize:20,cursor:"pointer"}}>×</button></div>
        <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,fontWeight:800,color:"#071a46"}}>DATE DU MATCH<input type="date" value={date} onChange={(e)=>{setDate(e.target.value);setMatches([]);setMatchId("");setMessage("");}} style={{padding:"10px 11px",border:"1px solid #d8deea",borderRadius:9}} /></label>
        <button type="button" onClick={loadMatches} disabled={loading} style={{border:"1px solid #d8deea",borderRadius:9,padding:"10px 12px",background:"white",color:"#071a46",fontWeight:900,cursor:loading?"wait":"pointer"}}>{loading?"⏳ Recherche…":"Afficher les matchs"}</button>
        {matches.length>0 && <label style={{display:"flex",flexDirection:"column",gap:5,fontSize:12,fontWeight:800,color:"#071a46"}}>MATCH<select value={matchId} onChange={(e)=>setMatchId(e.target.value)} style={{padding:"11px",border:"1px solid #d8deea",borderRadius:9,background:"white"}}>{matches.map((match)=><option key={match.id} value={match.id}>{match.home} {match.score.home}-{match.score.away} {match.away} · {match.league}</option>)}</select></label>}
        {message && <div style={{background:"#f1f4f9",color:"#071a46",padding:"9px 10px",borderRadius:9,fontSize:12,fontWeight:800}}>{message}</div>}
        {matches.length>0 && <button type="button" onClick={trigger} disabled={running||!matchId} style={{border:0,borderRadius:10,padding:"12px 14px",background:"#ffd400",color:"#071a46",fontWeight:900,cursor:running?"wait":"pointer"}}>{running?"⏳ Génération…":"🤖 Générer ce brouillon"}</button>}
      </div>}
      <button type="button" onClick={()=>setOpen((value)=>!value)} style={{border:0,borderRadius:12,padding:"12px 15px",background:"#ffd400",color:"#071a46",fontWeight:900,boxShadow:"0 10px 28px rgba(7,26,70,.22)",cursor:"pointer"}}>{open?"Fermer":"🤖 Générer un brouillon"}</button>
    </div>
  );
}
