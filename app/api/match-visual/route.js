import { ImageResponse } from "next/og";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const clean = (v, fallback = "") => String(v || fallback).trim().slice(0, 70);
const initials = (name) => clean(name, "FC").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export async function GET(request) {
  try {
    const p = new URL(request.url).searchParams;
    const home = clean(p.get("home"), "Domicile");
    const away = clean(p.get("away"), "Extérieur");
    const hs = clean(p.get("hs"), "0");
    const as = clean(p.get("as"), "0");
    const league = clean(p.get("league"), "Football français");
    const round = clean(p.get("round"), "");

    const Team = ({ name }) => (
      <div style={{ display:"flex", width:330, flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
        <div style={{ display:"flex", width:178, height:178, borderRadius:90, alignItems:"center", justifyContent:"center", background:"linear-gradient(145deg,#0d3768,#071a46)", border:"7px solid #ffd400", boxShadow:"0 16px 38px rgba(0,0,0,.45), inset 0 0 0 3px rgba(255,255,255,.14)", fontSize:62, fontWeight:900 }}>{initials(name)}</div>
        <div style={{ display:"flex", marginTop:18, maxWidth:320, fontSize:name.length > 16 ? 27 : 33, fontWeight:900, textTransform:"uppercase", textAlign:"center", lineHeight:1.05 }}>{name}</div>
      </div>
    );

    return new ImageResponse(
      <div style={{ width:1200, height:630, display:"flex", position:"relative", flexDirection:"column", overflow:"hidden", background:"linear-gradient(180deg,#031326 0%,#062a55 58%,#020b17 100%)", color:"white", fontFamily:"Arial" }}>
        <div style={{ position:"absolute", inset:0, display:"flex", background:"radial-gradient(ellipse at 50% 42%,rgba(29,117,197,.50) 0%,rgba(3,23,49,.15) 42%,rgba(0,5,13,.78) 100%)" }} />
        <div style={{ position:"absolute", left:0, right:0, top:158, height:190, display:"flex", borderTop:"2px solid rgba(255,255,255,.12)", borderBottom:"2px solid rgba(255,255,255,.10)", background:"linear-gradient(180deg,rgba(24,79,125,.28),rgba(0,10,24,.12))" }} />
        <div style={{ position:"absolute", left:-40, top:128, width:380, height:5, display:"flex", background:"white", transform:"rotate(-14deg)", boxShadow:"0 0 24px 9px rgba(255,255,255,.52)" }} />
        <div style={{ position:"absolute", right:-40, top:128, width:380, height:5, display:"flex", background:"white", transform:"rotate(14deg)", boxShadow:"0 0 24px 9px rgba(255,255,255,.52)" }} />
        <div style={{ position:"absolute", left:40, top:48, width:150, height:5, display:"flex", background:"#ffd400", transform:"rotate(-11deg)" }} />
        <div style={{ position:"absolute", right:40, bottom:70, width:150, height:5, display:"flex", background:"#ffd400", transform:"rotate(-11deg)" }} />

        <div style={{ position:"relative", display:"flex", height:128, padding:"25px 68px 0", alignItems:"flex-start", justifyContent:"space-between" }}>
          <div style={{ display:"flex", flexDirection:"column" }}>
            <div style={{ display:"flex", fontSize:27, fontWeight:900, fontStyle:"italic" }}>⚽ FOOT FRANÇAIS</div>
            <div style={{ display:"flex", alignSelf:"flex-start", marginTop:3, padding:"3px 18px", background:"#ffd400", color:"#071a46", fontSize:27, fontWeight:900, fontStyle:"italic" }}>EXPRESS</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end" }}>
            <div style={{ display:"flex", fontSize:24, fontWeight:900 }}>{league.toUpperCase()}</div>
            {round ? <div style={{ display:"flex", marginTop:5, color:"#ffd400", fontSize:18, fontWeight:800 }}>JOURNÉE {round}</div> : null}
          </div>
        </div>

        <div style={{ position:"relative", display:"flex", flex:1, alignItems:"center", justifyContent:"space-between", padding:"0 70px 90px" }}>
          <Team name={home} />
          <div style={{ display:"flex", width:330, flexDirection:"column", alignItems:"center", justifyContent:"center" }}>
            <div style={{ display:"flex", padding:"10px 28px", borderRadius:8, background:"#ffd400", color:"#071a46", fontSize:24, fontWeight:900 }}>SCORE FINAL</div>
            <div style={{ display:"flex", marginTop:20, alignItems:"center", gap:20, fontSize:112, fontWeight:900, lineHeight:1, textShadow:"0 8px 20px rgba(0,0,0,.55)" }}><span>{hs}</span><span style={{ color:"#ffd400", fontSize:62 }}>–</span><span>{as}</span></div>
          </div>
          <Team name={away} />
        </div>

        <div style={{ position:"absolute", left:0, right:0, bottom:0, height:82, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"rgba(0,7,17,.72)", borderTop:"1px solid rgba(255,255,255,.14)" }}>
          <div style={{ display:"flex", padding:"5px 28px", background:"#ffd400", color:"#071a46", fontSize:21, fontWeight:900, fontStyle:"italic" }}>LE DÉBRIEF DE LA RÉDACTION</div>
          <div style={{ display:"flex", marginTop:7, fontSize:15, letterSpacing:4, opacity:.9 }}>foot-francais-express.vercel.app</div>
        </div>
      </div>,
      { width:1200, height:630 }
    );
  } catch (error) {
    return new Response(`match-visual error: ${error?.message || "unknown"}`, { status:500, headers:{"content-type":"text/plain; charset=utf-8"} });
  }
}
