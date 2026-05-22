import { useState, useEffect, useCallback } from "react";
import * as api from "./api.js";

// ─── DESIGN TOKENS ──────────────────────────────────────────
const T = {
  bgPage:"#F5F3EF", bgCard:"#FFFFFF", bgSide:"#FEFEFE",
  bgInput:"#F9F7F4", bgHover:"#F2EFE9", bgStripe:"#FAF9F7",
  mocha:"#7C5C3E", mochaLight:"#C4A882", mochaFaint:"#EDE5D8", mochaXfaint:"#F7F3ED",
  success:"#2D8A5E", successBg:"#EBF7F2",
  warn:"#B45309",   warnBg:"#FEF3C7",
  danger:"#C0392B", dangerBg:"#FEF2F1",
  info:"#1D6FA4",   infoBg:"#EBF4FB",
  purple:"#6D4C9E",
  text:"#1C1917", textSub:"#57534E", textMuted:"#A8A29E", textFaint:"#D6D3D1",
  border:"#E7E2DA", borderMid:"#D4CCBF",
  shadow:"0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)",
  shadowMd:"0 4px 16px rgba(0,0,0,0.08),0 2px 4px rgba(0,0,0,0.04)",
  radius:"10px", radiusLg:"14px", radiusPill:"20px",
};

// ─── WIB DATE HELPER (client-side) ──────────────────────────
// Returns today's date in WIB (UTC+7) as "YYYY-MM-DD"
const getWIBDateStr = () => {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().split("T")[0];
};
const getWIBTimeStr = () => {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().split("T")[1].slice(0,5);
};

const MONTH_NAMES = ["","January","February","March","April","May","June","July","August","September","October","November","December"];

const USERS_META = [
  { role:"cashier",    label:"Cashier",    icon:"🧾", color:"#1D6FA4" },
  { role:"supervisor", label:"Supervisor", icon:"✅", color:"#B45309" },
  { role:"accountant", label:"Accountant", icon:"📊", color:"#2D8A5E" },
  { role:"manager",    label:"Manager",    icon:"👔", color:"#7C5C3E" },
];

const genId = () => Math.random().toString(36).slice(2,9).toUpperCase();
const fmt = n => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(n||0);
const fmtN = n => new Intl.NumberFormat("id-ID").format(n||0);
const payColors = { Cash:T.success, QRIS:T.info, GoPay:T.warn, Debit:T.purple };

// ─── EXPORT UTILS ───────────────────────────────────────────
const exportCSV = (filename, headers, rows) => {
  const esc = v => { const s=String(v!=null?v:"").replace(/<[^>]+>/g,"").trim(); return s.includes(",")||s.includes('"')?`"${s.replace(/"/g,'""')}"`:s; };
  const csv = [headers.map(esc).join(","), ...rows.map(r=>r.map(esc).join(","))].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}));
  a.download = filename+".csv"; a.click();
};

const exportPrint = (title, subtitle, headers, rows, summary=[]) => {
  const esc = s => String(s!=null?s:"").replace(/<[^>]+>/g,"").replace(/&/g,"&amp;");
  const th = headers.map(h=>`<th>${esc(h)}</th>`).join("");
  const tb = rows.map((r,i)=>`<tr class="${i%2===0?"e":"o"}">${r.map(c=>`<td>${esc(c)}</td>`).join("")}</tr>`).join("");
  const sf = summary.map(([l,v])=>`<tr><td colspan="${headers.length-1}" style="text-align:right;font-weight:700">${esc(l)}</td><td style="font-weight:700;text-align:right">${esc(v)}</td></tr>`).join("");
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',sans-serif;color:#1a1a1a;padding:36px}
.hdr{border-bottom:3px solid #7C5C3E;padding-bottom:14px;margin-bottom:20px}
.logo{font-size:20px;font-weight:800;color:#7C5C3E}.ttl{font-size:16px;font-weight:700;margin-top:4px}
.sub{font-size:12px;color:#666}.meta{font-size:11px;color:#555;margin-bottom:16px}
table{width:100%;border-collapse:collapse;font-size:12px}
th{background:#7C5C3E;color:#fff;padding:8px 10px;text-align:left;font-size:11px}
td{padding:7px 10px;border-bottom:1px solid #eee}tr.e{background:#faf9f7}tr.o{background:#fff}
tfoot td{background:#f5f3ef!important;font-weight:700;border-top:2px solid #7C5C3E}
.ft{margin-top:24px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px;display:flex;justify-content:space-between}
@media print{body{padding:20px}}</style></head><body>
<div class="hdr"><div class="logo">Khasanah Sari Bakery</div><div class="ttl">${esc(title)}</div><div class="sub">${esc(subtitle)}</div></div>
<div class="meta">Printed: ${new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} | Khasanah Sari Bakery AIS v3.0 | Grand Indonesia</div>
<table><thead><tr>${th}</tr></thead><tbody>${tb}</tbody>${summary.length?`<tfoot>${sf}</tfoot>`:""}</table>
<div class="ft"><span>Khasanah Sari Bakery Accounting Information System</span><span>Page 1</span></div>
<script>window.onload=()=>window.print()</script></body></html>`;
  const w=window.open("","_blank"); w.document.write(html); w.document.close();
};

// ─── UI HELPERS ─────────────────────────────────────────────
const s = {
  card: { background:T.bgCard, borderRadius:T.radiusLg, border:`1px solid ${T.border}`, boxShadow:T.shadow },
  input: { background:T.bgInput, border:`1.5px solid ${T.border}`, borderRadius:T.radius, padding:"9px 13px", fontSize:13, color:T.text, outline:"none", width:"100%", fontFamily:"inherit", transition:"border-color .15s" },
  btn: (bg=T.mocha,fg="#fff") => ({ background:bg, color:fg, border:"none", borderRadius:T.radius, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", display:"inline-flex", alignItems:"center", gap:6 }),
  btnO: (c=T.mocha) => ({ background:"transparent", color:c, border:`1.5px solid ${c}`, borderRadius:T.radius, padding:"8px 14px", fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit", transition:"all .15s", display:"inline-flex", alignItems:"center", gap:5 }),
};

const Badge = ({color=T.mocha,children}) => (
  <span style={{background:color+"18",color,fontSize:11,padding:"2px 9px",borderRadius:T.radiusPill,fontWeight:600,whiteSpace:"nowrap"}}>{children}</span>
);
const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:48}}>
    <div style={{width:28,height:28,border:`3px solid ${T.mochaFaint}`,borderTop:`3px solid ${T.mocha}`,borderRadius:"50%",animation:"spin .8s linear infinite"}}/>
  </div>
);
const KpiCard = ({label,value,sub,color=T.mocha,icon,trend}) => (
  <div style={{...s.card,padding:"18px 20px",borderTop:`3px solid ${color}`,transition:"box-shadow .2s"}}
    onMouseEnter={e=>e.currentTarget.style.boxShadow=T.shadowMd}
    onMouseLeave={e=>e.currentTarget.style.boxShadow=T.shadow}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
      <div>
        <div style={{color:T.textMuted,fontSize:11,fontWeight:600,letterSpacing:.8,textTransform:"uppercase",marginBottom:6}}>{label}</div>
        <div style={{color:T.text,fontSize:22,fontWeight:700,letterSpacing:-.5}}>{value}</div>
        {sub&&<div style={{color:T.textMuted,fontSize:11,marginTop:4}}>{sub}</div>}
      </div>
      <div style={{width:40,height:40,borderRadius:10,background:color+"14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{icon}</div>
    </div>
    {trend&&<div style={{marginTop:10,fontSize:11,color:trend>0?T.success:T.danger,fontWeight:600}}>{trend>0?"↑":"↓"} {Math.abs(trend)}% vs last period</div>}
  </div>
);
const ExportBar = ({title,subtitle,headers,rows,summary=[]}) => {
  const flat = r => r.map(c=>typeof c==="object"?(c&&c.props&&c.props.children!=null?String(c.props.children):""):String(c!=null?c:""));
  return (
    <div style={{display:"flex",gap:8}}>
      <button style={s.btnO(T.success)} onClick={()=>exportCSV(title,headers,rows.map(flat))}>⬇ Excel/CSV</button>
      <button style={s.btnO(T.danger)}  onClick={()=>exportPrint(title,subtitle,headers,rows.map(flat),summary)}>🖨 Print/PDF</button>
    </div>
  );
};
const DataTable = ({headers,rows,compact=false}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:compact?12:13}}>
      <thead>
        <tr style={{background:T.bgStripe}}>
          {headers.map((h,i)=><th key={i} style={{padding:compact?"7px 10px":"10px 14px",textAlign:"left",color:T.textSub,fontWeight:600,fontSize:11,letterSpacing:.6,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`,whiteSpace:"nowrap"}}>{h}</th>)}
        </tr>
      </thead>
      <tbody>
        {rows.map((row,ri)=>(
          <tr key={ri} style={{background:ri%2===1?T.bgStripe:T.bgCard,transition:"background .1s"}}
            onMouseEnter={e=>e.currentTarget.style.background=T.bgHover}
            onMouseLeave={e=>e.currentTarget.style.background=ri%2===1?T.bgStripe:T.bgCard}>
            {row.map((cell,ci)=><td key={ci} style={{padding:compact?"7px 10px":"10px 14px",color:T.text,verticalAlign:"middle",borderBottom:`1px solid ${T.border}40`}}>{cell}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
const MiniBar = ({value,max,color=T.mocha}) => (
  <div style={{background:T.bgHover,borderRadius:4,height:5,width:"100%",marginTop:5,overflow:"hidden"}}>
    <div style={{background:color,height:5,borderRadius:4,width:`${Math.min(100,(value/Math.max(max,1))*100)}%`,transition:"width .7s ease"}}/>
  </div>
);
const BarChart = ({data,color=T.mocha,height=120}) => {
  const max=Math.max(...data.map(d=>d.value),1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:3,height,paddingBottom:18,position:"relative"}}>
      {data.map((d,i)=>(
        <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-end",height:"100%"}}>
          <div style={{width:"100%",background:color+"22",borderRadius:"4px 4px 0 0",overflow:"hidden",flex:1,display:"flex",alignItems:"flex-end"}}>
            <div style={{width:"100%",background:color,borderRadius:"4px 4px 0 0",height:`${(d.value/max)*100}%`,transition:"height .9s ease",minHeight:d.value>0?2:0}}/>
          </div>
          <div style={{fontSize:9,color:T.textMuted,textAlign:"center",position:"absolute",bottom:0}}>{d.label}</div>
        </div>
      ))}
    </div>
  );
};
const Modal = ({title,onClose,children,width=480}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.35)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,backdropFilter:"blur(2px)"}}
    onClick={e=>e.target===e.currentTarget&&onClose()}>
    <div style={{...s.card,width,maxWidth:"95vw",maxHeight:"90vh",overflow:"auto",padding:0,animation:"popIn .2s ease"}}>
      <div style={{padding:"18px 22px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <span style={{fontSize:15,fontWeight:700,color:T.text}}>{title}</span>
        <button onClick={onClose} style={{background:"transparent",border:"none",color:T.textMuted,fontSize:22,cursor:"pointer",lineHeight:1,padding:0}}>×</button>
      </div>
      <div style={{padding:"20px 22px"}}>{children}</div>
    </div>
  </div>
);
const Toast = ({msg,color}) => (
  <div style={{position:"fixed",bottom:24,right:24,background:T.bgCard,border:`1.5px solid ${color}60`,borderRadius:T.radiusLg,padding:"13px 20px",color:T.text,fontWeight:500,fontSize:13,zIndex:999,boxShadow:T.shadowMd,display:"flex",alignItems:"center",gap:10,animation:"slideUp .3s ease"}}>
    <span style={{width:8,height:8,borderRadius:"50%",background:color,display:"inline-block"}}/>{msg}
  </div>
);

// ─── PERIOD SELECTOR COMPONENT ───────────────────────────────
const PeriodSelector = ({periods, selectedMonth, selectedYear, onChange}) => {
  const currentYear = new Date().getFullYear();
  const years = [...new Set(periods.map(p=>p.year))].sort((a,b)=>b-a);
  if (!years.length) years.push(currentYear);

  return (
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      <span style={{fontSize:12,color:T.textMuted,fontWeight:600,whiteSpace:"nowrap"}}>Period:</span>
      <select value={selectedMonth}
        onChange={e=>onChange(parseInt(e.target.value), selectedYear)}
        style={{...s.input,width:"auto",padding:"7px 10px",fontSize:12}}>
        <option value={0}>All Months</option>
        {Array.from({length:12},(_,i)=>i+1).map(m=>(
          <option key={m} value={m}>{MONTH_NAMES[m]}</option>
        ))}
      </select>
      <select value={selectedYear}
        onChange={e=>onChange(selectedMonth, parseInt(e.target.value))}
        style={{...s.input,width:"auto",padding:"7px 10px",fontSize:12}}>
        {years.map(y=><option key={y} value={y}>{y}</option>)}
      </select>
      <button onClick={()=>onChange(0,currentYear)} style={{...s.btnO(T.textMuted),padding:"7px 12px",fontSize:11}}>Reset</button>
    </div>
  );
};

// ─── LOGIN PAGE ──────────────────────────────────────────────
const LoginPage = ({onLogin}) => {
  const [sel,setSel]=useState(null);
  const [pin,setPin]=useState("");
  const [err,setErr]=useState("");
  const [loading,setLoading]=useState(false);
  const [shake,setShake]=useState(false);

  const tryLogin = async () => {
    if(!sel||!pin) return;
    setLoading(true);
    try { const user=await api.login(sel.role,pin); onLogin(user); }
    catch(e) { setErr("Invalid PIN. Please try again."); setShake(true); setTimeout(()=>setShake(false),500); }
    finally { setLoading(false); }
  };

  return (
    <div style={{minHeight:"100vh",background:T.bgPage,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Plus Jakarta Sans',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
        @keyframes popIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        *{box-sizing:border-box} input,button,select{font-family:'Plus Jakarta Sans',sans-serif}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#D4CCBF;border-radius:3px}
      `}</style>
      <div style={{width:"100%",maxWidth:420,padding:"0 24px"}}>
        <div style={{...s.card,padding:"36px 32px"}}>
          <div style={{textAlign:"center",marginBottom:32}}>
            <div style={{width:60,height:60,background:T.mochaFaint,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",fontSize:32,margin:"0 auto 14px"}}>🥐</div>
            <div style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:-.5}}>Khasanah Sari Bakery</div>
            <div style={{fontSize:12,color:T.mocha,fontWeight:600,letterSpacing:1.5,textTransform:"uppercase",marginTop:3}}>Accounting Information System</div>
            <div style={{width:32,height:2,background:T.mochaLight,margin:"12px auto 0",borderRadius:2}}/>
          </div>
          <div style={{marginBottom:24}}>
            <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:10}}>Select Your Role</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
              {USERS_META.map(u=>(
                <div key={u.role} onClick={()=>{setSel(u);setPin("");setErr("");}}
                  style={{border:`1.5px solid ${sel&&sel.role===u.role?u.color:T.border}`,borderRadius:T.radius,padding:"12px 14px",cursor:"pointer",background:sel&&sel.role===u.role?u.color+"0E":T.bgCard,transition:"all .15s"}}>
                  <div style={{fontSize:20,marginBottom:5}}>{u.icon}</div>
                  <div style={{fontSize:13,fontWeight:700,color:sel&&sel.role===u.role?u.color:T.text}}>{u.label}</div>
                </div>
              ))}
            </div>
          </div>
          {sel&&(
            <div style={{animation:"fadeUp .25s ease"}}>
              <div style={{marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>PIN</div>
                <input type="password" value={pin} maxLength={4}
                  onChange={e=>{setPin(e.target.value);setErr("");}}
                  onKeyDown={e=>e.key==="Enter"&&tryLogin()}
                  placeholder="Enter PIN"
                  style={{...s.input,textAlign:"center",fontSize:20,letterSpacing:12,borderColor:err?T.danger:T.border,animation:shake?"shake .4s ease":"none"}}
                  onFocus={e=>e.target.style.borderColor=sel.color}
                  onBlur={e=>e.target.style.borderColor=err?T.danger:T.border}/>
                {err&&<div style={{color:T.danger,fontSize:12,marginTop:6,fontWeight:500}}>{err}</div>}
              </div>
              <button onClick={tryLogin} disabled={loading}
                style={{...s.btn(sel.color),width:"100%",justifyContent:"center",padding:"12px",fontSize:14,opacity:loading?.7:1}}>
                {loading?"Signing in...":"Sign In →"}
              </button>
            </div>
          )}
          <div style={{textAlign:"center",color:T.textMuted,fontSize:11,marginTop:20}}>
            v2.1 · PostgreSQL · WIB (UTC+7) · {new Date().toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric"})}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ────────────────────────────────────────────────
export default function App() {
  const [user,setUser]         = useState(null);
  const [page,setPage]         = useState("dashboard");
  const [products,setProducts] = useState([]);
  const [transactions,setTransactions] = useState([]);
  const [invLogs,setInvLogs]   = useState([]);
  const [summary,setSummary]   = useState(null);
  const [periods,setPeriods]   = useState([]);
  const [cart,setCart]         = useState([]);
  const [sidebarOpen,setSidebarOpen] = useState(true);
  const [toast,setToast]       = useState(null);
  const [receiptModal,setReceiptModal] = useState(null);
  const [saving,setSaving]     = useState(false);
  const [txnDetailId,setTxnDetailId] = useState(null);
  const [expandedGroups,setExpandedGroups] = useState({
    sales:false, cash:false, production:false, accounting:false
  });

  // Period state — default to current month/year in WIB
  const wibNow = new Date(new Date().getTime() + 7*60*60*1000);
  const [selMonth,setSelMonth] = useState(wibNow.getUTCMonth()+1);
  const [selYear,setSelYear]   = useState(wibNow.getUTCFullYear());

  const notify = useCallback((msg,color=T.success)=>{setToast({msg,color});setTimeout(()=>setToast(null),3200);},[]);

  const loadProducts     = useCallback(async()=>{ const d=await api.getProducts(); setProducts(d); },[]);
  const loadTransactions = useCallback(async()=>{ const d=await api.getTransactions(null,500); setTransactions(d); },[]);
  const loadInvLogs      = useCallback(async()=>{ const d=await api.getInventoryLogs(); setInvLogs(d); },[]);
  const loadSummary      = useCallback(async(m,y)=>{
    const d=await api.getReportSummary(m||0,y||selYear);
    setSummary(d);
    if(d.availablePeriods) setPeriods(d.availablePeriods);
  },[selYear]);

  useEffect(()=>{
    if(!user) return;
    Promise.all([loadProducts(),loadTransactions(),loadInvLogs(),loadSummary(selMonth,selYear)]).catch(console.error);
  },[user]);

  // Auto-expand the group that contains the current page
  useEffect(()=>{
    const groupMap = {
      pos:"sales",productlist:"sales",inventory:"sales",
      cashonhand:"cash",cashreceipt:"cash",
      ingredients:"production",prodlog:"production",
      journals:"accounting",cashjournal:"accounting",gl:"accounting",
      trial:"accounting",reports:"accounting",coa:"accounting",
    };
    const group = groupMap[page];
    if(group) setExpandedGroups(prev=>({...prev,[group]:true}));
  },[page]);

  const onPeriodChange = (m,y) => {
    setSelMonth(m); setSelYear(y);
    loadSummary(m,y);
  };

  if(!user) return <LoginPage onLogin={u=>{setUser(u);setPage("dashboard");}}/>;

  const canEdit = ["supervisor","manager"].includes(user.role);
  const canAcct = ["accountant","manager"].includes(user.role);
  const isManager = user.role==="manager";

  // navItems replaced by NAV_GROUPS below

  const wibToday   = getWIBDateStr();
  const todayTxns  = transactions.filter(t=>(t.date||t.transaction_date)===wibToday);
  const rClrMap    = {cashier:T.info,supervisor:T.warn,accountant:T.success,manager:T.mocha};

  const addToCart = p => {
    if(p.stock<=0){notify("Out of stock!",T.danger);return;}
    setCart(prev=>{const ex=prev.find(i=>i.id===p.id);return ex?prev.map(i=>i.id===p.id?{...i,qty:i.qty+1}:i):[...prev,{...p,qty:1}];});
    setProducts(prev=>prev.map(q=>q.id===p.id?{...q,stock:q.stock-1}:q));
  };
  const removeFromCart = id => {
    const item=cart.find(i=>i.id===id);
    if(item) setProducts(prev=>prev.map(p=>p.id===id?{...p,stock:p.stock+item.qty}:p));
    setCart(prev=>prev.filter(i=>i.id!==id));
  };
  const cartSub   = cart.reduce((s,i)=>s+i.price*i.qty,0);
  const cartTax   = Math.round(cartSub*0.11);
  const cartTotal = cartSub+cartTax;

  const processPayment = async method => {
    if(!cart.length){notify("Cart is empty!",T.danger);return;}
    const id=genId();
    const receipt_no=`RCP-${genId()}`;
    const txnData={id,cashier_name:user.name,
      items:cart.map(i=>({productId:i.id,name:i.name,qty:i.qty,price:i.price,cost:i.cost,cat:i.category})),
      subtotal:cartSub,tax:cartTax,total:cartTotal,payment_method:method,receipt_no};
    try {
      setSaving(true);
      const result = await api.createTransaction(txnData);
      // Use server-returned WIB date/time
      const txnDate = result.date || wibToday;
      const txnTime = result.time || getWIBTimeStr();
      const newTxn  = {
        ...txnData, id, date:txnDate, time:txnTime,
        transaction_date:txnDate, transaction_time:txnTime,
        payment:method, receiptNo:receipt_no,
        items:cart.map(i=>({name:i.name,qty:i.qty,price:i.price,cat:i.category,cost:i.cost}))
      };
      setTransactions(prev=>[newTxn,...prev]);
      setReceiptModal(newTxn);
      setCart([]);
      await loadSummary(selMonth,selYear);
      notify("Payment successful! 🎉",T.success);
    } catch(e){notify("Error: "+e.message,T.danger);}
    finally{setSaving(false);}
  };

  // Period label helper
  const periodLabel = () => {
    if(!selMonth) return `Year ${selYear}`;
    return `${MONTH_NAMES[selMonth]} ${selYear}`;
  };

  // ─── DASHBOARD ───────────────────────────────────────────
  const DashboardPage = () => {
    if(!summary) return <Spinner/>;
    const last7=Array.from({length:7},(_,i)=>{
      const d=new Date(new Date().getTime()+7*60*60*1000);
      d.setUTCDate(d.getUTCDate()-6+i);
      const ds=d.toISOString().split("T")[0];
      const day=summary.daily&&summary.daily.find(x=>x.date===ds);
      return {label:d.toLocaleDateString("en-US",{weekday:"short"}).slice(0,3),value:day?day.total:0};
    });
    const lowStock=products.filter(p=>p.stock<=p.reorder_point);
    const topProds=products.map(p=>({
      ...p,
      rev:transactions.reduce((s,t)=>s+(t.items||[]).filter(i=>(i.product_id||i.productId)===p.id).reduce((si,i)=>si+i.qty*(i.unit_price||i.price||0),0),0)
    })).sort((a,b)=>b.rev-a.rev).slice(0,5);

    return (
      <div>
        <div style={{marginBottom:24}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text,letterSpacing:-.5}}>Welcome back, {user.name.split(" ")[0]} 👋</div>
          <div style={{color:T.textMuted,fontSize:13,marginTop:3}}>
            {new Date(new Date().getTime()+7*60*60*1000).toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"})} WIB · {user.outlet}
          </div>
        </div>
        <div style={{...s.card,padding:"10px 16px",marginBottom:20,display:"flex",alignItems:"center",gap:12,background:T.mochaXfaint,border:`1px solid ${T.mochaLight}40`}}>
          <span style={{fontSize:14}}>📊</span>
          <span style={{fontSize:12,color:T.textSub,fontWeight:500}}>Showing data for:</span>
          <span style={{fontSize:13,fontWeight:700,color:T.mocha}}>{periodLabel()}</span>
          <div style={{marginLeft:"auto"}}><PeriodSelector periods={periods} selectedMonth={selMonth} selectedYear={selYear} onChange={onPeriodChange}/></div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:20}}>
          <KpiCard label={`Revenue — ${periodLabel()}`} value={fmt(summary.totalRevenue)} sub={`${fmtN(summary.transactionCount)} transactions`} color={T.mocha} icon="💵"/>
          <KpiCard label="Today (WIB)" value={fmt(todayTxns.reduce((s,t)=>s+(+t.total||0),0))} sub={`${todayTxns.length} transactions · ${wibToday}`} color={T.info} icon="📅"/>
          <KpiCard label="Net Income" value={fmt(summary.netIncome)} sub={`Margin ${summary.totalRevenue>0?((summary.netIncome/summary.totalRevenue)*100).toFixed(1):0}%`} color={T.success} icon="📈"/>
          <KpiCard label="Low Stock Items" value={lowStock.length} sub="Need reorder" color={T.danger} icon="⚠️"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"3fr 2fr",gap:16,marginBottom:16}}>
          <div style={{...s.card,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:T.text}}>7-Day Sales Trend (WIB)</div>
                <div style={{fontSize:12,color:T.textMuted}}>Including 11% VAT</div>
              </div>
              <Badge color={T.success}>Live</Badge>
            </div>
            <BarChart data={last7} color={T.mocha} height={140}/>
          </div>
          <div style={{...s.card,padding:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>Payment Methods — {periodLabel()}</div>
            {(summary.byPayment||[]).map(p=>(
              <div key={p.payment_method} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                  <span style={{fontSize:12,fontWeight:600,color:T.text}}>{p.payment_method}</span>
                  <span style={{fontSize:11,color:T.textMuted}}>{p.count} txn</span>
                </div>
                <MiniBar value={+p.total} max={summary.totalRevenue*1.15} color={payColors[p.payment_method]||T.mocha}/>
                <div style={{fontSize:11,color:T.textMuted,marginTop:2}}>{fmt(+p.total)}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div style={{...s.card,padding:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Top Products</div>
            {topProds.map((p,i)=>(
              <div key={p.id} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 0",borderBottom:i<4?`1px solid ${T.border}40`:"none"}}>
                <div style={{width:30,height:30,background:T.mochaFaint,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>{p.emoji||"🍞"}</div>
                <div style={{flex:1}}><div style={{fontSize:13,fontWeight:600,color:T.text}}>{p.name}</div></div>
                <div style={{fontSize:13,fontWeight:700,color:T.mocha}}>{fmt(p.rev)}</div>
              </div>
            ))}
          </div>
          <div style={{...s.card,padding:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Recent Transactions</div>
            {transactions.slice(0,7).map(t=>(
              <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid ${T.border}40`}}>
                <div>
                  <div style={{fontSize:12,fontWeight:600,color:T.text}}>{t.receipt_no||t.receiptNo}</div>
                  <div style={{fontSize:11,color:T.textMuted}}>{t.date||t.transaction_date} · {t.time||String(t.transaction_time||"").slice(0,5)}</div>
                </div>
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <span style={{fontSize:13,fontWeight:700,color:T.mocha}}>{fmt(+t.total)}</span>
                  <Badge color={payColors[t.payment||t.payment_method]}>{t.payment||t.payment_method}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ─── POS PAGE ────────────────────────────────────────────
  const POSPage = () => {
    const [cat,setCat]=useState("All");
    const [q,setQ]=useState("");
    const [payModal,setPayModal]=useState(false);
    const cats=["All",...new Set(products.map(p=>p.category))];
    const filtered=products.filter(p=>(cat==="All"||p.category===cat)&&p.name.toLowerCase().includes(q.toLowerCase()));
    return (
      <div style={{display:"grid",gridTemplateColumns:"1fr 330px",gap:16,height:"calc(100vh - 112px)"}}>
        <div style={{overflow:"auto"}}>
          <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search products..." style={{...s.input,flex:1,minWidth:160}}/>
            {cats.map(c=><button key={c} onClick={()=>setCat(c)} style={{background:cat===c?T.mocha:T.bgCard,color:cat===c?"#fff":T.textSub,border:`1.5px solid ${cat===c?T.mocha:T.border}`,borderRadius:T.radiusPill,padding:"7px 14px",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>{c}</button>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(155px,1fr))",gap:12}}>
            {filtered.map(p=>(
              <div key={p.id} onClick={()=>addToCart(p)}
                style={{...s.card,padding:14,cursor:p.stock===0?"not-allowed":"pointer",opacity:p.stock===0?.55:1,transition:"all .15s"}}
                onMouseEnter={e=>p.stock>0&&(e.currentTarget.style.boxShadow=T.shadowMd,e.currentTarget.style.borderColor=T.mochaLight)}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow=T.shadow;e.currentTarget.style.borderColor=T.border;}}>
                <div style={{fontSize:34,textAlign:"center",marginBottom:10}}>{p.emoji||"🍞"}</div>
                <div style={{fontSize:12,fontWeight:700,color:T.text,marginBottom:2,lineHeight:1.3}}>{p.name}</div>
                <div style={{fontSize:11,color:T.textMuted,marginBottom:8}}>{p.category}</div>
                <div style={{fontSize:15,fontWeight:800,color:T.mocha}}>{fmt(p.price)}</div>
                <div style={{fontSize:11,marginTop:6,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                  <span style={{color:p.stock===0?T.danger:p.stock<=p.reorder_point?T.warn:T.textMuted}}>Stock: {p.stock}</span>
                  {p.stock<=p.reorder_point&&p.stock>0&&<Badge color={T.warn}>Low</Badge>}
                  {p.stock===0&&<Badge color={T.danger}>Out</Badge>}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Cart */}
        <div style={{...s.card,display:"flex",flexDirection:"column",overflow:"hidden"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:T.text}}>Order</span>
            <Badge color={T.mocha}>{cart.length} items</Badge>
          </div>
          <div style={{flex:1,overflow:"auto",padding:"12px 16px"}}>
            {!cart.length?<div style={{textAlign:"center",color:T.textMuted,padding:"40px 0",fontSize:13}}>Select products from the catalog</div>:
              cart.map(item=>(
                <div key={item.id} style={{display:"flex",gap:10,marginBottom:10,padding:"10px 12px",background:T.bgStripe,borderRadius:T.radius,alignItems:"center"}}>
                  <div style={{fontSize:22}}>{item.emoji||"🍞"}</div>
                  <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,color:T.text}}>{item.name}</div><div style={{fontSize:11,color:T.mocha}}>{fmt(item.price)} × {item.qty}</div></div>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <button onClick={()=>{if(item.qty===1)removeFromCart(item.id);else{setCart(p=>p.map(i=>i.id===item.id?{...i,qty:i.qty-1}:i));setProducts(p=>p.map(q=>q.id===item.id?{...q,stock:q.stock+1}:q));} }} style={{background:T.border,border:"none",color:T.text,width:24,height:24,borderRadius:6,cursor:"pointer",fontSize:16,lineHeight:1}}>−</button>
                    <span style={{fontSize:13,fontWeight:700,minWidth:16,textAlign:"center",color:T.text}}>{item.qty}</span>
                    <button onClick={()=>addToCart(item)} style={{background:T.mochaFaint,border:"none",color:T.mocha,width:24,height:24,borderRadius:6,cursor:"pointer",fontSize:16,lineHeight:1}}>+</button>
                  </div>
                </div>
              ))
            }
          </div>
          <div style={{padding:"14px 16px",borderTop:`1px solid ${T.border}`}}>
            {[["Subtotal",fmt(cartSub)],["VAT 11%",fmt(cartTax)]].map(([l,v])=>(
              <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><span style={{fontSize:12,color:T.textMuted}}>{l}</span><span style={{fontSize:13,color:T.text}}>{v}</span></div>
            ))}
            <div style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderTop:`1px solid ${T.border}`,marginBottom:12}}>
              <span style={{fontSize:15,fontWeight:800,color:T.text}}>Total</span>
              <span style={{fontSize:18,fontWeight:800,color:T.mocha}}>{fmt(cartTotal)}</span>
            </div>
            <button onClick={()=>cart.length>0&&setPayModal(true)}
              style={{...s.btn(cart.length?T.mocha:T.textFaint),width:"100%",justifyContent:"center",padding:"12px",fontSize:14,cursor:cart.length?"pointer":"not-allowed"}}>
              Process Payment →
            </button>
          </div>
        </div>

        {payModal&&(
          <Modal title="Select Payment Method" onClose={()=>setPayModal(false)} width={340}>
            <div style={{fontSize:22,fontWeight:800,color:T.mocha,textAlign:"center",marginBottom:6}}>{fmt(cartTotal)}</div>
            <div style={{textAlign:"center",fontSize:11,color:T.textMuted,marginBottom:20}}>WIB Time: {getWIBTimeStr()} · Date: {wibToday}</div>
            {["Cash","QRIS","GoPay","Debit"].map(m=>(
              <button key={m} onClick={()=>{processPayment(m);setPayModal(false);}} disabled={saving}
                style={{...s.btnO(payColors[m]),width:"100%",justifyContent:"center",padding:"12px",fontSize:14,marginBottom:9,opacity:saving?.6:1}}>
                {{"Cash":"💵 Cash","QRIS":"📱 QRIS","GoPay":"🟢 GoPay","Debit":"💳 Debit Card"}[m]}
              </button>
            ))}
          </Modal>
        )}
        {receiptModal&&(
          <Modal title="Sales Receipt" onClose={()=>setReceiptModal(null)} width={360}>
            <div style={{textAlign:"center",marginBottom:16}}>
              <div style={{fontSize:32,marginBottom:8}}>🧾</div>
              <div style={{fontSize:16,fontWeight:800,color:T.success}}>Payment Successful!</div>
              <div style={{fontSize:11,color:T.textMuted,marginTop:3}}>{receiptModal.receiptNo||receiptModal.receipt_no}</div>
            </div>
            <div style={{background:T.bgStripe,borderRadius:T.radius,padding:16,border:`1px dashed ${T.border}`}}>
              <div style={{textAlign:"center",marginBottom:12}}>
                <div style={{fontWeight:800,color:T.text}}>KHASANAH SARI BAKERY</div>
                <div style={{fontSize:11,color:T.textMuted}}>Grand Indonesia · {receiptModal.date} {receiptModal.time}</div>
              </div>
              {(receiptModal.items||[]).map((item,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:5}}>
                  <span style={{color:T.textSub}}>{item.name} × {item.qty}</span>
                  <span style={{color:T.text,fontWeight:600}}>{fmt((item.price||item.unit_price)*item.qty)}</span>
                </div>
              ))}
              <div style={{borderTop:`1px dashed ${T.borderMid}`,marginTop:10,paddingTop:10}}>
                {[["Subtotal",fmt(receiptModal.subtotal)],["VAT 11%",fmt(receiptModal.tax)]].map(([l,v])=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}><span style={{color:T.textMuted}}>{l}</span><span>{v}</span></div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",fontWeight:800,marginTop:6}}>
                  <span style={{color:T.text}}>TOTAL</span><span style={{color:T.mocha,fontSize:16}}>{fmt(receiptModal.total)}</span>
                </div>
                <div style={{textAlign:"center",marginTop:8}}><Badge color={payColors[receiptModal.payment||receiptModal.payment_method]}>{receiptModal.payment||receiptModal.payment_method}</Badge></div>
              </div>
            </div>
            <button onClick={()=>setReceiptModal(null)} style={{...s.btn(T.mocha),width:"100%",justifyContent:"center",padding:"12px",marginTop:14,fontSize:14}}>Done</button>
          </Modal>
        )}
      </div>
    );
  };

  // ─── CASH RECEIPT ────────────────────────────────────────
  const CashPage = () => {
    const [cashData,setCashData] = useState(null);
    const [selectedDate,setSelectedDate] = useState(wibToday);
    const [verifying,setVerifying] = useState(false);

    useEffect(()=>{
      setCashData(null);
      api.getCashReceipt(selectedDate).then(setCashData).catch(console.error);
    },[selectedDate]);

    if(!cashData) return <Spinner/>;
    const {transactions:dayTxns=[],byMethod={},total=0,date:reportDate} = cashData;
    const mths=["Cash","QRIS","GoPay","Debit"];
    const expH=["Receipt No","Time","Cashier","Items","Subtotal","VAT","Total","Payment"];
    const expR=dayTxns.map(t=>[t.receipt_no||t.receiptNo,t.time||String(t.transaction_time||"").slice(0,5),t.cashier_name||t.cashier,(t.items||[]).length+" items",fmt(+t.subtotal),fmt(+t.tax),fmt(+t.total),t.payment_method||t.payment]);

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:T.text}}>Daily Cash Receipt</div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>
              Showing: <strong style={{color:T.mocha}}>{reportDate||selectedDate}</strong> (WIB)
            </div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:12,color:T.textMuted,fontWeight:600}}>Date:</span>
              <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)}
                style={{...s.input,width:"auto",padding:"7px 10px",fontSize:12}}/>
              <button onClick={()=>setSelectedDate(wibToday)} style={{...s.btnO(T.mocha),padding:"7px 12px",fontSize:11}}>Today</button>
            </div>
            <ExportBar title={`Cash Receipt Report — ${selectedDate}`} subtitle={`Date: ${selectedDate} · Outlet: Grand Indonesia`} headers={expH} rows={expR} summary={[["Total Cash Received",fmt(total)]]}/>
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,marginBottom:20}}>
          <KpiCard label="Total Today" value={fmt(total)} color={T.mocha} icon="💰"/>
          {mths.map(m=><KpiCard key={m} label={m} value={fmt(byMethod[m]||0)} sub={`${dayTxns.filter(t=>(t.payment_method||t.payment)===m).length} txn`} color={payColors[m]} icon={{Cash:"💵",QRIS:"📱",GoPay:"🟢",Debit:"💳"}[m]}/>)}
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
          <div style={{...s.card,padding:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Cash Breakdown by Method</div>
            <DataTable headers={["Method","Transactions","Total","Status"]}
              rows={mths.map(m=>[<Badge color={payColors[m]}>{m}</Badge>,dayTxns.filter(t=>(t.payment_method||t.payment)===m).length,fmt(byMethod[m]||0),<Badge color={T.success}>✓ Verified</Badge>])}/>
            <div style={{marginTop:14,padding:"12px 14px",background:T.mochaXfaint,borderRadius:T.radius,display:"flex",justifyContent:"space-between"}}>
              <span style={{fontWeight:700,color:T.text}}>Grand Total</span>
              <span style={{fontWeight:800,fontSize:17,color:T.mocha}}>{fmt(total)}</span>
            </div>
          </div>
          <div style={{...s.card,padding:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Bank BCA Deposit Slip</div>
            <div style={{background:T.bgStripe,borderRadius:T.radius,padding:16,border:`1px dashed ${T.borderMid}`}}>
              <div style={{fontWeight:800,color:T.text,fontSize:13,textAlign:"center",marginBottom:3}}>DEPOSIT SLIP</div>
              <div style={{fontSize:11,color:T.textMuted,textAlign:"center",marginBottom:14}}>BCA · Acc: 1234-5678-90 · Khasanah Sari Bakery · {selectedDate}</div>
              {mths.map(m=><div key={m} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:7}}><span style={{color:T.textSub}}>{m}</span><span style={{color:T.text,fontWeight:600}}>{fmt(byMethod[m]||0)}</span></div>)}
              <div style={{borderTop:`1px solid ${T.border}`,paddingTop:10,marginTop:8,display:"flex",justifyContent:"space-between",fontWeight:800}}>
                <span style={{color:T.text}}>TOTAL DEPOSIT</span><span style={{color:T.mocha}}>{fmt(total)}</span>
              </div>
            </div>
            {canEdit&&(
              <button disabled={verifying} onClick={async()=>{setVerifying(true);try{await api.verifyDeposit(selectedDate,user.name);notify("Deposit approved! 🏦",T.success);}catch(e){notify(e.message,T.danger);}finally{setVerifying(false);}}}
                style={{...s.btn(T.success),width:"100%",justifyContent:"center",padding:"11px",marginTop:12,fontSize:13,opacity:verifying?.7:1}}>
                ✅ {verifying?"Processing...":"Approve & Submit Deposit"}
              </button>
            )}
          </div>
        </div>

        <div style={{...s.card,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>Transaction Detail — {selectedDate}</div>
              <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{dayTxns.length} transactions recorded</div>
            </div>
            <ExportBar title={`Transactions ${selectedDate}`} subtitle={`Date: ${selectedDate}`} headers={expH} rows={expR}/>
          </div>
          {dayTxns.length===0
            ?<div style={{textAlign:"center",color:T.textMuted,padding:"40px 0",fontSize:13}}>No transactions recorded for {selectedDate}</div>
            :<DataTable headers={[...expH,"Detail"]} rows={dayTxns.map(t=>[t.receipt_no||t.receiptNo,t.time||String(t.transaction_time||"").slice(0,5),t.cashier_name||t.cashier,(t.items||[]).length+" items",fmt(+t.subtotal),fmt(+t.tax),<span style={{fontWeight:700,color:T.mocha}}>{fmt(+t.total)}</span>,<Badge color={payColors[t.payment_method||t.payment]}>{t.payment_method||t.payment}</Badge>,<button onClick={()=>setTxnDetailId(t.id)} style={{...s.btnO(T.mocha),padding:"3px 10px",fontSize:11}}>Lihat</button>])}/>
          }
        </div>
      </div>
    );
  };

  // ─── INVENTORY ───────────────────────────────────────────
  const InventoryPage = () => {
    const [editModal,setEditModal] = useState(null);
    const [addModal,setAddModal]   = useState(false);
    const [adjModal,setAdjModal]   = useState(null);
    const [form,setForm]           = useState({});
    const [isSaving,setIsSaving]   = useState(false);
    const lowStock = products.filter(p=>p.stock<=p.reorder_point);
    const fh = (k,v) => setForm(p=>({...p,[k]:v}));
    const F = ({label,fkey,type="text",opts}) => (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>{label}</div>
        {opts
          ?<select value={form[fkey]||""} onChange={e=>fh(fkey,e.target.value)} style={{...s.input}}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
          :<input type={type} value={form[fkey]||""} onChange={e=>fh(fkey,e.target.value)} style={{...s.input}}
              onFocus={e=>e.target.style.borderColor=T.mocha} onBlur={e=>e.target.style.borderColor=T.border}/>}
      </div>
    );
    const expH=["SKU","Product","Category","Supplier","Stock","Reorder","Cost","Price","Status"];
    const expR=products.map(p=>[p.sku,p.name,p.category,p.supplier||"—",p.stock,p.reorder_point,fmt(p.cost),fmt(p.price),p.stock===0?"Out of Stock":p.stock<=p.reorder_point?"Low Stock":"Available"]);

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div><div style={{fontSize:22,fontWeight:800,color:T.text}}>Inventory Management</div><div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{products.length} active SKUs</div></div>
          <div style={{display:"flex",gap:8}}>
            <ExportBar title="Inventory Report" subtitle={`As of: ${wibToday}`} headers={expH} rows={expR}/>
            {canEdit&&<button onClick={()=>{setForm({name:"",category:"Bread",price:0,cost:0,stock:0,reorder_point:5,sku:"",supplier:"",emoji:""});setAddModal(true);}} style={s.btn(T.mocha)}>+ Add Product</button>}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
          <KpiCard label="Total SKUs" value={products.length} color={T.info} icon="📦"/>
          <KpiCard label="Need Reorder" value={lowStock.length} color={T.danger} icon="⚠️"/>
          <KpiCard label="Stock Value" value={fmt(products.reduce((s,p)=>s+p.stock*p.cost,0))} color={T.success} icon="💎"/>
          <KpiCard label="Adjustments Today" value={invLogs.filter(l=>(l.date||l.log_date)===wibToday).length} color={T.purple} icon="📋"/>
        </div>
        {lowStock.length>0&&(
          <div style={{background:T.warnBg,border:`1.5px solid ${T.warn}40`,borderRadius:T.radius,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span>⚠️</span>
            <div><div style={{fontSize:13,fontWeight:700,color:T.warn}}>Low Stock Alert</div><div style={{fontSize:12,color:T.textSub}}>{lowStock.map(p=>p.name).join(" · ")}</div></div>
          </div>
        )}
        <div style={{...s.card,padding:20,marginBottom:16}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Product & Stock List</div>
          <DataTable headers={["SKU","Product","Category","Supplier","Stock","Reorder","Cost","Price","Status",canEdit?"Actions":""]}
            rows={products.map(p=>[
              <span style={{fontFamily:"monospace",fontSize:11,color:T.textMuted}}>{p.sku}</span>,
              <div style={{display:"flex",alignItems:"center",gap:8}}><span>{p.emoji||"🍞"}</span><span style={{fontWeight:600}}>{p.name}</span></div>,
              p.category,p.supplier||"—",
              <span style={{fontWeight:700,color:p.stock===0?T.danger:p.stock<=p.reorder_point?T.warn:T.success}}>{p.stock}</span>,
              p.reorder_point,fmt(p.cost),fmt(p.price),
              p.stock===0?<Badge color={T.danger}>Out of Stock</Badge>:p.stock<=p.reorder_point?<Badge color={T.warn}>Low Stock</Badge>:<Badge color={T.success}>Available</Badge>,
              canEdit?<div style={{display:"flex",gap:5}}>
                <button onClick={()=>setAdjModal(p)} style={{...s.btnO(T.info),padding:"4px 8px",fontSize:11}}>±Adj</button>
                <button onClick={()=>{setForm({...p});setEditModal(p.id);}} style={{...s.btnO(T.mocha),padding:"4px 8px",fontSize:11}}>Edit</button>
                <button onClick={async()=>{if(!confirm("Delete this product?"))return;await api.deleteProduct(p.id);await loadProducts();notify("Deleted",T.warn);}} style={{...s.btnO(T.danger),padding:"4px 8px",fontSize:11}}>Del</button>
              </div>:"",
            ])}/>
        </div>
        {invLogs.length>0&&(
          <div style={{...s.card,padding:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Stock Adjustment Log</div>
            <DataTable compact headers={["Date","Time","Product","Type","Qty","Reason","By"]}
              rows={invLogs.slice(0,15).map(l=>[l.date||l.log_date,l.time||String(l.log_time||"").slice(0,5),l.product||l.product_name,<Badge color={l.type==="Restock"?T.success:T.warn}>{l.type||l.movement_type}</Badge>,l.qty||Math.abs(l.quantity_change||0),l.reason,l.by||l.performed_by])}/>
          </div>
        )}

        {editModal&&<Modal title="Edit Product" onClose={()=>setEditModal(null)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            <div style={{paddingRight:12}}><F label="Product Name" fkey="name"/><F label="SKU" fkey="sku"/><F label="Category" fkey="category" opts={["Bread","Pastry","Cake","Beverage"]}/><F label="Supplier" fkey="supplier"/></div>
            <div style={{paddingLeft:12}}><F label="Sell Price (Rp)" fkey="price" type="number"/><F label="Cost (Rp)" fkey="cost" type="number"/><F label="Current Stock" fkey="stock" type="number"/><F label="Reorder Point" fkey="reorder_point" type="number"/></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <button onClick={()=>setEditModal(null)} style={s.btnO(T.textMuted)}>Cancel</button>
            <button disabled={isSaving} onClick={async()=>{setIsSaving(true);try{await api.updateProduct(editModal,form);await loadProducts();setEditModal(null);notify("Product updated",T.success);}catch(e){notify(e.message,T.danger);}finally{setIsSaving(false);}}} style={s.btn(T.mocha)}>{isSaving?"Saving...":"Save Changes"}</button>
          </div>
        </Modal>}

        {addModal&&<Modal title="Add New Product" onClose={()=>setAddModal(false)}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
            <div style={{paddingRight:12}}><F label="Product Name" fkey="name"/><F label="SKU" fkey="sku"/><F label="Category" fkey="category" opts={["Bread","Pastry","Cake","Beverage"]}/><F label="Supplier" fkey="supplier"/></div>
            <div style={{paddingLeft:12}}><F label="Sell Price (Rp)" fkey="price" type="number"/><F label="Cost (Rp)" fkey="cost" type="number"/><F label="Initial Stock" fkey="stock" type="number"/><F label="Reorder Point" fkey="reorder_point" type="number"/></div>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
            <button onClick={()=>setAddModal(false)} style={s.btnO(T.textMuted)}>Cancel</button>
            <button disabled={isSaving} onClick={async()=>{setIsSaving(true);try{await api.createProduct(form);await loadProducts();setAddModal(false);notify("Product added",T.success);}catch(e){notify(e.message,T.danger);}finally{setIsSaving(false);}}} style={s.btn(T.mocha)}>{isSaving?"Saving...":"Add Product"}</button>
          </div>
        </Modal>}

        {adjModal&&<Modal title={`Adjust Stock — ${adjModal.name}`} onClose={()=>setAdjModal(null)} width={380}>
          <div style={{background:T.bgStripe,borderRadius:T.radius,padding:"12px 14px",marginBottom:16,fontSize:13}}>
            <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.textMuted}}>Current stock</span><span style={{fontWeight:700}}>{adjModal.stock} units</span></div>
          </div>
          <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Adjustment Qty (+ add / − reduce)</div><input type="number" value={form.adjQty||""} onChange={e=>fh("adjQty",e.target.value)} placeholder="e.g. +10 or -3" style={{...s.input}}/></div>
          <div style={{marginBottom:14}}><div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Movement Type</div><select value={form.adjType||"Adjustment"} onChange={e=>fh("adjType",e.target.value)} style={{...s.input}}><option>Adjustment</option><option>Restock</option><option>Damage</option><option>Return</option></select></div>
          <div style={{marginBottom:16}}><div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Reason</div><input value={form.adjReason||""} onChange={e=>fh("adjReason",e.target.value)} placeholder="Stock count / damage / return..." style={{...s.input}}/></div>
          {form.adjQty&&<div style={{background:T.mochaFaint,borderRadius:T.radius,padding:"10px 14px",fontSize:12,marginBottom:14}}>After adjustment: <strong>{Math.max(0,adjModal.stock+(+form.adjQty||0))}</strong> units</div>}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <button onClick={()=>setAdjModal(null)} style={s.btnO(T.textMuted)}>Cancel</button>
            <button disabled={isSaving} onClick={async()=>{setIsSaving(true);try{await api.adjustStock(adjModal.id,+form.adjQty||0,form.adjReason||"",user.name,form.adjType||"Adjustment");await loadProducts();await loadInvLogs();setAdjModal(null);notify(`Stock adjusted: ${(+form.adjQty||0)>=0?"+":""}${form.adjQty}`,T.success);}catch(e){notify(e.message,T.danger);}finally{setIsSaving(false);}}} style={s.btn(T.mocha)}>{isSaving?"Saving...":"Apply Adjustment"}</button>
          </div>
        </Modal>}
      </div>
    );
  };

  // ─── ACCOUNTING ──────────────────────────────────────────
  const AccountingPage = ({sub: initSub} = {}) => {
    const [tab,setTab]       = useState("journal");
    const activeTab = initSub || tab;
    const [journals,setJournals] = useState([]);
    const [gl,setGl]         = useState([]);
    const [acctMonth,setAcctMonth] = useState(selMonth);
    const [acctYear,setAcctYear]   = useState(selYear);
    const [loadingData,setLoadingData] = useState(false);

    const loadData = async (m,y) => {
      setLoadingData(true);
      try {
        const [j,g] = await Promise.all([api.getJournalEntries(m,y,500), api.getGeneralLedger(m,y)]);
        setJournals(j); setGl(g);
      } catch(e){notify(e.message,T.danger);}
      finally{setLoadingData(false);}
    };

    useEffect(()=>{ loadData(acctMonth,acctYear); },[acctMonth,acctYear]);

    const onAcctPeriodChange = (m,y) => { setAcctMonth(m); setAcctYear(y); };
    const periodStr = acctMonth ? `${MONTH_NAMES[acctMonth]} ${acctYear}` : `Year ${acctYear}`;

    const tbDebit  = gl.filter(a=>a.normal==="D").reduce((s,a)=>s+(+a.balance||0),0);
    const tbCredit = gl.filter(a=>a.normal==="K").reduce((s,a)=>s+(+a.balance||0),0);
    const tabs = [{id:"journal",label:"Sales Journal"},{id:"cashj",label:"Cash Journal"},{id:"gl",label:"General Ledger"},{id:"trial",label:"Trial Balance"}];
    const tClr = {Asset:T.info,Liability:T.danger,Equity:T.purple,Revenue:T.success,Expense:T.warn};

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>Accounting</div>
          <PeriodSelector periods={periods} selectedMonth={acctMonth} selectedYear={acctYear} onChange={onAcctPeriodChange}/>
        </div>
        {loadingData&&<div style={{...s.card,padding:"12px 16px",marginBottom:16,color:T.textMuted,fontSize:13}}>Loading data for {periodStr}...</div>}
        {!initSub&&<div style={{display:"flex",gap:4,marginBottom:20,borderBottom:`1.5px solid ${T.border}`}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",color:activeTab===t.id?T.mocha:T.textMuted,fontWeight:activeTab===t.id?700:500,fontSize:13,padding:"10px 16px",cursor:"pointer",borderBottom:`2.5px solid ${activeTab===t.id?T.mocha:"transparent"}`,marginBottom:-2,transition:"all .15s",fontFamily:"inherit"}}>{t.label}</button>)}
        </div>}

        {activeTab==="journal"&&<div style={{...s.card,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>Sales Journal — {periodStr}</div>
            <ExportBar title={`Sales Journal ${periodStr}`} subtitle={`Period: ${periodStr}`} headers={["Date","Description","Account","Debit","Credit"]} rows={journals.slice(0,200).map(j=>[j.date||j.entry_date,j.desc||j.description,j.account||j.account_code,+j.debit>0?fmt(+j.debit):"—",+j.credit>0?fmt(+j.credit):"—"])} summary={[["Total Debit",fmt(journals.reduce((s,j)=>s+(+j.debit||0),0))],["Total Credit",fmt(journals.reduce((s,j)=>s+(+j.credit||0),0))]]}/>
          </div>
          <DataTable headers={["Date","Description","Account Code","Debit","Credit"]}
            rows={journals.slice(0,30).map(j=>[j.date||String(j.entry_date||"").split("T")[0],<span style={{fontSize:12}}>{j.desc||j.description}</span>,<span style={{fontFamily:"monospace",fontSize:11,color:T.textMuted}}>{j.account||j.account_code}</span>,(+j.debit)>0?<span style={{color:T.info,fontWeight:600}}>{fmt(+j.debit)}</span>:"—",(+j.credit)>0?<span style={{color:T.success,fontWeight:600}}>{fmt(+j.credit)}</span>:"—"])}/>
        </div>}

        {activeTab==="cashj"&&<div style={{...s.card,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>Cash Receipts Journal — {periodStr}</div>
            <ExportBar title={`Cash Receipts Journal ${periodStr}`} subtitle={`Period: ${periodStr}`} headers={["Date","Receipt No","Cashier","Total","Method","Dr. Cash","Cr. Revenue"]} rows={transactions.filter(t=>{const d=new Date(t.date||t.transaction_date);return(!acctMonth||d.getMonth()+1===acctMonth)&&d.getFullYear()===acctYear;}).slice(0,200).map(t=>[t.date||t.transaction_date,t.receipt_no||t.receiptNo,t.cashier_name||t.cashier,fmt(+t.total),t.payment_method||t.payment,fmt(+t.total),fmt(+t.subtotal)])}/>
          </div>
          <DataTable headers={["Date","Receipt No","Cashier","Total","Method","Dr. Cash","Cr. Revenue","Detail"]}
            rows={transactions.filter(t=>{const d=new Date(t.date||t.transaction_date);return(!acctMonth||d.getMonth()+1===acctMonth)&&d.getFullYear()===acctYear;}).slice(0,20).map(t=>[t.date||String(t.transaction_date||"").split("T")[0],t.receipt_no||t.receiptNo,t.cashier_name||t.cashier,fmt(+t.total),<Badge color={payColors[t.payment_method||t.payment]}>{t.payment_method||t.payment}</Badge>,<span style={{color:T.info,fontWeight:600}}>{fmt(+t.total)}</span>,<span style={{color:T.success,fontWeight:600}}>{fmt(+t.subtotal)}</span>,<button onClick={()=>setTxnDetailId(t.id)} style={{...s.btnO(T.mocha),padding:"3px 10px",fontSize:11}}>Lihat</button>])}/>
        </div>}

        {activeTab==="gl"&&<div style={{...s.card,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text}}>General Ledger — {periodStr}</div>
            <ExportBar title={`General Ledger ${periodStr}`} subtitle={`Period: ${periodStr}`} headers={["Code","Account","Type","Debit","Credit","Balance"]} rows={gl.map(a=>[a.code,a.name,a.type||a.account_type,fmt(+a.debit),fmt(+a.credit),fmt(+a.balance)])}/>
          </div>
          <DataTable headers={["Account Code","Account Name","Type","Total Debit","Total Credit","Balance"]}
            rows={gl.map(a=>[<span style={{fontFamily:"monospace",fontSize:11,color:T.textMuted}}>{a.code}</span>,<span style={{fontWeight:600}}>{a.name}</span>,<Badge color={tClr[a.type||a.account_type]}>{a.type||a.account_type}</Badge>,<span style={{color:T.info}}>{fmt(+a.debit)}</span>,<span style={{color:T.success}}>{fmt(+a.credit)}</span>,<span style={{fontWeight:700,color:(+a.balance)>=0?T.mocha:T.danger}}>{fmt(+a.balance)}</span>])}/>
        </div>}

        {activeTab==="trial"&&<div style={{...s.card,padding:20}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div><div style={{fontSize:14,fontWeight:700,color:T.text}}>Trial Balance — {periodStr}</div><div style={{fontSize:12,color:T.textMuted,marginTop:2}}>Debit must equal Credit</div></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <Badge color={Math.abs(tbDebit-tbCredit)<1?T.success:T.danger}>{Math.abs(tbDebit-tbCredit)<1?"✓ Balanced":"✗ Check entries"}</Badge>
              <ExportBar title={`Trial Balance ${periodStr}`} subtitle={`Khasanah Sari Bakery · ${periodStr}`} headers={["Code","Account","Debit","Credit"]} rows={gl.map(a=>[a.code,a.name,a.normal==="D"&&(+a.balance)>0?fmt(+a.balance):"—",a.normal==="K"&&(+a.balance)>0?fmt(+a.balance):"—"])} summary={[["Total Debit",fmt(tbDebit)],["Total Credit",fmt(tbCredit)]]}/>
            </div>
          </div>
          <DataTable headers={["Account Code","Account Name","Debit","Credit"]}
            rows={[...gl.map(a=>[<span style={{fontFamily:"monospace",fontSize:11,color:T.textMuted}}>{a.code}</span>,a.name,a.normal==="D"&&(+a.balance)>0?<span style={{color:T.info,fontWeight:600}}>{fmt(+a.balance)}</span>:"—",a.normal==="K"&&(+a.balance)>0?<span style={{color:T.success,fontWeight:600}}>{fmt(+a.balance)}</span>:"—"]),["",<span style={{fontWeight:800}}>TOTAL</span>,<span style={{fontWeight:800,color:T.info}}>{fmt(tbDebit)}</span>,<span style={{fontWeight:800,color:T.success}}>{fmt(tbCredit)}</span>]]}/>
        </div>}
      </div>
    );
  };

  // ─── FINANCIAL REPORTS ────────────────────────────────────
  const ReportsPage = () => {
    const [tab,setTab]           = useState("income");
    const [rptMonth,setRptMonth] = useState(selMonth);
    const [rptYear,setRptYear]   = useState(selYear);
    const [rptData,setRptData]   = useState(summary);
    const [loadingRpt,setLoadingRpt] = useState(false);

    const loadReport = async (m,y) => {
      setLoadingRpt(true);
      try { const d=await api.getReportSummary(m,y); setRptData(d); }
      catch(e){notify(e.message,T.danger);}
      finally{setLoadingRpt(false);}
    };

    useEffect(()=>{ loadReport(rptMonth,rptYear); },[rptMonth,rptYear]);

    const onRptPeriodChange = (m,y) => { setRptMonth(m); setRptYear(y); };
    const periodStr = rptMonth ? `${MONTH_NAMES[rptMonth]} ${rptYear}` : `Year ${rptYear}`;

    if(!rptData) return <Spinner/>;
    const {totalRevenue:totalRev=0,totalCOGS=0,grossProfit=0,totalOpEx=0,netIncome=0,byCategory=[],daily=[],expenses={}} = rptData;
    const gm = totalRev>0?((grossProfit/totalRev)*100).toFixed(1):0;
    const nm = totalRev>0?((netIncome/totalRev)*100).toFixed(1):0;

    const SRow = ({label,value,indent=false,bold=false,highlight=false,color,negative=false}) => (
      <div style={{display:"flex",justifyContent:"space-between",padding:`${bold?"10":"6"}px 0`,borderTop:bold?`1px solid ${T.border}`:"none",marginTop:bold?4:0}}>
        <span style={{fontSize:13,color:highlight?T.mocha:T.textSub,fontWeight:bold?700:400,paddingLeft:indent?16:0}}>{label}</span>
        <span style={{fontSize:bold?15:13,fontWeight:bold?800:500,color:color||(highlight?T.mocha:(negative?T.danger:T.text))}}>{fmt(value)}</span>
      </div>
    );
    const tabs=[{id:"income",label:"Income Statement"},{id:"balance",label:"Balance Sheet"},{id:"cashflow",label:"Cash Flow"},{id:"analytics",label:"Analytics"}];

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:12}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>Financial Reports</div>
          <PeriodSelector periods={periods} selectedMonth={rptMonth} selectedYear={rptYear} onChange={onRptPeriodChange}/>
        </div>
        {loadingRpt&&<div style={{...s.card,padding:"12px 16px",marginBottom:16,color:T.textMuted,fontSize:13}}>Loading {periodStr} data...</div>}

        <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:`1.5px solid ${T.border}`}}>
          {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{background:"transparent",border:"none",color:tab===t.id?T.mocha:T.textMuted,fontWeight:tab===t.id?700:500,fontSize:13,padding:"10px 16px",cursor:"pointer",borderBottom:`2.5px solid ${tab===t.id?T.mocha:"transparent"}`,marginBottom:-2,transition:"all .15s",fontFamily:"inherit"}}>{t.label}</button>)}
        </div>

        {tab==="income"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            <div style={{...s.card,padding:24}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
                <div>
                  <div style={{fontWeight:800,color:T.text,fontSize:15}}>KHASANAH SARI BAKERY</div>
                  <div style={{fontSize:12,color:T.textMuted}}>Income Statement</div>
                  <div style={{fontSize:12,color:T.mocha,fontWeight:600}}>Period: {periodStr}</div>
                </div>
                <ExportBar title={`Income Statement ${periodStr}`} subtitle={`Khasanah Sari Bakery · ${periodStr}`}
                  headers={["Description","Amount"]}
                  rows={[...byCategory.map(c=>[`${c.category} Revenue`,fmt(+c.revenue)]),["Total Revenue",fmt(totalRev)],["COGS",fmt(totalCOGS)],["Gross Profit",fmt(grossProfit)],["Salary",fmt(expenses.salary||8500000)],["Rent",fmt(expenses.rent||5000000)],["Utilities",fmt(expenses.utilities||1800000)],["Depreciation",fmt(expenses.depreciation||600000)],["QRIS/MDR Fee",fmt(expenses.qrisFee||0)],["Total Expenses",fmt(totalOpEx)],["NET INCOME",fmt(netIncome)]]}
                  summary={[["Gross Margin",gm+"%"],["Net Margin",nm+"%"]]}/>
              </div>
              <div style={{borderBottom:`1.5px solid ${T.border}`,paddingBottom:14,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>Revenue</div>
                {byCategory.map(c=><SRow key={c.category} label={`${c.category} Revenue`} value={+c.revenue} indent/>)}
                <SRow label="Total Revenue" value={totalRev} bold highlight/>
              </div>
              <div style={{borderBottom:`1.5px solid ${T.border}`,paddingBottom:14,marginBottom:14}}>
                <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>Cost of Goods Sold</div>
                <SRow label="COGS — Raw Materials" value={totalCOGS} indent/>
                <SRow label="Gross Profit" value={grossProfit} bold/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>Operating Expenses</div>
                {[["Salary Expense",expenses.salary||8500000],["Rent Expense",expenses.rent||5000000],["Utilities Expense",expenses.utilities||1800000],["Depreciation Expense",expenses.depreciation||600000],["QRIS/MDR Fee",expenses.qrisFee||0]].map(([l,v])=><SRow key={l} label={l} value={v} indent/>)}
                <SRow label="Total Expenses" value={totalOpEx} bold/>
                <div style={{background:T.mochaXfaint,borderRadius:T.radius,padding:"12px 14px",marginTop:12}}>
                  <SRow label="NET INCOME" value={netIncome} bold highlight color={netIncome>=0?T.mocha:T.danger}/>
                </div>
              </div>
            </div>
            <div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:16}}>
                <KpiCard label="Total Revenue" value={fmt(totalRev)} color={T.success} icon="💵"/>
                <KpiCard label="Gross Profit" value={fmt(grossProfit)} sub={`Margin ${gm}%`} color={T.info} icon="📊"/>
                <KpiCard label="Net Income" value={fmt(netIncome)} sub={`Margin ${nm}%`} color={netIncome>=0?T.mocha:T.danger} icon="📈"/>
                <KpiCard label="Total Expenses" value={fmt(totalOpEx)} color={T.danger} icon="📉"/>
              </div>
              <div style={{...s.card,padding:20}}>
                <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:14}}>Revenue by Category — {periodStr}</div>
                {byCategory.length>0?<BarChart data={byCategory.map(c=>({label:c.category,value:+c.revenue}))} color={T.mocha} height={130}/>:<div style={{textAlign:"center",color:T.textMuted,padding:"30px 0",fontSize:12}}>No data for this period</div>}
              </div>
            </div>
          </div>
        )}

        {tab==="balance"&&(
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
            {[
              {title:"ASSETS",sections:[
                {label:"Current Assets",rows:[["Cash on Hand",(rptData.byPayment||[]).find(p=>p.payment_method==="Cash")?parseFloat((rptData.byPayment||[]).find(p=>p.payment_method==="Cash").total):0],["Bank BCA",(rptData.byPayment||[]).find(p=>p.payment_method==="Debit")?parseFloat((rptData.byPayment||[]).find(p=>p.payment_method==="Debit").total)+45000000:45000000],["QRIS Receivable",(rptData.byPayment||[]).find(p=>p.payment_method==="QRIS")?parseFloat((rptData.byPayment||[]).find(p=>p.payment_method==="QRIS").total):0],["GoPay Balance",(rptData.byPayment||[]).find(p=>p.payment_method==="GoPay")?parseFloat((rptData.byPayment||[]).find(p=>p.payment_method==="GoPay").total):0],["Inventory",products.reduce((s,p)=>s+p.stock*p.cost,0)]]},
                {label:"Fixed Assets",rows:[["Equipment (POS, Oven)",18000000],["Accumulated Depreciation",-(expenses.depreciation||600000)]]}
              ]},
              {title:"LIABILITIES & EQUITY",sections:[
                {label:"Liabilities",rows:[["Accounts Payable",8200000],["VAT Payable",Math.round(totalRev*0.11/1.11)]]},
                {label:"Equity",rows:[["Owner's Capital",150000000],["Net Income — "+periodStr,netIncome]]}
              ]}
            ].map(side=>(
              <div key={side.title} style={{...s.card,padding:24}}>
                <div style={{fontWeight:800,color:T.mocha,fontSize:13,letterSpacing:.8,textTransform:"uppercase",marginBottom:16,paddingBottom:10,borderBottom:`2px solid ${T.mochaLight}`}}>BALANCE SHEET — {side.title}</div>
                <div style={{fontSize:11,color:T.textMuted,marginBottom:12}}>Period: {periodStr}</div>
                {side.sections.map(sec=>(
                  <div key={sec.label} style={{marginBottom:16}}>
                    <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>{sec.label}</div>
                    {sec.rows.map(([l,v])=><SRow key={l} label={l} value={+v} indent/>)}
                    <SRow label={`Total ${sec.label}`} value={sec.rows.reduce((s,[,v])=>s+(+v||0),0)} bold/>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {tab==="cashflow"&&(
          <div style={{...s.card,padding:24,maxWidth:600}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div>
                <div style={{fontWeight:800,color:T.text,fontSize:15}}>KHASANAH SARI BAKERY</div>
                <div style={{fontSize:12,color:T.textMuted}}>Statement of Cash Flows</div>
                <div style={{fontSize:12,color:T.mocha,fontWeight:600}}>{periodStr}</div>
              </div>
              <ExportBar title={`Cash Flow Statement ${periodStr}`} subtitle={`Khasanah Sari Bakery · ${periodStr}`}
                headers={["Description","Amount"]}
                rows={[["Customer receipts",fmt(totalRev)],["Salary payments",fmt(-(expenses.salary||8500000))],["Rent payments",fmt(-(expenses.rent||5000000))],["Utilities",fmt(-(expenses.utilities||1800000))],["Raw material purchases",fmt(-(totalCOGS+2000000))],["Net Operating Cash Flow",fmt(totalRev-(expenses.salary||8500000)-(expenses.rent||5000000)-(expenses.utilities||1800000)-totalCOGS-2000000)]]}/>
            </div>
            {[
              {title:"Operating Activities",rows:[["Customer receipts",totalRev],["Salary payments",-(expenses.salary||8500000)],["Rent payments",-(expenses.rent||5000000)],["Utilities"  ,-(expenses.utilities||1800000)],["Raw material purchases",-(totalCOGS+2000000)]]},
              {title:"Investing Activities",rows:[["Equipment purchases",0]]},
              {title:"Financing Activities",rows:[["Additional capital",0]]},
            ].map(sec=>(
              <div key={sec.title} style={{marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${T.border}`}}>
                <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.8,textTransform:"uppercase",marginBottom:8}}>{sec.title}</div>
                {sec.rows.map(([l,v])=><SRow key={l} label={l} value={v} indent color={v<0?T.danger:undefined}/>)}
                <SRow label="Net Cash Flow" value={sec.rows.reduce((s,[,v])=>s+v,0)} bold highlight/>
              </div>
            ))}
          </div>
        )}

        {tab==="analytics"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
              <KpiCard label="Avg per Transaction" value={fmt(rptData.transactionCount>0?totalRev/rptData.transactionCount:0)} color={T.info} icon="🧾"/>
              <KpiCard label="Gross Margin" value={gm+"%"} color={T.success} icon="📊"/>
              <KpiCard label="Net Margin" value={nm+"%"} color={T.mocha} icon="💹"/>
              <KpiCard label="Total Transactions" value={fmtN(rptData.transactionCount)} color={T.purple} icon="🔢"/>
            </div>
            <div style={{...s.card,padding:20}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Daily Sales Trend — {periodStr}</div>
              {daily.length>0
                ?<BarChart data={daily.map(d=>({label:String(new Date(d.date+"T00:00:00").getDate()),value:+d.total}))} color={T.mocha} height={160}/>
                :<div style={{textAlign:"center",color:T.textMuted,padding:"40px 0",fontSize:12}}>No data for this period</div>}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── CHART OF ACCOUNTS ───────────────────────────────────
  const CoaPage = () => {
    const [coa,setCoa]=useState([]);
    useEffect(()=>{api.getChartOfAccounts().then(setCoa).catch(console.error);},[]);
    if(!coa.length) return <Spinner/>;
    const tClr={Asset:T.info,Liability:T.danger,Equity:T.purple,Revenue:T.success,Expense:T.warn};
    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontSize:22,fontWeight:800,color:T.text}}>Chart of Accounts</div>
          <ExportBar title="Chart of Accounts — Khasanah Sari Bakery" subtitle={`As of ${wibToday}`} headers={["Code","Account Name","Type","Normal Balance"]} rows={coa.map(a=>[a.code,a.name,a.account_type,a.normal_balance==="D"?"Debit":"Credit"])}/>
        </div>
        {["Asset","Liability","Equity","Revenue","Expense"].map(type=>(
          <div key={type} style={{...s.card,padding:20,marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <Badge color={tClr[type]}>{type}</Badge>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>{{Asset:"Asset Accounts",Liability:"Liability Accounts",Equity:"Equity Accounts",Revenue:"Revenue Accounts",Expense:"Expense Accounts"}[type]}</div>
            </div>
            <DataTable compact headers={["Account Code","Account Name","Normal Balance"]}
              rows={coa.filter(a=>a.account_type===type).map(a=>[<span style={{fontFamily:"monospace",color:tClr[type],fontWeight:600}}>{a.code}</span>,a.name,<Badge color={a.normal_balance==="D"?T.info:T.success}>{a.normal_balance==="D"?"Debit":"Credit"}</Badge>])}/>
          </div>
        ))}
      </div>
    );
  };

  // ─── INGREDIENTS / RAW MATERIALS PAGE ───────────────────
  const IngredientsPage = () => {
    const [mats,setMats]         = useState([]);
    const [selProd,setSelProd]   = useState(null);
    const [prodIngr,setProdIngr] = useState([]);
    const [addMatModal,setAddMatModal] = useState(false);
    const [addIngrModal,setAddIngrModal] = useState(false);
    const [adjModal,setAdjModal] = useState(null);
    const [form,setForm]         = useState({});
    const [isSaving,setIsSaving] = useState(false);
    const fh = (k,v) => setForm(p=>({...p,[k]:v}));

    const loadMats = async () => { const d=await api.getIngredientsOverview(); setMats(d); };
    const loadProdIngr = async (pid) => { const d=await api.getProductIngredients(pid); setProdIngr(d); };

    useEffect(()=>{ loadMats(); },[]);
    useEffect(()=>{ if(selProd) loadProdIngr(selProd.id); },[selProd]);

    const catColors = {
      'Flour & Grain': T.warn, 'Dairy & Eggs': T.info, 'Fat & Oil': T.purple,
      'Sugar & Sweetener': T.success, 'Fruit & Filling': T.danger,
      'Flavoring': T.mocha, 'Packaging': T.textMuted, 'Beverage Base': '#0891B2'
    };

    const F = ({label,fkey,type="text",opts}) => (
      <div style={{marginBottom:14}}>
        <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>{label}</div>
        {opts ? <select value={form[fkey]||""} onChange={e=>fh(fkey,e.target.value)} style={{...s.input}}>{opts.map(o=><option key={o} value={o}>{o}</option>)}</select>
              : <input type={type} value={form[fkey]||""} onChange={e=>fh(fkey,e.target.value)} style={{...s.input}} onFocus={e=>e.target.style.borderColor=T.mocha} onBlur={e=>e.target.style.borderColor=T.border}/>}
      </div>
    );

    const lowMats = mats.filter(m=>parseFloat(m.stock_qty)<=parseFloat(m.reorder_point));

    return (
      <div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:T.text}}>Raw Materials & Ingredients</div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:2}}>{mats.length} bahan baku · {products.length} produk</div>
          </div>
          {canEdit&&<button onClick={()=>{setForm({name:"",category:"Flour & Grain",unit:"gram",stock_qty:0,reorder_point:5,unit_cost:0,supplier:""});setAddMatModal(true);}} style={s.btn(T.mocha)}>+ Tambah Raw Material</button>}
        </div>

        {lowMats.length>0&&(
          <div style={{background:T.warnBg,border:`1.5px solid ${T.warn}40`,borderRadius:T.radius,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
            <span>⚠️</span>
            <div><div style={{fontSize:13,fontWeight:700,color:T.warn}}>Low Stock Alert</div>
            <div style={{fontSize:12,color:T.textSub}}>{lowMats.map(m=>m.name).join(" · ")}</div></div>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
          <KpiCard label="Total Raw Materials" value={mats.length} color={T.mocha} icon="🌾"/>
          <KpiCard label="Need Reorder" value={lowMats.length} color={T.danger} icon="⚠️"/>
          <KpiCard label="Stock Value" value={fmt(mats.reduce((s,m)=>s+parseFloat(m.stock_qty||0)*parseFloat(m.unit_cost||0),0))} color={T.success} icon="💰"/>
          <KpiCard label="Total Recipes" value={mats.reduce((s,m)=>s+(m.used_in_products||0),0)} color={T.info} icon="📋"/>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          {/* Raw Materials List */}
          <div style={{...s.card,padding:20}}>
            <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Raw Material Stock</div>
            <div style={{maxHeight:480,overflow:"auto"}}>
              {mats.map(m=>(
                <div key={m.id} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 0",borderBottom:`1px solid ${T.border}40`}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:catColors[m.category]||T.mocha,flexShrink:0}}/>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600,color:T.text}}>{m.name}</div>
                    <div style={{fontSize:11,color:T.textMuted}}>{m.category} · {m.unit}</div>
                    {m.product_names&&m.product_names.length>0&&(
                      <div style={{fontSize:10,color:T.textFaint,marginTop:2}}>Used in: {m.product_names.slice(0,3).join(", ")}{m.product_names.length>3?" +"+( m.product_names.length-3)+" lagi":""}</div>
                    )}
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontSize:13,fontWeight:700,color:parseFloat(m.stock_qty)<=parseFloat(m.reorder_point)?T.danger:T.success}}>
                      {parseFloat(m.stock_qty).toLocaleString("id-ID")} {m.unit}
                    </div>
                    <div style={{fontSize:10,color:T.textMuted}}>Min: {parseFloat(m.reorder_point).toLocaleString("id-ID")}</div>
                    <div style={{fontSize:11,color:T.mocha,fontWeight:600}}>{fmt(m.unit_cost)}/{m.unit}</div>
                  </div>
                  {canEdit&&(
                    <div style={{display:"flex",gap:4,flexShrink:0}}>
                      <button onClick={()=>setAdjModal(m)} style={{...s.btnO(T.info),padding:"3px 8px",fontSize:11}}>±</button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Product Recipe Viewer */}
          <div style={{...s.card,padding:20}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>Product Recipe (Ingredients)</div>
              {selProd&&canEdit&&<button onClick={()=>{setForm({raw_material_id:"",qty_per_unit:""});setAddIngrModal(true);}} style={{...s.btn(T.mocha),padding:"6px 12px",fontSize:12}}>+ Add Ingredient</button>}
            </div>

            {/* Product selector */}
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:8}}>Select Product</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {products.map(p=>(
                  <button key={p.id} onClick={()=>setSelProd(p)}
                    style={{background:selProd&&selProd.id===p.id?T.mocha:T.bgStripe,color:selProd&&selProd.id===p.id?"#fff":T.text,border:`1.5px solid ${selProd&&selProd.id===p.id?T.mocha:T.border}`,borderRadius:T.radiusPill,padding:"5px 12px",fontSize:11,fontWeight:600,cursor:"pointer",transition:"all .15s"}}>
                    {p.emoji||"🍞"} {p.name}
                  </button>
                ))}
              </div>
            </div>

            {selProd ? (
              <div>
                <div style={{background:T.mochaXfaint,borderRadius:T.radius,padding:"10px 14px",marginBottom:14,display:"flex",gap:12,alignItems:"center"}}>
                  <span style={{fontSize:24}}>{selProd.emoji||"🍞"}</span>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:T.text}}>{selProd.name}</div>
                    <div style={{fontSize:12,color:T.textMuted}}>HPP System: {fmt(selProd.cost)} · Raw Material: {fmt(prodIngr.reduce((s,i)=>s+parseFloat(i.cost_contribution||0),0))}</div>
                  </div>
                </div>
                {prodIngr.length===0 ? (
                  <div style={{textAlign:"center",color:T.textMuted,padding:"30px 0",fontSize:13}}>No ingredients registered yet</div>
                ) : (
                  <div style={{maxHeight:300,overflow:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                      <thead>
                        <tr style={{background:T.bgStripe}}>
                          {["Raw Material","Category","Qty/Unit","Unit","Cost/Unit","Contribution"].map((h,i)=>(
                            <th key={i} style={{padding:"8px 10px",textAlign:"left",color:T.textSub,fontWeight:600,fontSize:10,letterSpacing:.5,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>
                          ))}
                          {canEdit&&<th style={{padding:"8px 10px",borderBottom:`2px solid ${T.border}`}}/>}
                        </tr>
                      </thead>
                      <tbody>
                        {prodIngr.map((ing,ri)=>(
                          <tr key={ing.id} style={{background:ri%2===1?T.bgStripe:T.bgCard}}>
                            <td style={{padding:"8px 10px",fontWeight:600,color:T.text}}>{ing.material_name}</td>
                            <td style={{padding:"8px 10px"}}><Badge color={catColors[ing.material_category]||T.mocha}>{ing.material_category}</Badge></td>
                            <td style={{padding:"8px 10px",fontWeight:700,color:T.mocha}}>{parseFloat(ing.qty_per_unit).toLocaleString("id-ID")}</td>
                            <td style={{padding:"8px 10px",color:T.textMuted}}>{ing.unit}</td>
                            <td style={{padding:"8px 10px",color:T.textSub}}>{fmt(ing.unit_cost)}</td>
                            <td style={{padding:"8px 10px",fontWeight:700,color:T.success}}>{fmt(ing.cost_contribution)}</td>
                            {canEdit&&<td style={{padding:"8px 10px"}}>
                              <button onClick={async()=>{if(!confirm("Delete this ingredient?"))return;await api.deleteProductIngredient(selProd.id,ing.raw_material_id);await loadProdIngr(selProd.id);notify("Ingredient removed",T.warn);}} style={{...s.btnO(T.danger),padding:"3px 8px",fontSize:10}}>×</button>
                            </td>}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{background:T.mochaXfaint}}>
                          <td colSpan={5} style={{padding:"8px 10px",fontWeight:700,color:T.text}}>Total Biaya Raw Material</td>
                          <td style={{padding:"8px 10px",fontWeight:800,color:T.mocha,fontSize:14}}>{fmt(prodIngr.reduce((s,i)=>s+parseFloat(i.cost_contribution||0),0))}</td>
                          {canEdit&&<td/>}
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div style={{textAlign:"center",color:T.textMuted,padding:"60px 0",fontSize:13}}>Select a product above to view its ingredient recipe</div>
            )}
          </div>
        </div>

        {/* Add Raw Material Modal */}
        {addMatModal&&(
          <Modal title="Tambah Raw Material Baru" onClose={()=>setAddMatModal(false)}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:0}}>
              <div style={{paddingRight:12}}>
                <F label="Nama Raw Material" fkey="name"/>
                <F label="Category" fkey="category" opts={["Flour & Grain","Dairy & Eggs","Fat & Oil","Sugar & Sweetener","Fruit & Filling","Flavoring","Packaging","Beverage Base"]}/>
                <F label="Unit (gram/ml/pcs/each)" fkey="unit"/>
              </div>
              <div style={{paddingLeft:12}}>
                <F label="Initial Stock" fkey="stock_qty" type="number"/>
                <F label="Reorder Point" fkey="reorder_point" type="number"/>
                <F label="Cost/Unit (Rp)" fkey="unit_cost" type="number"/>
                <F label="Supplier" fkey="supplier"/>
              </div>
            </div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end",marginTop:8}}>
              <button onClick={()=>setAddMatModal(false)} style={s.btnO(T.textMuted)}>Cancel</button>
              <button disabled={isSaving} onClick={async()=>{setIsSaving(true);try{await api.createRawMaterial(form);await loadMats();setAddMatModal(false);notify("Raw material added",T.success);}catch(e){notify(e.message,T.danger);}finally{setIsSaving(false);}}} style={s.btn(T.mocha)}>{isSaving?"Saving...":"Add"}</button>
            </div>
          </Modal>
        )}

        {/* Add Ingredient to Product Modal */}
        {addIngrModal&&selProd&&(
          <Modal title={`Add Ingredient — ${selProd.name}`} onClose={()=>setAddIngrModal(false)} width={400}>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Pilih Raw Material</div>
              <select value={form.raw_material_id||""} onChange={e=>fh("raw_material_id",e.target.value)} style={{...s.input}}>
                <option value="">-- Select material --</option>
                {mats.filter(m=>!prodIngr.find(i=>i.raw_material_id===m.id)).map(m=>(
                  <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                ))}
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Qty per 1 Product</div>
              <input type="number" value={form.qty_per_unit||""} onChange={e=>fh("qty_per_unit",e.target.value)} placeholder="Contoh: 150 (gram)" style={{...s.input}}/>
            </div>
            {form.raw_material_id&&form.qty_per_unit&&(()=>{const mat=mats.find(m=>m.id===parseInt(form.raw_material_id));return mat?<div style={{background:T.mochaFaint,borderRadius:T.radius,padding:"10px 14px",fontSize:12,marginBottom:14}}>Estimated cost: <strong>{fmt(parseFloat(form.qty_per_unit)*parseFloat(mat.unit_cost))}</strong> per produk</div>:null;})()}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setAddIngrModal(false)} style={s.btnO(T.textMuted)}>Cancel</button>
              <button disabled={isSaving} onClick={async()=>{setIsSaving(true);try{await api.addProductIngredient(selProd.id,form);await loadProdIngr(selProd.id);setAddIngrModal(false);notify("Ingredient added to recipe",T.success);}catch(e){notify(e.message,T.danger);}finally{setIsSaving(false);}}} style={s.btn(T.mocha)}>{isSaving?"Saving...":"Add ke Resep"}</button>
            </div>
          </Modal>
        )}

        {/* Stock Adjustment Modal */}
        {adjModal&&(
          <Modal title={`Adjust Stock — ${adjModal.name}`} onClose={()=>setAdjModal(null)} width={380}>
            <div style={{background:T.bgStripe,borderRadius:T.radius,padding:"12px 14px",marginBottom:16,fontSize:13}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:T.textMuted}}>Current stock</span><span style={{fontWeight:700}}>{parseFloat(adjModal.stock_qty).toLocaleString("id-ID")} {adjModal.unit}</span></div>
            </div>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Adjustment (+ add / − reduce)</div>
              <input type="number" value={form.adjQty||""} onChange={e=>fh("adjQty",e.target.value)} placeholder="Example: +500 or -200" style={{...s.input}}/>
            </div>
            <div style={{marginBottom:16}}>
              <div style={{fontSize:11,fontWeight:700,color:T.textMuted,letterSpacing:.6,textTransform:"uppercase",marginBottom:6}}>Reason</div>
              <input value={form.adjReason||""} onChange={e=>fh("adjReason",e.target.value)} placeholder="Purchase / damage / stock count..." style={{...s.input}}/>
            </div>
            {form.adjQty&&<div style={{background:T.mochaFaint,borderRadius:T.radius,padding:"10px 14px",fontSize:12,marginBottom:14}}>After: <strong>{Math.max(0,parseFloat(adjModal.stock_qty)+(+form.adjQty||0)).toLocaleString("id-ID")} {adjModal.unit}</strong></div>}
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <button onClick={()=>setAdjModal(null)} style={s.btnO(T.textMuted)}>Cancel</button>
              <button disabled={isSaving} onClick={async()=>{setIsSaving(true);try{await api.adjustRawMaterial(adjModal.id,+form.adjQty||0,form.adjReason||"",user.name);await loadMats();setAdjModal(null);notify("Stock adjusted",T.success);}catch(e){notify(e.message,T.danger);}finally{setIsSaving(false);}}} style={s.btn(T.mocha)}>{isSaving?"Saving...":"Apply"}</button>
            </div>
          </Modal>
        )}
      </div>
    );
  };

  // ─── TRANSACTION DETAIL MODAL ─────────────────────────────
  const TxnDetailModal = ({txnId, onClose}) => {
    const [detail,setDetail] = useState(null);
    const [loading,setLoading] = useState(true);

    useEffect(()=>{
      if(!txnId) return;
      setLoading(true);
      api.getTransactionDetail(txnId).then(d=>{setDetail(d);setLoading(false);}).catch(e=>{notify(e.message,T.danger);onClose();});
    },[txnId]);

    if(loading) return <Modal title="Transaction Detail" onClose={onClose}><Spinner/></Modal>;
    if(!detail) return null;

    const payClr = {Cash:T.success,QRIS:T.info,GoPay:T.warn,Debit:T.purple};
    const grossMargin = detail.subtotal>0?((detail.subtotal-detail.items.reduce((s,i)=>s+parseFloat(i.unit_cost)*parseInt(i.qty),0))/detail.subtotal*100).toFixed(1):0;

    return (
      <Modal title="" onClose={onClose} width={680}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,paddingBottom:16,borderBottom:`1px solid ${T.border}`}}>
          <div>
            <div style={{fontSize:18,fontWeight:800,color:T.text}}>{detail.receiptNo||detail.receipt_no}</div>
            <div style={{fontSize:12,color:T.textMuted,marginTop:3}}>{detail.date} · {detail.time} · Kasir: <strong>{detail.cashier_name}</strong></div>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <Badge color={payClr[detail.payment||detail.payment_method]}>{detail.payment||detail.payment_method}</Badge>
            <Badge color={detail.verified?T.success:T.warn}>{detail.verified?"✓ Verified":"Pending"}</Badge>
          </div>
        </div>

        {/* Items table */}
        <div style={{marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>Items Dibeli</div>
          {detail.items&&detail.items.length>0 ? (
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead>
                <tr style={{background:T.bgStripe}}>
                  {["Produk","Category","Qty","Harga Satuan","HPP Satuan","Subtotal","Margin %"].map((h,i)=>(
                    <th key={i} style={{padding:"8px 10px",textAlign:"left",color:T.textSub,fontWeight:600,fontSize:10,letterSpacing:.5,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.items.map((item,ri)=>(
                  <tr key={ri} style={{background:ri%2===1?T.bgStripe:T.bgCard}}>
                    <td style={{padding:"9px 10px",fontWeight:600,color:T.text}}>{item.name}</td>
                    <td style={{padding:"9px 10px"}}><Badge color={T.mocha}>{item.category}</Badge></td>
                    <td style={{padding:"9px 10px",fontWeight:700,color:T.mocha,textAlign:"center"}}>{item.qty}</td>
                    <td style={{padding:"9px 10px"}}>{fmt(item.unit_price)}</td>
                    <td style={{padding:"9px 10px",color:T.textMuted}}>{fmt(item.unit_cost)}</td>
                    <td style={{padding:"9px 10px",fontWeight:700}}>{fmt(item.line_total)}</td>
                    <td style={{padding:"9px 10px"}}><Badge color={parseFloat(item.margin)>40?T.success:T.warn}>{item.margin}%</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div style={{textAlign:"center",color:T.textMuted,padding:"20px 0",fontSize:12}}>Detail item tidak tersedia untuk transactions ini</div>
          )}
        </div>

        {/* Summary row */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:20}}>
          {[
            ["Subtotal",fmt(detail.subtotal),T.text],
            ["PPN 11%",fmt(detail.tax),T.warn],
            ["TOTAL",fmt(detail.total),T.mocha],
          ].map(([l,v,c])=>(
            <div key={l} style={{background:T.bgStripe,borderRadius:T.radius,padding:"12px 14px",textAlign:"center"}}>
              <div style={{fontSize:11,color:T.textMuted,fontWeight:600,letterSpacing:.6,textTransform:"uppercase",marginBottom:4}}>{l}</div>
              <div style={{fontSize:16,fontWeight:800,color:c}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Gross Margin */}
        <div style={{background:T.mochaXfaint,borderRadius:T.radius,padding:"10px 16px",marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span style={{fontSize:12,color:T.textSub,fontWeight:600}}>Gross Margin Transaksi Ini</span>
          <span style={{fontSize:16,fontWeight:800,color:parseFloat(grossMargin)>40?T.success:T.warn}}>{grossMargin}%</span>
        </div>

        {/* Journal Entries */}
        {detail.journalEntries&&detail.journalEntries.length>0&&(
          <div>
            <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:10}}>Jurnal Akuntansi Otomatis</div>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
              <thead>
                <tr style={{background:T.bgStripe}}>
                  {["Akun","Nama Akun","Debit","Kredit"].map((h,i)=>(
                    <th key={i} style={{padding:"7px 10px",textAlign:"left",color:T.textSub,fontWeight:600,fontSize:10,letterSpacing:.5,textTransform:"uppercase",borderBottom:`2px solid ${T.border}`}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {detail.journalEntries.map((j,ri)=>(
                  <tr key={ri} style={{background:ri%2===1?T.bgStripe:T.bgCard}}>
                    <td style={{padding:"7px 10px",fontFamily:"monospace",color:T.mocha,fontWeight:700}}>{j.account_code}</td>
                    <td style={{padding:"7px 10px",color:T.text}}>{j.account_name||j.description}</td>
                    <td style={{padding:"7px 10px",color:T.info,fontWeight:600}}>{+j.debit>0?fmt(+j.debit):"—"}</td>
                    <td style={{padding:"7px 10px",color:T.success,fontWeight:600}}>{+j.credit>0?fmt(+j.credit):"—"}</td>
                  </tr>
                ))}
                <tr style={{background:T.mochaXfaint}}>
                  <td colSpan={2} style={{padding:"8px 10px",fontWeight:800,color:T.text}}>TOTAL</td>
                  <td style={{padding:"8px 10px",fontWeight:800,color:T.info}}>{fmt(detail.journalEntries.reduce((s,j)=>s+(+j.debit||0),0))}</td>
                  <td style={{padding:"8px 10px",fontWeight:800,color:T.success}}>{fmt(detail.journalEntries.reduce((s,j)=>s+(+j.credit||0),0))}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",marginTop:20}}>
          <button onClick={onClose} style={s.btn(T.mocha)}>Close</button>
        </div>
      </Modal>
    );
  };

  // ─── LAYOUT ──────────────────────────────────────────────
  // Grouped nav structure as requested by lecturer
  const NAV_GROUPS = [
    {
      id: "dashboard", label: "Dashboard", icon: "⊞", single: true,
      roles: ["cashier","supervisor","accountant","manager"],
    },
    {
      id: "sales", label: "Sales & Inventory", icon: "⊟",
      roles: ["cashier","supervisor","manager"],
      subs: [
        { id: "pos",        label: "POS · Sales",      icon: "●" },
        { id: "productlist",label: "Product List & Price", icon: "●" },
        { id: "inventory",  label: "Finished Goods",   icon: "●" },
      ]
    },
    {
      id: "cash", label: "Cash", icon: "◈",
      roles: ["supervisor","manager"],
      subs: [
        { id: "cashonhand",  label: "Cash on Hand",    icon: "●" },
        { id: "cashreceipt", label: "Cash Receipt",    icon: "●" },
      ]
    },
    {
      id: "production", label: "Production", icon: "⚙",
      roles: ["cashier","supervisor","manager"],
      subs: [
        { id: "ingredients", label: "Raw Materials",   icon: "●" },
        { id: "prodlog",     label: "Production Log",  icon: "●" },
      ]
    },
    {
      id: "accounting", label: "Accounting", icon: "≡",
      roles: ["accountant","manager"],
      subs: [
        { id: "journals",    label: "Sales Journal",         icon: "●" },
        { id: "cashjournal", label: "Cash Receipts Journal", icon: "●" },
        { id: "gl",          label: "General Ledger",        icon: "●" },
        { id: "trial",       label: "Trial Balance",         icon: "●" },
        { id: "reports",     label: "Financial Reports",     icon: "●" },
        { id: "coa",         label: "Chart of Accounts",     icon: "●" },
      ]
    },
  ].filter(g => g.roles.includes(user.role));

  // find label for topbar
  const findLabel = (pid) => {
    for (const g of NAV_GROUPS) {
      if (g.single && g.id === pid) return g.label;
      if (g.subs) { const sub = g.subs.find(s=>s.id===pid); if(sub) return g.label+" · "+sub.label; }
    }
    return "Dashboard";
  };

  // expanded groups state
  const toggleGroup = (gid) => setExpandedGroups(prev=>({...prev,[gid]:!prev[gid]}));

  // Wrapper pages using sub-tabs
  const SalesPage    = () => { const [sub,setSub]=useState(page==="productlist"?"productlist":page==="inventory"?"inventory":"pos"); return <SubPageWrapper subs={[{id:"pos",label:"POS · Sales"},{id:"productlist",label:"Product List & Price"},{id:"inventory",label:"Finished Goods"}]} active={sub} onTab={setSub}><SubRenderer id={sub}/></SubPageWrapper>; };
  const CashPage2    = () => { const [sub,setSub]=useState(page==="cashreceipt"?"cashreceipt":"cashonhand"); return <SubPageWrapper subs={[{id:"cashonhand",label:"Cash on Hand"},{id:"cashreceipt",label:"Cash Receipt"}]} active={sub} onTab={setSub}><SubRenderer id={sub}/></SubPageWrapper>; };
  const ProductionPage=()=>{ const [sub,setSub]=useState(page==="prodlog"?"prodlog":"ingredients"); return <SubPageWrapper subs={[{id:"ingredients",label:"Raw Materials"},{id:"prodlog",label:"Production Log"}]} active={sub} onTab={setSub}><SubRenderer id={sub}/></SubPageWrapper>; };
  const AccountingPage2=()=>{ const [sub,setSub]=useState(["cashjournal","gl","trial","reports","coa"].includes(page)?page:"journals"); return <SubPageWrapper subs={[{id:"journals",label:"Sales Journal"},{id:"cashjournal",label:"Cash Receipts Journal"},{id:"gl",label:"General Ledger"},{id:"trial",label:"Trial Balance"},{id:"reports",label:"Financial Reports"},{id:"coa",label:"Chart of Accounts"}]} active={sub} onTab={setSub}><SubRenderer id={sub}/></SubPageWrapper>; };

  const SubPageWrapper = ({subs,active,onTab,children}) => (
    <div>
      <div style={{display:"flex",gap:4,marginBottom:20,borderBottom:`1.5px solid ${T.border}`}}>
        {subs.map(s=>(
          <button key={s.id} onClick={()=>onTab(s.id)}
            style={{background:"transparent",border:"none",color:active===s.id?T.mocha:T.textMuted,fontWeight:active===s.id?700:500,fontSize:13,padding:"10px 16px",cursor:"pointer",borderBottom:`2.5px solid ${active===s.id?T.mocha:"transparent"}`,marginBottom:-2,transition:"all .15s",fontFamily:"inherit"}}>
            {s.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );

  // ProductListPage — shows product catalog with prices
  const ProductListPage = () => (
    <div>
      <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:6}}>Product List & Price</div>
      <div style={{fontSize:13,color:T.textMuted,marginBottom:20}}>All products with selling price and cost of goods</div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:14,marginBottom:20}}>
        <KpiCard label="Total Produk" value={products.length} color={T.mocha} icon="🍞"/>
        <KpiCard label="Avg Selling Price" value={fmt(products.reduce((s,p)=>s+p.price,0)/Math.max(products.length,1))} color={T.info} icon="💵"/>
        <KpiCard label="Avg Cost" value={fmt(products.reduce((s,p)=>s+p.cost,0)/Math.max(products.length,1))} color={T.success} icon="📦"/>
        <KpiCard label="Avg Gross Margin" value={((products.reduce((s,p)=>s+(p.price-p.cost)/p.price*100,0)/Math.max(products.length,1))).toFixed(1)+"%"} color={T.purple} icon="📊"/>
      </div>
      {["Bread","Pastry","Cake","Beverage"].map(cat=>{
        const catProds = products.filter(p=>p.category===cat);
        if(!catProds.length) return null;
        const catClr = {Bread:T.warn,Pastry:T.info,Cake:T.purple,Beverage:T.mocha}[cat]||T.mocha;
        return (
          <div key={cat} style={{...s.card,padding:20,marginBottom:16}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <Badge color={catClr}>{cat}</Badge>
              <div style={{fontSize:14,fontWeight:700,color:T.text}}>{cat === "Bread"?"Roti":cat==="Pastry"?"Pastry":cat==="Cake"?"Kue":"Minuman"}</div>
              <span style={{fontSize:12,color:T.textMuted}}>— {catProds.length} produk</span>
            </div>
            <DataTable headers={["SKU","Produk","Harga Jual","HPP","Gross Margin","Harga Kotor","Stok","Status"]}
              rows={catProds.map(p=>{
                const margin=((p.price-p.cost)/p.price*100).toFixed(1);
                return [
                  <span style={{fontFamily:"monospace",fontSize:11,color:T.textMuted}}>{p.sku}</span>,
                  <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:18}}>{p.emoji||"🍞"}</span><span style={{fontWeight:600}}>{p.name}</span></div>,
                  <span style={{fontWeight:700,color:T.mocha}}>{fmt(p.price)}</span>,
                  <span style={{color:T.textSub}}>{fmt(p.cost)}</span>,
                  <Badge color={parseFloat(margin)>50?T.success:parseFloat(margin)>35?T.warn:T.danger}>{margin}%</Badge>,
                  <span style={{color:T.textSub}}>{fmt(p.price-p.cost)}</span>,
                  <span style={{fontWeight:600,color:p.stock===0?T.danger:p.stock<=p.reorder_point?T.warn:T.success}}>{p.stock}</span>,
                  p.stock===0?<Badge color={T.danger}>Habis</Badge>:p.stock<=p.reorder_point?<Badge color={T.warn}>Low</Badge>:<Badge color={T.success}>Tersedia</Badge>,
                ];
              })}/>
          </div>
        );
      })}
    </div>
  );

  // CashOnHandPage
  const CashOnHandPage = () => {
    if(!summary) return <Spinner/>;
    const cashBal    = (summary.byPayment||[]).find(p=>p.payment_method==="Cash");
    const qrisBal    = (summary.byPayment||[]).find(p=>p.payment_method==="QRIS");
    const gopayBal   = (summary.byPayment||[]).find(p=>p.payment_method==="GoPay");
    const debitBal   = (summary.byPayment||[]).find(p=>p.payment_method==="Debit");
    const cashAmt    = parseFloat(cashBal?.total||0);
    const qrisAmt    = parseFloat(qrisBal?.total||0);
    const gopayAmt   = parseFloat(gopayBal?.total||0);
    const debitAmt   = parseFloat(debitBal?.total||0);
    const totalCash  = cashAmt + qrisAmt + gopayAmt + debitAmt;
    return (
      <div>
        <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:6}}>Cash on Hand</div>
        <div style={{fontSize:13,color:T.textMuted,marginBottom:20}}>Cash and cash equivalents balance per period · {periodLabel()}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:14,marginBottom:24}}>
          <KpiCard label="Cash on Hand (Acct 1010)" value={fmt(cashAmt)} sub={`${cashBal?.count||0} transactions Cash`} color={T.success} icon="💵"/>
          <KpiCard label="QRIS Receivable (Acct 1030)" value={fmt(qrisAmt)} sub={`${qrisBal?.count||0} transactions QRIS`} color={T.info} icon="📱"/>
          <KpiCard label="GoPay Balance (Acct 1040)" value={fmt(gopayAmt)} sub={`${gopayBal?.count||0} transactions GoPay`} color={T.warn} icon="🟢"/>
          <KpiCard label="Bank BCA (Acct 1020)" value={fmt(debitAmt+45000000)} sub={`${debitBal?.count||0} transactions Debit + opening balance`} color={T.purple} icon="🏦"/>
        </div>
        <div style={{...s.card,padding:24,maxWidth:560}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:16}}>Cash Position Summary</div>
          {[
            ["1010 — Cash on Hand",cashAmt,T.success],
            ["1020 — Bank BCA",debitAmt+45000000,T.purple],
            ["1030 — QRIS Receivable",qrisAmt,T.info],
            ["1040 — GoPay Balance",gopayAmt,T.warn],
          ].map(([l,v,c])=>(
            <div key={l} style={{display:"flex",justifyContent:"space-between",padding:"10px 0",borderBottom:`1px solid ${T.border}40`}}>
              <span style={{fontSize:13,color:T.textSub,fontFamily:"monospace"}}>{l}</span>
              <span style={{fontSize:14,fontWeight:700,color:c}}>{fmt(v)}</span>
            </div>
          ))}
          <div style={{display:"flex",justifyContent:"space-between",padding:"14px 0",borderTop:`2px solid ${T.mocha}`,marginTop:4}}>
            <span style={{fontSize:14,fontWeight:800,color:T.text}}>TOTAL CASH & EQUIVALENTS</span>
            <span style={{fontSize:18,fontWeight:800,color:T.mocha}}>{fmt(totalCash+45000000)}</span>
          </div>
          <div style={{marginTop:14,padding:"12px 14px",background:T.mochaXfaint,borderRadius:T.radius,fontSize:12,color:T.textSub}}>
            <strong>AIS Note:</strong> Cash on Hand mencakup semua aset yang segera dapat dikonversi menjadi kas, termasuk saldo rekening bank, piutang QRIS (T+1), dan saldo dompet digital. Sesuai PSAK 2 tentang Laporan Arus Kas.
          </div>
        </div>
      </div>
    );
  };

  // ProdLogPage — Production Log showing raw materials → finished goods flow
  const ProdLogPage = () => {
    const todayProdTxns = transactions.filter(t=>(t.date||t.transaction_date)===wibToday);
    const rawMatUsage = products.map(p=>({
      ...p,
      soldToday: todayProdTxns.reduce((s,t)=>(t.items||[]).filter(i=>(i.product_id||i.productId)===p.id).reduce((si,i)=>si+i.qty,s),0),
      soldMonth: transactions.reduce((s,t)=>(t.items||[]).filter(i=>(i.product_id||i.productId)===p.id).reduce((si,i)=>si+i.qty,s),0),
    })).filter(p=>p.soldMonth>0).sort((a,b)=>b.soldMonth-a.soldMonth);

    return (
      <div>
        <div style={{fontSize:22,fontWeight:800,color:T.text,marginBottom:6}}>Production Log</div>
        <div style={{fontSize:13,color:T.textMuted,marginBottom:20}}>Alur Raw Materials → Production Process → Finished Goods</div>

        {/* Flow diagram */}
        <div style={{...s.card,padding:20,marginBottom:20}}>
          <div style={{fontSize:13,fontWeight:700,color:T.text,marginBottom:16}}>Production Flow</div>
          <div style={{display:"flex",alignItems:"center",gap:0,overflowX:"auto"}}>
            {[
              {icon:"🌾",label:"Raw Materials",sub:"Tepung, Mentega, Telur, Susu, dll",color:T.warn},
              {icon:"→",label:"",sub:"",color:T.textFaint,arrow:true},
              {icon:"🏭",label:"Production Process",sub:"Mixing, Baking, Decorating",color:T.info},
              {icon:"→",label:"",sub:"",color:T.textFaint,arrow:true},
              {icon:"🍞",label:"Finished Goods",sub:"Bread, Cake, Pastry Ready to Sell",color:T.success},
              {icon:"→",label:"",sub:"",color:T.textFaint,arrow:true},
              {icon:"🛒",label:"Sales",sub:"POS Transaction · Revenue Recognized",color:T.mocha},
              {icon:"→",label:"",sub:"",color:T.textFaint,arrow:true},
              {icon:"💰",label:"Cash Receipt",sub:"Payment Collected · Journal Posted",color:T.purple},
            ].map((step,i)=>step.arrow?(
              <div key={i} style={{fontSize:22,color:T.textFaint,padding:"0 8px",flexShrink:0}}>→</div>
            ):(
              <div key={i} style={{background:step.color+"12",border:`1.5px solid ${step.color}40`,borderRadius:T.radius,padding:"14px 16px",minWidth:130,textAlign:"center",flexShrink:0}}>
                <div style={{fontSize:28,marginBottom:6}}>{step.icon}</div>
                <div style={{fontSize:12,fontWeight:700,color:step.color}}>{step.label}</div>
                <div style={{fontSize:10,color:T.textMuted,marginTop:4,whiteSpace:"pre-line"}}>{step.sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:14,marginBottom:20}}>
          <KpiCard label="Products in Production" value={products.filter(p=>p.active).length} color={T.mocha} icon="🍞"/>
          <KpiCard label="Terjual Today" value={todayProdTxns.reduce((s,t)=>(t.items||[]).reduce((si,i)=>si+i.qty,s),0)} color={T.info} icon="📦" sub="unit produk"/>
          <KpiCard label="Total Sold (Month)" value={fmtN(rawMatUsage.reduce((s,p)=>s+p.soldMonth,0))} color={T.success} icon="📊" sub="unit"/>
          <KpiCard label="COGS This Month" value={fmt(summary?.totalCOGS||0)} color={T.danger} icon="💸"/>
        </div>

        <div style={{...s.card,padding:20}}>
          <div style={{fontSize:14,fontWeight:700,color:T.text,marginBottom:14}}>Production Output — Sales Volume per Product</div>
          <DataTable headers={["Produk","Category","Terjual Today","Terjual This Month","Harga Jual","Revenue This Month","Remaining Stock"]}
            rows={rawMatUsage.map(p=>[
              <div style={{display:"flex",alignItems:"center",gap:8}}><span>{p.emoji||"🍞"}</span><span style={{fontWeight:600}}>{p.name}</span></div>,
              <Badge color={T.mocha}>{p.category}</Badge>,
              <span style={{fontWeight:700,color:T.info}}>{p.soldToday} unit</span>,
              <span style={{fontWeight:700,color:T.mocha}}>{fmtN(p.soldMonth)} unit</span>,
              fmt(p.price),
              <span style={{fontWeight:700,color:T.success}}>{fmt(p.soldMonth*p.price)}</span>,
              <span style={{color:p.stock<=p.reorder_point?T.danger:T.success,fontWeight:600}}>{p.stock} unit</span>,
            ])}/>
        </div>
      </div>
    );
  };

  // SubRenderer — routes sub-tab ids to actual page components
  const SubRenderer = ({id}) => {
    switch(id) {
      case "pos":          return <POSPage/>;
      case "productlist":  return <ProductListPage/>;
      case "inventory":    return <InventoryPage/>;
      case "cashonhand":   return <CashOnHandPage/>;
      case "cashreceipt":  return <CashPage/>;
      case "ingredients":  return <IngredientsPage/>;
      case "prodlog":      return <ProdLogPage/>;
      case "journals":     return <AccountingPage sub="journal"/>;
      case "cashjournal":  return <AccountingPage sub="cashj"/>;
      case "gl":           return <AccountingPage sub="gl"/>;
      case "trial":        return <AccountingPage sub="trial"/>;
      case "reports":      return <ReportsPage/>;
      case "coa":          return <CoaPage/>;
      default:             return <DashboardPage/>;
    }
  };

  const topPages = {
    dashboard:  DashboardPage,
    sales:      SalesPage,
    cash:       CashPage2,
    production: ProductionPage,
    accounting: AccountingPage2,
  };
  const CurrentPage = topPages[page] || DashboardPage;
  const lowStockCount = products.filter(p=>p.stock<=p.reorder_point).length;

  return (
    <div style={{display:"flex",height:"100vh",background:T.bgPage,fontFamily:"'Plus Jakarta Sans',sans-serif",color:T.text,overflow:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box} input,button,select{font-family:'Plus Jakarta Sans',sans-serif}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-thumb{background:#D4CCBF;border-radius:3px}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.97)}to{opacity:1;transform:scale(1)}}
        @keyframes slideUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      `}</style>

      {/* Sidebar */}
      <div style={{width:sidebarOpen?230:60,background:T.bgSide,borderRight:`1px solid ${T.border}`,display:"flex",flexDirection:"column",transition:"width .2s ease",overflow:"hidden",flexShrink:0,boxShadow:"1px 0 8px rgba(0,0,0,.03)"}}>
        {/* Logo */}
        <div style={{padding:"16px 14px",borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:10,minHeight:62,flexShrink:0}}>
          <div style={{width:34,height:34,background:T.mochaFaint,borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0}}>🥐</div>
          {sidebarOpen&&<div style={{overflow:"hidden"}}><div style={{fontSize:12,fontWeight:800,color:T.text,whiteSpace:"nowrap",letterSpacing:-.3}}>Khasanah Sari Bakery</div><div style={{fontSize:9,color:T.mocha,fontWeight:600,letterSpacing:1.2,textTransform:"uppercase"}}>AIS v3.0</div></div>}
        </div>

        {/* Nav groups */}
        <nav style={{flex:1,padding:"8px 8px",overflow:"auto"}}>
          {NAV_GROUPS.map(group=>(
            <div key={group.id} style={{marginBottom:2}}>
              {group.single ? (
                /* Single nav item (Dashboard) */
                <button onClick={()=>setPage(group.id)}
                  style={{width:"100%",background:page===group.id?T.mochaFaint:"transparent",color:page===group.id?T.mocha:T.textMuted,border:`1px solid ${page===group.id?T.mochaLight:"transparent"}`,borderRadius:T.radius,padding:sidebarOpen?"9px 12px":"9px",fontSize:13,fontWeight:page===group.id?700:500,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .15s",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",fontFamily:"inherit"}}
                  onMouseEnter={e=>{if(page!==group.id){e.currentTarget.style.background=T.bgHover;e.currentTarget.style.color=T.text;}}}
                  onMouseLeave={e=>{if(page!==group.id){e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textMuted;}}}>
                  <span style={{fontSize:15,flexShrink:0}}>{group.icon}</span>
                  {sidebarOpen&&<span style={{fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{group.label}</span>}
                </button>
              ) : (
                /* Group with sub-items */
                <div>
                  <button onClick={()=>{ toggleGroup(group.id); if(!expandedGroups[group.id]) setPage(group.id); }}
                    style={{width:"100%",background:page===group.id||(group.subs&&group.subs.find(s=>s.id===page))?T.mochaFaint:"transparent",color:page===group.id||(group.subs&&group.subs.find(s=>s.id===page))?T.mocha:T.textSub,border:`1px solid ${page===group.id||(group.subs&&group.subs.find(s=>s.id===page))?T.mochaLight:"transparent"}`,borderRadius:T.radius,padding:sidebarOpen?"9px 12px":"9px",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:10,transition:"all .15s",textAlign:"left",justifyContent:sidebarOpen?"flex-start":"center",fontFamily:"inherit"}}
                    onMouseEnter={e=>e.currentTarget.style.background=T.bgHover}
                    onMouseLeave={e=>e.currentTarget.style.background=page===group.id||(group.subs&&group.subs.find(s=>s.id===page))?T.mochaFaint:"transparent"}>
                    <span style={{fontSize:15,flexShrink:0}}>{group.icon}</span>
                    {sidebarOpen&&<>
                      <span style={{flex:1,fontSize:13,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{group.label}</span>
                      <span style={{fontSize:10,transition:"transform .2s",transform:expandedGroups[group.id]?"rotate(90deg)":"rotate(0deg)"}}>▶</span>
                    </>}
                  </button>
                  {/* Sub-items */}
                  {sidebarOpen&&expandedGroups[group.id]&&group.subs&&(
                    <div style={{marginLeft:16,marginTop:2,borderLeft:`2px solid ${T.mochaFaint}`,paddingLeft:8}}>
                      {group.subs.map(sub=>(
                        <button key={sub.id} onClick={()=>setPage(group.id)}
                          style={{width:"100%",background:"transparent",color:T.textMuted,border:"none",borderRadius:T.radius,padding:"7px 10px",fontSize:12,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",gap:8,transition:"all .15s",textAlign:"left",fontFamily:"inherit"}}
                          onMouseEnter={e=>{e.currentTarget.style.background=T.bgHover;e.currentTarget.style.color=T.text;}}
                          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=T.textMuted;}}>
                          <span style={{width:5,height:5,borderRadius:"50%",background:T.mochaLight,flexShrink:0}}/>
                          <span>{sub.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* User info */}
        <div style={{padding:"12px 8px",borderTop:`1px solid ${T.border}`,flexShrink:0}}>
          <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px",borderRadius:T.radius}}>
            <div style={{width:30,height:30,borderRadius:8,background:rClrMap[user.role]+"18",border:`1.5px solid ${rClrMap[user.role]}40`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:rClrMap[user.role],flexShrink:0}}>{user.name[0]}</div>
            {sidebarOpen&&<div style={{overflow:"hidden"}}><div style={{fontSize:12,fontWeight:700,color:T.text,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{user.name}</div><div style={{fontSize:10,color:rClrMap[user.role],textTransform:"uppercase",letterSpacing:.8,fontWeight:600}}>{user.role}</div></div>}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
        {/* Topbar */}
        <div style={{height:54,background:T.bgCard,borderBottom:`1px solid ${T.border}`,display:"flex",alignItems:"center",padding:"0 20px",gap:14,flexShrink:0}}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{background:"transparent",border:"none",color:T.textMuted,cursor:"pointer",fontSize:17,padding:4,lineHeight:1}}>☰</button>
          <div style={{flex:1,fontSize:14,fontWeight:700,color:T.text}}>{findLabel(page)}</div>
          <div style={{fontSize:11,color:T.textMuted,background:T.bgStripe,padding:"4px 10px",borderRadius:T.radiusPill,border:`1px solid ${T.border}`}}>WIB: {wibToday} {getWIBTimeStr()}</div>
          {lowStockCount>0&&<div onClick={()=>setPage("sales")} style={{background:T.warnBg,border:`1px solid ${T.warn}30`,borderRadius:T.radiusPill,padding:"5px 12px",fontSize:11,color:T.warn,fontWeight:600,cursor:"pointer"}}>⚠ {lowStockCount} low stock</div>}
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:T.textMuted}}><div style={{width:7,height:7,borderRadius:"50%",background:T.success,animation:"pulse 2.5s infinite"}}/>Live</div>
          <button onClick={()=>setUser(null)} style={s.btnO(T.textMuted)}>Sign Out</button>
        </div>
        <div style={{flex:1,overflow:"auto",padding:22}}><CurrentPage/></div>
      </div>

      {toast&&<Toast msg={toast.msg} color={toast.color}/>}
      {txnDetailId&&<TxnDetailModal txnId={txnDetailId} onClose={()=>setTxnDetailId(null)}/>}
    </div>
  );
}
