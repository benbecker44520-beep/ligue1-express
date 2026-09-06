import { ImageResponse } from "next/og";

export const runtime = "edge";

function safe(value, fallback = "") {
  return String(value || fallback).slice(0, 90);
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const home = safe(params.get("home"), "Domicile");
  const away = safe(params.get("away"), "Extérieur");
  const hs = safe(params.get("hs"), "0");
  const as = safe(params.get("as"), "0");
  const homeLogo = params.get("hl") || "";
  const awayLogo = params.get("al") || "";
  const league = safe(params.get("league"), "FOOT FRANÇAIS");

  return new ImageResponse(
    <div style={{ width:"1200px", height:"630px", display:"flex", flexDirection:"column", background:"linear-gradient(135deg,#06183f 0%,#0d326b 70%,#071a46 100%)", color:"white", padding:"54px 64px", fontFamily:"Arial", position:"relative" }}>
      <div style={{ position:"absolute", right:"-90px", top:"-140px", width:"480px", height:"480px", borderRadius:"50%", background:"rgba(255,211,0,.10)" }} />
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div style={{ display:"flex", fontSize:"25px", fontWeight:900, letterSpacing:"2px", color:"#ffd300" }}>FOOT FRANÇAIS EXPRESS</div>
        <div style={{ display:"flex", fontSize:"19px", fontWeight:700, opacity:.85 }}>{league.toUpperCase()} · APRÈS-MATCH</div>
      </div>
      <div style={{ display:"flex", flex:1, alignItems:"center", justifyContent:"space-between", marginTop:"20px" }}>
        <div style={{ display:"flex", width:"350px", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
          {homeLogo ? <img src={homeLogo} width="128" height="128" style={{ objectFit:"contain" }} /> : null}
          <div style={{ display:"flex", marginTop:"24px", fontSize:"35px", fontWeight:900 }}>{home}</div>
        </div>
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center" }}>
          <div style={{ display:"flex", fontSize:"22px", fontWeight:800, color:"#ffd300", letterSpacing:"2px" }}>SCORE FINAL</div>
          <div style={{ display:"flex", alignItems:"center", gap:"28px", marginTop:"10px", fontSize:"108px", fontWeight:900, lineHeight:1 }}><span>{hs}</span><span style={{ color:"#ffd300", fontSize:"58px" }}>–</span><span>{as}</span></div>
          <div style={{ display:"flex", marginTop:"22px", padding:"11px 22px", borderRadius:"999px", background:"#ffd300", color:"#071a46", fontSize:"20px", fontWeight:900 }}>LE DÉBRIEF DE LA RÉDACTION</div>
        </div>
        <div style={{ display:"flex", width:"350px", flexDirection:"column", alignItems:"center", textAlign:"center" }}>
          {awayLogo ? <img src={awayLogo} width="128" height="128" style={{ objectFit:"contain" }} /> : null}
          <div style={{ display:"flex", marginTop:"24px", fontSize:"35px", fontWeight:900 }}>{away}</div>
        </div>
      </div>
      <div style={{ display:"flex", borderTop:"2px solid rgba(255,255,255,.16)", paddingTop:"18px", justifyContent:"space-between", fontSize:"18px", fontWeight:700 }}><span>Sans perdre une minute.</span><span style={{ color:"#ffd300" }}>foot-francais-express.vercel.app</span></div>
    </div>,
    { width:1200, height:630 }
  );
}
