import { ImageResponse } from "next/og";

export const runtime = "edge";

function safe(value, fallback = "") {
  return String(value || fallback).slice(0, 90);
}

function shortName(value) {
  const name = String(value || "").trim();
  if (name.length <= 16) return name;
  return name
    .replace(/Football Club/gi, "FC")
    .replace(/Olympique/gi, "OL")
    .replace(/Racing Club/gi, "RC")
    .replace(/Association Sportive/gi, "AS")
    .slice(0, 18);
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

  const Team = ({ name, logo }) => (
    <div style={{display:"flex",width:"320px",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{display:"flex",width:"170px",height:"170px",alignItems:"center",justifyContent:"center",borderRadius:"28px",background:"rgba(255,255,255,.06)",border:"1px solid rgba(255,255,255,.12)"}}>
        {logo ? <img src={logo} width="145" height="145" style={{objectFit:"contain",filter:"drop-shadow(0 8px 18px rgba(0,0,0,.45))"}} /> : <div style={{display:"flex",width:"112px",height:"112px",borderRadius:"50%",border:"4px solid white",alignItems:"center",justifyContent:"center",fontSize:"42px",fontWeight:900}}>{name.slice(0,2).toUpperCase()}</div>}
      </div>
      <div style={{display:"flex",marginTop:"18px",maxWidth:"300px",padding:"10px 18px",borderRadius:"12px",background:"rgba(0,0,0,.42)",fontSize:"28px",fontWeight:900,textTransform:"uppercase",textAlign:"center",lineHeight:1.1}}>{shortName(name)}</div>
    </div>
  );

  return new ImageResponse(
    <div style={{width:"1200px",height:"630px",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",background:"linear-gradient(180deg,#03162f 0%,#062852 58%,#071a46 100%)",color:"white",fontFamily:"Arial"}}>
      <div style={{position:"absolute",inset:0,display:"flex",background:"radial-gradient(circle at 50% 38%, rgba(45,120,190,.28), transparent 33%)"}} />
      <div style={{position:"absolute",left:"-90px",top:"125px",width:"440px",height:"6px",background:"rgba(255,255,255,.92)",transform:"rotate(-15deg)",boxShadow:"0 0 24px 8px rgba(255,255,255,.35)"}} />
      <div style={{position:"absolute",right:"-90px",top:"125px",width:"440px",height:"6px",background:"rgba(255,255,255,.92)",transform:"rotate(15deg)",boxShadow:"0 0 24px 8px rgba(255,255,255,.35)"}} />
      <div style={{position:"absolute",left:"70px",right:"70px",bottom:"88px",height:"1px",background:"rgba(255,255,255,.12)"}} />

      <div style={{position:"relative",display:"flex",height:"106px",padding:"28px 74px 0",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div style={{display:"flex",flexDirection:"column"}}>
          <div style={{display:"flex",fontSize:"27px",fontWeight:900,letterSpacing:"1px"}}>FOOT FRANÇAIS</div>
          <div style={{display:"flex",alignSelf:"flex-start",marginTop:"3px",padding:"4px 14px",background:"#ffd400",color:"#071a46",fontSize:"22px",fontWeight:900}}>EXPRESS</div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}>
          <div style={{display:"flex",fontSize:"20px",fontWeight:900,opacity:.92}}>{league.toUpperCase()}</div>
          <div style={{display:"flex",marginTop:"6px",width:"150px",height:"4px",background:"#ffd400"}} />
        </div>
      </div>

      <div style={{position:"relative",display:"flex",flex:1,alignItems:"center",justifyContent:"space-between",padding:"0 76px 70px"}}>
        <Team name={home} logo={homeLogo} />

        <div style={{display:"flex",width:"310px",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{display:"flex",padding:"9px 22px",borderRadius:"999px",background:"#ffd400",color:"#071a46",fontSize:"20px",fontWeight:900,letterSpacing:".5px"}}>SCORE FINAL</div>
          <div style={{display:"flex",alignItems:"center",gap:"22px",marginTop:"22px",fontSize:"104px",fontWeight:900,lineHeight:1,textShadow:"0 8px 18px rgba(0,0,0,.45)"}}>
            <span>{hs}</span>
            <span style={{color:"#ffd400",fontSize:"56px"}}>–</span>
            <span>{as}</span>
          </div>
        </div>

        <Team name={away} logo={awayLogo} />
      </div>

      <div style={{position:"absolute",left:"74px",right:"74px",bottom:"28px",display:"flex",alignItems:"center",justifyContent:"space-between",fontSize:"16px",fontWeight:800,opacity:.85}}>
        <span>LE DÉBRIEF DE LA RÉDACTION</span>
        <span style={{color:"#ffd400"}}>foot-francais-express.vercel.app</span>
      </div>
    </div>,
    {width:1200,height:630}
  );
}
