import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safe(value, fallback = "") {
  return String(value || fallback).slice(0, 90);
}

function shortName(value) {
  const name = String(value || "").trim();
  if (name.length <= 15) return name;
  return name
    .replace(/Football Club/gi, "FC")
    .replace(/Olympique/gi, "OL")
    .replace(/Racing Club/gi, "RC")
    .replace(/Association Sportive/gi, "AS")
    .slice(0, 16);
}

async function toDataUrl(url) {
  if (!url || !/^https?:\/\//i.test(url)) return "";
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Foot-Francais-Express/1.0" },
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) return "";
    const type = response.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) return "";
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 2_000_000) return "";
    return `data:${type};base64,${buffer.toString("base64")}`;
  } catch {
    return "";
  }
}

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const home = safe(params.get("home"), "Domicile");
  const away = safe(params.get("away"), "Extérieur");
  const hs = safe(params.get("hs"), "0");
  const as = safe(params.get("as"), "0");
  const league = safe(params.get("league"), "FOOT FRANÇAIS");

  const [homeLogo, awayLogo] = await Promise.all([
    toDataUrl(params.get("hl") || ""),
    toDataUrl(params.get("al") || "")
  ]);

  const Team = ({ name, logo }) => (
    <div style={{display:"flex",width:"300px",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{display:"flex",width:"155px",height:"155px",alignItems:"center",justifyContent:"center",borderRadius:"26px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)"}}>
        {logo ? (
          <img src={logo} width="132" height="132" style={{objectFit:"contain"}} />
        ) : (
          <div style={{display:"flex",width:"100px",height:"100px",borderRadius:"50%",border:"4px solid white",alignItems:"center",justifyContent:"center",fontSize:"38px",fontWeight:900}}>
            {name.slice(0,2).toUpperCase()}
          </div>
        )}
      </div>
      <div style={{display:"flex",marginTop:"17px",maxWidth:"280px",padding:"9px 16px",borderRadius:"12px",background:"rgba(0,0,0,.42)",fontSize:"25px",fontWeight:900,textTransform:"uppercase",textAlign:"center",lineHeight:1.1}}>{shortName(name)}</div>
    </div>
  );

  return new ImageResponse(
    <div style={{width:"1200px",height:"630px",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",background:"linear-gradient(180deg,#03162f 0%,#062852 58%,#071a46 100%)",color:"white",fontFamily:"Arial"}}>
      <div style={{position:"absolute",inset:0,display:"flex",background:"radial-gradient(circle at 50% 42%, rgba(45,120,190,.30), transparent 35%)"}} />
      <div style={{position:"absolute",left:"85px",top:"145px",width:"260px",height:"5px",background:"rgba(255,255,255,.9)",transform:"rotate(-14deg)",boxShadow:"0 0 20px 7px rgba(255,255,255,.28)"}} />
      <div style={{position:"absolute",right:"85px",top:"145px",width:"260px",height:"5px",background:"rgba(255,255,255,.9)",transform:"rotate(14deg)",boxShadow:"0 0 20px 7px rgba(255,255,255,.28)"}} />

      <div style={{position:"relative",display:"flex",height:"105px",padding:"26px 92px 0",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div style={{display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",fontSize:"24px",fontWeight:900,letterSpacing:"1px"}}>FOOT FRANÇAIS</div>
          <div style={{display:"flex",alignSelf:"flex-start",marginTop:"3px",padding:"4px 13px",background:"#ffd400",color:"#071a46",fontSize:"20px",fontWeight:900}}>EXPRESS</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
          <div style={{display:"flex",fontSize:"18px",fontWeight:900,opacity:.92}}>{league.toUpperCase()}</div>
          <div style={{display:"flex",marginTop:"6px",width:"135px",height:"4px",background:"#ffd400"}} />
        </div>
      </div>

      <div style={{position:"relative",display:"flex",flex:1,alignItems:"center",justifyContent:"space-between",padding:"0 95px 72px"}}>
        <Team name={home} logo={homeLogo} />
        <div style={{display:"flex",width:"280px",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{display:"flex",padding:"9px 22px",borderRadius:"999px",background:"#ffd400",color:"#071a46",fontSize:"19px",fontWeight:900}}>SCORE FINAL</div>
          <div style={{display:"flex",alignItems:"center",gap:"20px",marginTop:"22px",fontSize:"98px",fontWeight:900,lineHeight:1}}>
            <span>{hs}</span><span style={{color:"#ffd400",fontSize:"52px"}}>–</span><span>{as}</span>
          </div>
        </div>
        <Team name={away} logo={awayLogo} />
      </div>

      <div style={{position:"absolute",left:"92px",right:"92px",bottom:"28px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:"15px",fontWeight:800,opacity:.85}}>
        <span>LE DÉBRIEF DE LA RÉDACTION</span>
        <span style={{color:"#ffd400"}}>foot-francais-express.vercel.app</span>
      </div>
    </div>,
    {width:1200,height:630}
  );
}
