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

  const teamBox = (name, logo) => (
    <div style={{display:"flex",width:"360px",height:"390px",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
      <div style={{display:"flex",width:"210px",height:"210px",alignItems:"center",justifyContent:"center",filter:"drop-shadow(0 10px 16px rgba(0,0,0,.45))"}}>
        {logo ? <img src={logo} width="190" height="190" style={{objectFit:"contain"}} /> : <div style={{display:"flex",width:"150px",height:"150px",borderRadius:"50%",border:"5px solid #fff",alignItems:"center",justifyContent:"center",fontSize:"50px",fontWeight:900}}>{name.slice(0,2).toUpperCase()}</div>}
      </div>
      <div style={{display:"flex",marginTop:"18px",padding:"10px 24px",borderRadius:"12px",background:"rgba(0,0,0,.55)",fontSize:"32px",fontWeight:900,textTransform:"uppercase",textAlign:"center"}}>{name}</div>
    </div>
  );

  return new ImageResponse(
    <div style={{width:"1200px",height:"630px",display:"flex",flexDirection:"column",position:"relative",overflow:"hidden",background:"linear-gradient(#03162f 0%,#062852 55%,#07331f 100%)",color:"white",fontFamily:"Arial"}}>
      <div style={{position:"absolute",inset:0,display:"flex",background:"radial-gradient(ellipse at 50% 35%, rgba(35,115,180,.42) 0%, rgba(4,21,48,.25) 35%, rgba(0,7,20,.86) 100%)"}} />
      <div style={{position:"absolute",left:"-90px",top:"105px",width:"470px",height:"7px",background:"white",transform:"rotate(-17deg)",boxShadow:"0 0 22px 9px rgba(255,255,255,.75)"}} />
      <div style={{position:"absolute",right:"-90px",top:"105px",width:"470px",height:"7px",background:"white",transform:"rotate(17deg)",boxShadow:"0 0 22px 9px rgba(255,255,255,.75)"}} />
      <div style={{position:"absolute",left:0,right:0,bottom:0,height:"175px",display:"flex",background:"linear-gradient(180deg,#0b542e 0%,#083c22 100%)",borderTop:"4px solid rgba(255,255,255,.18)"}} />
      <div style={{position:"absolute",left:"50%",bottom:"0",width:"7px",height:"175px",background:"rgba(255,255,255,.8)",transform:"translateX(-50%)"}} />
      <div style={{position:"relative",display:"flex",height:"105px",padding:"30px 48px 0",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div style={{display:"flex",flexDirection:"column"}}><div style={{display:"flex",fontSize:"29px",fontWeight:900}}>FOOT FRANÇAIS</div><div style={{display:"flex",marginTop:"2px",padding:"3px 13px",background:"#ffd400",color:"#071a46",fontSize:"25px",fontWeight:900,transform:"skew(-7deg)"}}>EXPRESS</div></div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}><div style={{display:"flex",fontSize:"24px",fontWeight:900}}>{league.toUpperCase()}</div><div style={{display:"flex",marginTop:"5px",width:"160px",height:"5px",background:"#ffd400"}} /></div>
      </div>
      <div style={{position:"relative",display:"flex",flex:1,alignItems:"center",justifyContent:"space-between",padding:"0 35px 70px"}}>
        {teamBox(home,homeLogo)}
        <div style={{display:"flex",width:"330px",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{display:"flex",padding:"9px 24px",borderRadius:"8px",background:"#ffd400",color:"#071a46",fontSize:"22px",fontWeight:900}}>SCORE FINAL</div>
          <div style={{display:"flex",alignItems:"center",gap:"25px",marginTop:"20px",fontSize:"112px",fontWeight:900,lineHeight:1,textShadow:"0 8px 18px rgba(0,0,0,.55)"}}><span>{hs}</span><span style={{color:"#ffd400",fontSize:"60px"}}>–</span><span>{as}</span></div>
        </div>
        {teamBox(away,awayLogo)}
      </div>
      <div style={{position:"absolute",bottom:"22px",left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center"}}><div style={{display:"flex",fontSize:"19px",fontWeight:900,fontStyle:"italic"}}>FOOT FRANÇAIS</div><div style={{display:"flex",marginTop:"2px",padding:"3px 22px",background:"#ffd400",color:"#071a46",fontSize:"20px",fontWeight:900}}>EXPRESS</div></div>
    </div>,
    {width:1200,height:630}
  );
}
