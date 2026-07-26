import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "./supabaseClient";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg: "#f0f4f8", surface: "#ffffff", surfaceHover: "#f8fafc",
  border: "#e2e8f0", borderFocus: "#6366f1",
  indigo: "#6366f1", indigoLight: "#eef2ff", indigoDark: "#4338ca",
  green: "#10b981", greenLight: "#d1fae5",
  red: "#ef4444", redLight: "#fee2e2",
  amber: "#f59e0b", amberLight: "#fef3c7",
  blue: "#3b82f6", blueLight: "#dbeafe",
  purple: "#8b5cf6", purpleLight: "#ede9fe",
  slate: "#64748b", slateLight: "#f1f5f9",
  text: "#0f172a", textSec: "#475569", textMut: "#94a3b8",
  shadow: "0 1px 3px rgba(0,0,0,0.08),0 1px 2px rgba(0,0,0,0.04)",
  shadowMd: "0 4px 6px rgba(0,0,0,0.07),0 2px 4px rgba(0,0,0,0.05)",
  shadowLg: "0 10px 15px rgba(0,0,0,0.08),0 4px 6px rgba(0,0,0,0.04)",
};

// ─── Response types ──────────────────────────────────────────────────────────
const RESP_TYPES = [
  { type:"checkbox", label:"Checkbox",   icon:"✓", color:C.green,  bg:C.greenLight  },
  { type:"passfail", label:"Pass/Fail",  icon:"◉", color:C.blue,   bg:C.blueLight   },
  { type:"number",   label:"Number",     icon:"#", color:C.amber,  bg:C.amberLight  },
  { type:"text",     label:"Comment",    icon:"✏", color:C.slate,  bg:C.slateLight  },
  { type:"photo",    label:"Photo",      icon:"📷",color:C.purple, bg:C.purpleLight },
  { type:"rating",   label:"Rating",     icon:"★", color:C.indigo, bg:C.indigoLight },
  { type:"markup",   label:"Mark-up",    icon:"✏️", color:"#0891b2", bg:"#cffafe"      },
];

// ─── Status workflow ─────────────────────────────────────────────────────────
const STATUSES = {
  draft:     { label:"Draft",     color:"#64748b", bg:"#f1f5f9", icon:"✎"  },
  review:    { label:"In Review", color:"#f59e0b", bg:"#fef3c7", icon:"👁" },
  approved:  { label:"Approved",  color:"#10b981", bg:"#d1fae5", icon:"✓"  },
  rejected:  { label:"Changes requested", color:"#ef4444", bg:"#fee2e2", icon:"↩" },
};

const FORM_TAGS = ["Plant check","Lubrication","Safety","Electrical","Mechanical","Operator","Pre-shift","Shutdown"];

let _id = 200;
const uid = () => `f${_id++}`;

const newField = () => ({
  id:uid(), label:"", helpText:"", refDoc:"", refPhoto:null,
  required:false, responseTypes:["checkbox"],
  unit:"", min:"", max:"", ratingMax:5, naAllowed:true,
});

const emptyForm = (title="") => ({
  id:uid(), title, description:"", docRef:"", version:"1.0",
  status:"draft", tags:[], approvals:[],
  sections:[{ id:uid(), title:"Section 1", fields:[newField()] }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

// ─── Drag hook ───────────────────────────────────────────────────────────────
function useDrag(items, setItems) {
  const drag = useRef(null), over = useRef(null);
  return {
    onDragStart: i => { drag.current = i; },
    onDragEnter: i => { over.current = i; },
    onDragEnd: () => {
      if (drag.current === null || over.current === null || drag.current === over.current) { drag.current = over.current = null; return; }
      const next = [...items]; const [m] = next.splice(drag.current,1); next.splice(over.current,0,m);
      setItems(next); drag.current = over.current = null;
    },
  };
}

// ─── UI primitives ────────────────────────────────────────────────────────────
const inp = { width:"100%", background:"#fff", border:`1px solid ${C.border}`, borderRadius:8, color:C.text, padding:"8px 12px", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"inherit", transition:"border-color 0.15s,box-shadow 0.15s" };
const lbl = { fontSize:11, fontWeight:600, color:C.textSec, marginBottom:4, display:"block", textTransform:"uppercase", letterSpacing:"0.05em" };

function Input({style,...p}){
  return <input style={{...inp,...style}} {...p}
    onFocus={e=>{e.target.style.borderColor=C.borderFocus;e.target.style.boxShadow=`0 0 0 3px ${C.indigoLight}`;}}
    onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/>;
}
function Textarea({style,...p}){
  return <textarea style={{...inp,resize:"vertical",minHeight:60,...style}} {...p}
    onFocus={e=>{e.target.style.borderColor=C.borderFocus;e.target.style.boxShadow=`0 0 0 3px ${C.indigoLight}`;}}
    onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}/>;
}
function Btn({variant="ghost",size="md",children,style,...p}){
  const base={display:"inline-flex",alignItems:"center",gap:6,border:"none",borderRadius:8,cursor:"pointer",fontWeight:600,fontFamily:"inherit",transition:"all 0.15s",whiteSpace:"nowrap",fontSize:size==="sm"?12:13,padding:size==="sm"?"5px 10px":"8px 14px"};
  const v={primary:{background:C.indigo,color:"#fff",boxShadow:C.shadow},ghost:{background:"transparent",color:C.textSec,border:`1px solid ${C.border}`},danger:{background:C.redLight,color:C.red,border:`1px solid #fca5a5`},amber:{background:C.amberLight,color:"#92400e",border:`1px solid #fcd34d`},subtle:{background:C.slateLight,color:C.textSec},green:{background:C.greenLight,color:"#065f46",border:`1px solid #6ee7b7`}};
  return <button style={{...base,...v[variant],...style}} {...p}>{children}</button>;
}
function Card({children,style,...p}){return <div style={{background:C.surface,borderRadius:12,border:`1px solid ${C.border}`,boxShadow:C.shadow,...style}} {...p}>{children}</div>;}
function Badge({color,bg,children,style}){return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"2px 8px",borderRadius:20,fontSize:11,fontWeight:600,background:bg,color,...style}}>{children}</span>;}

function StatusBadge({status}){
  const s=STATUSES[status]||STATUSES.draft;
  return <span style={{display:"inline-flex",alignItems:"center",gap:4,padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:s.bg,color:s.color,border:`1px solid ${s.color}33`}}>{s.icon} {s.label}</span>;
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────
function Lightbox({src,onClose}){
  useEffect(()=>{ const h=e=>{ if(e.key==="Escape") onClose(); }; window.addEventListener("keydown",h); return ()=>window.removeEventListener("keydown",h); },[]);
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.92)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out"}}>
      <img src={src} onClick={e=>e.stopPropagation()} alt="Reference" style={{maxWidth:"90vw",maxHeight:"90vh",objectFit:"contain",borderRadius:8,boxShadow:"0 25px 50px rgba(0,0,0,0.5)"}}/>
      <button onClick={onClose} style={{position:"fixed",top:20,right:24,background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",color:"#fff",borderRadius:8,padding:"6px 12px",cursor:"pointer",fontSize:14,fontWeight:600}}>✕ Close</button>
    </div>
  );
}

// ─── Response type chips ──────────────────────────────────────────────────────
function RespTypeChips({selected,onChange}){
  const toggle=t=>{
    if(selected.includes(t)){if(selected.length===1)return;onChange(selected.filter(x=>x!==t));}
    else onChange([...selected,t]);
  };
  return (
    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
      {RESP_TYPES.map(rt=>{
        const on=selected.includes(rt.type);
        return <button key={rt.type} onClick={()=>toggle(rt.type)} style={{display:"inline-flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:20,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s",background:on?rt.bg:"#f8fafc",color:on?rt.color:C.textMut,border:`1.5px solid ${on?rt.color+"66":C.border}`}}><span>{rt.icon}</span>{rt.label}</button>;
      })}
    </div>
  );
}

// ─── Ref photo picker ─────────────────────────────────────────────────────────
function RefPhotoPicker({value,onChange,onLightbox}){
  const ref=useRef();
  const pick=e=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>onChange(r.result);r.readAsDataURL(file);};
  return (
    <div>
      <div style={lbl}>Reference photo</div>
      {value?(
        <div style={{position:"relative",display:"inline-block"}}>
          <img src={value} alt="ref" onClick={()=>onLightbox(value)} style={{width:120,height:80,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`,display:"block",cursor:"zoom-in"}} title="Click to view fullscreen"/>
          <button onClick={()=>onChange(null)} style={{position:"absolute",top:4,right:4,width:20,height:20,borderRadius:"50%",background:C.red,color:"#fff",border:"none",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
      ):(
        <div onClick={()=>ref.current.click()} style={{width:120,height:80,borderRadius:8,border:`2px dashed ${C.border}`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",cursor:"pointer",color:C.textMut,fontSize:11,gap:4,background:C.slateLight,transition:"border-color 0.15s"}} onMouseEnter={e=>e.currentTarget.style.borderColor=C.indigo} onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
          <span style={{fontSize:20}}>📷</span><span>Add photo</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{display:"none"}} onChange={pick}/>
    </div>
  );
}

// ─── Field card ───────────────────────────────────────────────────────────────
function FieldCard({field,onChange,onDelete,dragHandlers,onLightbox}){
  const [open,setOpen]=useState(true);
  const hasN=field.responseTypes.includes("number");
  const hasR=field.responseTypes.includes("rating");
  const hasPF=field.responseTypes.includes("passfail");
  return (
    <div draggable onDragStart={dragHandlers.onDragStart} onDragEnter={dragHandlers.onDragEnter} onDragEnd={dragHandlers.onDragEnd} onDragOver={e=>e.preventDefault()} style={{marginBottom:10}}>
      <Card style={{overflow:"hidden",transition:"box-shadow 0.15s"}} onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd} onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}>
        {/* Header */}
        <div style={{padding:"11px 14px",display:"flex",alignItems:"center",gap:8,borderBottom:open?`1px solid ${C.border}`:"none",cursor:"pointer",background:open?"#fff":C.slateLight,borderRadius:open?"12px 12px 0 0":12}} onClick={()=>setOpen(o=>!o)}>
          <span style={{color:C.textMut,cursor:"grab",fontSize:14,userSelect:"none"}} title="Drag to reorder">⠿</span>
          <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
            {field.responseTypes.map(rt=>{const d=RESP_TYPES.find(r=>r.type===rt);return <Badge key={rt} color={d.color} bg={d.bg}>{d.icon} {d.label}</Badge>;})}
          </div>
          <span style={{flex:1,fontSize:13,color:field.label?C.text:C.textMut,marginLeft:4,fontWeight:field.label?500:400}}>{field.label||"Untitled check"}</span>
          {field.refDoc&&(
            <span style={{fontSize:11,fontFamily:"monospace",background:C.amberLight,color:"#92400e",padding:"2px 7px",borderRadius:6,border:"1px solid #fcd34d",flexShrink:0}}>{field.refDoc}</span>
          )}
          {field.required&&<span style={{fontSize:11,color:C.red,fontWeight:700,flexShrink:0}}>Required</span>}
          <span style={{color:C.textMut,fontSize:11}}>{open?"▲":"▼"}</span>
        </div>
        {/* Body */}
        {open&&(
          <div style={{padding:14}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}>
              <div style={{gridColumn:"1 / -1"}}><label style={lbl}>Check label</label><Input value={field.label} placeholder="e.g. Check oil level in gearbox" onChange={e=>onChange({...field,label:e.target.value})}/></div>
              <div>
                <label style={lbl}>Reference document</label>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <Input value={field.refDoc} placeholder="IP-0412.135 or URL" style={{fontFamily:"monospace",fontSize:12}} onChange={e=>onChange({...field,refDoc:e.target.value})}/>
                  {field.refDoc&&field.refDoc.startsWith("http")&&(
                    <a href={field.refDoc} target="_blank" rel="noopener noreferrer" style={{flexShrink:0,fontSize:18,textDecoration:"none"}} title="Open document">🔗</a>
                  )}
                </div>
              </div>
              <div><label style={lbl}>Help text</label><Input value={field.helpText} placeholder="Shown as a hint to the operator" onChange={e=>onChange({...field,helpText:e.target.value})}/></div>
            </div>
            <div style={{marginBottom:10}}>
              <label style={lbl}>Response types <span style={{fontWeight:400,color:C.textMut,textTransform:"none"}}>(mix & match)</span></label>
              <RespTypeChips selected={field.responseTypes} onChange={v=>onChange({...field,responseTypes:v})}/>
            </div>
            {(hasN||hasR||hasPF)&&(
              <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:10,padding:"10px 12px",background:C.slateLight,borderRadius:8}}>
                {hasN&&<><div style={{minWidth:70}}><label style={lbl}>Unit</label><Input value={field.unit} placeholder="°C" onChange={e=>onChange({...field,unit:e.target.value})}/></div><div style={{minWidth:60}}><label style={lbl}>Min</label><Input value={field.min} placeholder="0" type="number" onChange={e=>onChange({...field,min:e.target.value})}/></div><div style={{minWidth:60}}><label style={lbl}>Max</label><Input value={field.max} placeholder="100" type="number" onChange={e=>onChange({...field,max:e.target.value})}/></div></>}
                {hasR&&<div><label style={lbl}>Rating max</label><div style={{display:"flex",gap:4}}>{[3,4,5,10].map(n=><button key={n} onClick={()=>onChange({...field,ratingMax:n})} style={{width:32,height:32,borderRadius:8,border:`1.5px solid ${field.ratingMax===n?C.indigo:C.border}`,background:field.ratingMax===n?C.indigoLight:"#fff",color:field.ratingMax===n?C.indigo:C.textSec,cursor:"pointer",fontWeight:700,fontSize:12}}>{n}</button>)}</div></div>}
                {hasPF&&<div style={{alignSelf:"flex-end",paddingBottom:2}}><label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}><input type="checkbox" checked={field.naAllowed} onChange={e=>onChange({...field,naAllowed:e.target.checked})}/><span style={{fontSize:12,color:C.textSec}}>Allow N/A</span></label></div>}
              </div>
            )}
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between"}}>
              <RefPhotoPicker value={field.refPhoto} onChange={v=>onChange({...field,refPhoto:v})} onLightbox={onLightbox}/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",fontSize:12,color:C.textSec}}><input type="checkbox" checked={field.required} onChange={e=>onChange({...field,required:e.target.checked})}/>Required</label>
                <Btn variant="danger" size="sm" onClick={onDelete}>Remove</Btn>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ─── Section editor ───────────────────────────────────────────────────────────
function SectionEditor({section,onChange,onLightbox}){
  const setFields=fields=>onChange({...section,fields});
  const {onDragStart,onDragEnter,onDragEnd}=useDrag(section.fields,setFields);
  const addField=()=>onChange({...section,fields:[...section.fields,newField()]});
  const upd=(i,f)=>{const fs=[...section.fields];fs[i]=f;onChange({...section,fields:fs});};
  const del=i=>onChange({...section,fields:section.fields.filter((_,j)=>j!==i)});
  return (
    <div>
      {section.fields.map((f,i)=>(
        <FieldCard key={f.id} field={f} onChange={u=>upd(i,u)} onDelete={()=>del(i)} onLightbox={onLightbox}
          dragHandlers={{onDragStart:()=>onDragStart(i),onDragEnter:()=>onDragEnter(i),onDragEnd}}/>
      ))}
      <button onClick={addField} style={{width:"100%",padding:"10px",borderRadius:10,border:`2px dashed ${C.border}`,background:"transparent",color:C.textMut,cursor:"pointer",fontSize:13,fontFamily:"inherit",fontWeight:500,transition:"all 0.15s"}}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=C.indigo;e.currentTarget.style.color=C.indigo;e.currentTarget.style.background=C.indigoLight;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMut;e.currentTarget.style.background="transparent";}}>
        + Add check
      </button>
    </div>
  );
}

// ─── Approval panel ───────────────────────────────────────────────────────────
function ApprovalPanel({form,onUpdate}){
  const [name,setName]=useState("");
  const [comment,setComment]=useState("");
  const [action,setAction]=useState("approve");

  const submit=()=>{
    if(!name.trim()) return;
    const entry={id:uid(),name:name.trim(),comment:comment.trim(),action,date:new Date().toISOString()};
    const newApprovals=[...(form.approvals||[]),entry];
    const newStatus=action==="approve"?"approved":action==="reject"?"rejected":"review";
    onUpdate({...form,approvals:newApprovals,status:newStatus,updatedAt:new Date().toISOString()});
    setName("");setComment("");
  };

  const statusFlow=["draft","review","approved"];

  return (
    <div>
      {/* Status stepper */}
      <div style={{display:"flex",alignItems:"center",gap:0,marginBottom:20}}>
        {statusFlow.map((s,i)=>{
          const st=STATUSES[s];
          const isActive=form.status===s||(form.status==="rejected"&&s==="review");
          const isPast=statusFlow.indexOf(form.status)>i&&form.status!=="rejected";
          return (
            <div key={s} style={{display:"flex",alignItems:"center",flex:1}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4,flex:1}}>
                <div style={{width:32,height:32,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,background:isPast?C.green:isActive?st.bg:"#f1f5f9",color:isPast?"#fff":isActive?st.color:C.textMut,border:`2px solid ${isPast?C.green:isActive?st.color:C.border}`,transition:"all 0.3s"}}>{isPast?"✓":st.icon}</div>
                <span style={{fontSize:10,fontWeight:600,color:isActive?st.color:C.textMut,textAlign:"center"}}>{st.label}</span>
              </div>
              {i<statusFlow.length-1&&<div style={{height:2,flex:1,background:isPast?C.green:C.border,margin:"0 4px",marginBottom:18,transition:"background 0.3s"}}/>}
            </div>
          );
        })}
      </div>

      {/* Approval history */}
      {(form.approvals||[]).length>0&&(
        <div style={{marginBottom:16}}>
          <div style={lbl}>History</div>
          {[...(form.approvals||[])].reverse().map(a=>(
            <div key={a.id} style={{padding:"10px 12px",borderRadius:8,border:`1px solid ${C.border}`,marginBottom:6,background:a.action==="approve"?C.greenLight:a.action==="reject"?C.redLight:C.amberLight}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:a.comment?4:0}}>
                <span style={{fontSize:14}}>{a.action==="approve"?"✓":a.action==="reject"?"↩":"👁"}</span>
                <span style={{fontWeight:600,fontSize:13,color:C.text}}>{a.name}</span>
                <span style={{fontSize:11,color:C.textMut,marginLeft:"auto"}}>{new Date(a.date).toLocaleString()}</span>
              </div>
              {a.comment&&<div style={{fontSize:12,color:C.textSec,marginLeft:22}}>{a.comment}</div>}
            </div>
          ))}
        </div>
      )}

      {/* Submit action */}
      <Card style={{padding:14}}>
        <div style={lbl}>Add review action</div>
        <div style={{marginBottom:8}}><label style={lbl}>Your name</label><Input value={name} placeholder="Sign off as…" onChange={e=>setName(e.target.value)}/></div>
        <div style={{marginBottom:8}}><label style={lbl}>Comment <span style={{fontWeight:400,color:C.textMut,textTransform:"none"}}>(optional)</span></label><Textarea value={comment} placeholder="Notes, required changes…" onChange={e=>setComment(e.target.value)}/></div>
        <div style={{marginBottom:10}}>
          <label style={lbl}>Action</label>
          <div style={{display:"flex",gap:6}}>
            {[{v:"review",label:"Send for review",col:C.amber,bg:C.amberLight},{v:"approve",label:"Approve",col:C.green,bg:C.greenLight},{v:"reject",label:"Request changes",col:C.red,bg:C.redLight}].map(opt=>(
              <button key={opt.v} onClick={()=>setAction(opt.v)} style={{flex:1,padding:"7px 4px",borderRadius:8,border:`1.5px solid ${action===opt.v?opt.col:C.border}`,background:action===opt.v?opt.bg:"#fff",color:action===opt.v?opt.col:C.textSec,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",transition:"all 0.15s"}}>{opt.label}</button>
            ))}
          </div>
        </div>
        <Btn variant="primary" style={{width:"100%",justifyContent:"center"}} onClick={submit} disabled={!name.trim()}>Submit</Btn>
      </Card>
    </div>
  );
}

// ─── Device preview ───────────────────────────────────────────────────────────
const DEVICES=[
  {id:"phone-p",   label:"Phone",    icon:"📱", w:375,  h:812,  orient:"portrait"},
  {id:"phone-l",   label:"Phone ↔",  icon:"📱", w:812,  h:375,  orient:"landscape"},
  {id:"tablet-p",  label:"Tablet",   icon:"📟", w:768,  h:1024, orient:"portrait"},
  {id:"tablet-l",  label:"Tablet ↔", icon:"📟", w:1024, h:768,  orient:"landscape"},
  {id:"desktop",   label:"Desktop",  icon:"🖥",  w:1280, h:800,  orient:"landscape"},
];

function DevicePreview({form,onClose}){
  const [devId,setDevId]=useState("phone-p");
  const [values,setValues]=useState({});
  const [photos,setPhotos]=useState({});
  const [activeSec,setActiveSec]=useState(0);
  const fileRefs=useRef({});
  const dev=DEVICES.find(d=>d.id===devId);

  // Scale to fit viewport
  const maxW=Math.min(window.innerWidth-160, dev.w);
  const maxH=Math.min(window.innerHeight-180, dev.h);
  const scale=Math.min(maxW/dev.w, maxH/dev.h, 1);

  const sec=form.sections[activeSec]||form.sections[0];
  const totalFields=form.sections.reduce((a,s)=>a+s.fields.length,0);
  const answered=Object.values(values).filter(v=>v!==""&&v!==undefined&&v!==false).length;

  const setVal=(fid,rt,v)=>setValues(p=>({...p,[`${fid}_${rt}`]:v}));
  const getVal=(fid,rt)=>values[`${fid}_${rt}`];
  const handlePhoto=(fid,e)=>{const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=()=>setPhotos(p=>({...p,[fid]:r.result}));r.readAsDataURL(file);};

  const isPhone=devId.startsWith("phone");
  const isTablet=devId.startsWith("tablet");
  const isDesktop=devId==="desktop";

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(10,15,30,0.85)",backdropFilter:"blur(6px)",zIndex:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"flex-start",padding:"16px 0 0"}}>
      {/* Device switcher */}
      <div style={{display:"flex",gap:6,marginBottom:16,background:"rgba(255,255,255,0.08)",padding:6,borderRadius:12,border:"1px solid rgba(255,255,255,0.12)"}}>
        {DEVICES.map(d=>(
          <button key={d.id} onClick={()=>{setDevId(d.id);setActiveSec(0);}} style={{display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,transition:"all 0.15s",background:devId===d.id?"rgba(255,255,255,0.95)":"transparent",color:devId===d.id?C.text:"rgba(255,255,255,0.6)"}}>
            {d.icon} {d.label}
          </button>
        ))}
        <div style={{width:1,background:"rgba(255,255,255,0.15)",margin:"4px 2px"}}/>
        <button onClick={onClose} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,background:"transparent",color:"rgba(255,255,255,0.6)"}}>✕ Close</button>
      </div>

      {/* Device frame */}
      <div style={{flex:1,display:"flex",alignItems:"flex-start",justifyContent:"center",overflow:"hidden",paddingBottom:16}}>
        <div style={{
          width:dev.w, height:dev.h,
          transform:`scale(${scale})`, transformOrigin:"top center",
          background:C.bg,
          borderRadius:isPhone?36:isTablet?24:8,
          border:isPhone||isTablet?"6px solid #1e293b":"2px solid #334155",
          boxShadow:"0 30px 60px rgba(0,0,0,0.6)",
          overflow:"hidden",display:"flex",flexDirection:"column",
        }}>
          {/* App header */}
          <div style={{background:"#fff",padding:isDesktop?"12px 24px":"10px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0,display:"flex",alignItems:"center",gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:isDesktop?10:9,color:C.textMut,textTransform:"uppercase",letterSpacing:"0.06em"}}>{form.docRef||"CHECK SHEET"}</div>
              <div style={{fontSize:isDesktop?16:13,fontWeight:700,color:C.text,lineHeight:1.2}}>{form.title||"Untitled form"}</div>
            </div>
            <div style={{textAlign:"right",flexShrink:0}}>
              <div style={{fontSize:isDesktop?12:10,color:C.textMut}}>{answered}/{totalFields} done</div>
              <div style={{height:3,background:C.border,borderRadius:4,width:isDesktop?80:60,marginTop:3}}>
                <div style={{height:"100%",width:`${totalFields?(answered/totalFields)*100:0}%`,background:C.green,borderRadius:4,transition:"width 0.3s"}}/>
              </div>
            </div>
          </div>

          {/* Desktop sidebar + content */}
          {isDesktop?(
            <div style={{flex:1,display:"flex",overflow:"hidden"}}>
              {/* Sidebar nav */}
              <div style={{width:220,background:"#fff",borderRight:`1px solid ${C.border}`,overflowY:"auto",padding:"12px 10px"}}>
                <div style={{fontSize:10,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:8,padding:"0 6px"}}>Sections</div>
                {form.sections.map((s,i)=>(
                  <div key={s.id} onClick={()=>setActiveSec(i)} style={{padding:"8px 10px",borderRadius:8,cursor:"pointer",marginBottom:2,background:activeSec===i?C.indigoLight:"transparent",color:activeSec===i?C.indigo:C.textSec,fontWeight:activeSec===i?600:400,fontSize:12,transition:"all 0.15s"}}>
                    {s.title||`Section ${i+1}`} <span style={{float:"right",color:C.textMut,fontWeight:400}}>{s.fields.length}</span>
                  </div>
                ))}
              </div>
              {/* Fields */}
              <div style={{flex:1,overflowY:"auto",padding:"16px 20px"}}>
                <FieldsList sec={sec} isDesktop={true} values={values} photos={photos} setPhotos={setPhotos} setVal={setVal} getVal={getVal} handlePhoto={handlePhoto} fileRefs={fileRefs} activeSec={activeSec} totalSections={form.sections.length} setActiveSec={setActiveSec} form={form}/>
              </div>
            </div>
          ):(
            <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
              {/* Section tabs */}
              {form.sections.length>1&&(
                <div style={{display:"flex",overflowX:"auto",background:"#fff",borderBottom:`1px solid ${C.border}`,padding:"0 8px",flexShrink:0}}>
                  {form.sections.map((s,i)=>(
                    <button key={s.id} onClick={()=>setActiveSec(i)} style={{padding:"7px 10px",border:"none",background:"transparent",cursor:"pointer",fontSize:11,fontWeight:600,whiteSpace:"nowrap",fontFamily:"inherit",color:activeSec===i?C.indigo:C.textMut,borderBottom:activeSec===i?`2px solid ${C.indigo}`:"2px solid transparent"}}>{s.title||`§${i+1}`}</button>
                  ))}
                </div>
              )}
              <div style={{flex:1,overflowY:"auto",padding:"10px 10px"}}>
                <FieldsList sec={sec} isDesktop={false} values={values} photos={photos} setPhotos={setPhotos} setVal={setVal} getVal={getVal} handlePhoto={handlePhoto} fileRefs={fileRefs} activeSec={activeSec} totalSections={form.sections.length} setActiveSec={setActiveSec} form={form}/>
              </div>
              {/* Bottom nav */}
              <div style={{background:"#fff",padding:"8px 10px",borderTop:`1px solid ${C.border}`,display:"flex",gap:8,flexShrink:0}}>
                <button onClick={()=>setActiveSec(s=>Math.max(0,s-1))} disabled={activeSec===0} style={{flex:1,padding:"7px",borderRadius:10,border:`1px solid ${C.border}`,background:"#fff",color:activeSec===0?C.textMut:C.text,cursor:activeSec===0?"default":"pointer",fontFamily:"inherit",fontWeight:600,fontSize:12}}>← Back</button>
                {activeSec<form.sections.length-1?(
                  <button onClick={()=>setActiveSec(s=>s+1)} style={{flex:2,padding:"7px",borderRadius:10,border:"none",background:C.indigo,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:12}}>Next →</button>
                ):(
                  <button onClick={()=>alert("Submitted! (preview mode)")} style={{flex:2,padding:"7px",borderRadius:10,border:"none",background:C.green,color:"#fff",cursor:"pointer",fontFamily:"inherit",fontWeight:600,fontSize:12}}>✓ Submit</button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ─── Markup canvas ─────────────────────────────────────────────────────────────
// Lets the operator draw on a background image (or blank canvas) to mark
// locations, faults, damage etc. Tools: pen, arrow, circle, clear.
function MarkupCanvas({bgImage, value, onChange, width=320, height=220}){
  const canvasRef = useRef();
  const drawing   = useRef(false);
  const lastPt    = useRef(null);
  const [tool, setTool]   = useState("pen");   // pen | arrow | circle | clear
  const [color, setColor] = useState("#ef4444");
  const [dirty, setDirty] = useState(false);

  // Draw background image onto canvas whenever bgImage changes
  useEffect(()=>{
    const canvas = canvasRef.current; if(!canvas) return;
    const ctx = canvas.getContext("2d");
    if(bgImage){
      const img = new Image();
      img.onload = ()=>{
        ctx.clearRect(0,0,canvas.width,canvas.height);
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        // If we have saved markup strokes, replay them
        if(value){ const overlay=new Image(); overlay.onload=()=>ctx.drawImage(overlay,0,0); overlay.src=value; }
      };
      img.src=bgImage;
    } else {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.fillStyle="#f8fafc";
      ctx.fillRect(0,0,canvas.width,canvas.height);
      // Grid
      ctx.strokeStyle="#e2e8f0"; ctx.lineWidth=1;
      for(let x=0;x<canvas.width;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}
      for(let y=0;y<canvas.height;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}
      if(value){ const overlay=new Image(); overlay.onload=()=>ctx.drawImage(overlay,0,0); overlay.src=value; }
    }
  },[bgImage]);

  const getPos=(e)=>{
    const r=canvasRef.current.getBoundingClientRect();
    const t=e.touches?e.touches[0]:e;
    return {x:(t.clientX-r.left)*(canvasRef.current.width/r.width), y:(t.clientY-r.top)*(canvasRef.current.height/r.height)};
  };

  const startDraw=(e)=>{
    e.preventDefault();
    if(tool==="clear"){clearCanvas();return;}
    drawing.current=true;
    lastPt.current=getPos(e);
    if(tool==="pen"){
      const ctx=canvasRef.current.getContext("2d");
      ctx.beginPath(); ctx.moveTo(lastPt.current.x,lastPt.current.y);
    }
  };

  const doDraw=(e)=>{
    e.preventDefault();
    if(!drawing.current) return;
    const ctx=canvasRef.current.getContext("2d");
    const pt=getPos(e);
    if(tool==="pen"){
      ctx.strokeStyle=color; ctx.lineWidth=3; ctx.lineCap="round"; ctx.lineJoin="round";
      ctx.lineTo(pt.x,pt.y); ctx.stroke();
    }
    lastPt.current=pt;
  };

  const endDraw=(e)=>{
    if(!drawing.current) return;
    drawing.current=false;
    const ctx=canvasRef.current.getContext("2d");
    const pt=lastPt.current;
    const start=lastPt.current; // for arrow/circle we use mousedown point stored in startPt
    if(tool==="arrow" && startPt.current){
      drawArrow(ctx, startPt.current, getPos(e||{})||pt, color);
    }
    if(tool==="circle" && startPt.current){
      const ep=getPos(e||{})||pt;
      const r=Math.sqrt(Math.pow(ep.x-startPt.current.x,2)+Math.pow(ep.y-startPt.current.y,2));
      ctx.strokeStyle=color; ctx.lineWidth=3; ctx.beginPath();
      ctx.arc(startPt.current.x,startPt.current.y,r,0,2*Math.PI); ctx.stroke();
    }
    setDirty(true);
    onChange(canvasRef.current.toDataURL("image/png"));
  };

  const startPt=useRef(null);
  const startDrawShape=(e)=>{
    e.preventDefault();
    if(tool==="clear"){clearCanvas();return;}
    drawing.current=true;
    startPt.current=getPos(e);
    lastPt.current=startPt.current;
    if(tool==="pen"){
      const ctx=canvasRef.current.getContext("2d");
      ctx.beginPath(); ctx.moveTo(startPt.current.x,startPt.current.y);
    }
  };

  function drawArrow(ctx,from,to,col){
    const headLen=16, angle=Math.atan2(to.y-from.y,to.x-from.x);
    ctx.strokeStyle=col; ctx.fillStyle=col; ctx.lineWidth=3; ctx.lineCap="round";
    ctx.beginPath(); ctx.moveTo(from.x,from.y); ctx.lineTo(to.x,to.y); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(to.x,to.y);
    ctx.lineTo(to.x-headLen*Math.cos(angle-Math.PI/6),to.y-headLen*Math.sin(angle-Math.PI/6));
    ctx.lineTo(to.x-headLen*Math.cos(angle+Math.PI/6),to.y-headLen*Math.sin(angle+Math.PI/6));
    ctx.closePath(); ctx.fill();
  }

  const clearCanvas=()=>{
    const canvas=canvasRef.current; const ctx=canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if(bgImage){const img=new Image();img.onload=()=>ctx.drawImage(img,0,0,canvas.width,canvas.height);img.src=bgImage;}
    else{ctx.fillStyle="#f8fafc";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.strokeStyle="#e2e8f0";ctx.lineWidth=1;for(let x=0;x<canvas.width;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke();}for(let y=0;y<canvas.height;y+=20){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke();}}
    onChange(null); setDirty(false);
  };

  const TOOLS=[{id:"pen",icon:"✏️",label:"Draw"},{id:"arrow",icon:"➡",label:"Arrow"},{id:"circle",icon:"⭕",label:"Circle"},{id:"clear",icon:"🗑",label:"Clear"}];
  const COLORS=["#ef4444","#f59e0b","#10b981","#3b82f6","#8b5cf6","#0f172a","#ffffff"];

  return (
    <div style={{border:`1px solid #0891b233`,borderRadius:10,overflow:"hidden",background:"#f0fdfe"}}>
      {/* Toolbar */}
      <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 10px",background:"#0891b2",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:4}}>
          {TOOLS.map(t=>(
            <button key={t.id} onClick={()=>setTool(t.id)} title={t.label} style={{padding:"4px 8px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,background:tool===t.id&&t.id!=="clear"?"rgba(255,255,255,0.95)":"rgba(255,255,255,0.15)",color:tool===t.id&&t.id!=="clear"?"#0891b2":"#fff",transition:"all 0.15s"}}>{t.icon}</button>
          ))}
        </div>
        <div style={{width:1,height:20,background:"rgba(255,255,255,0.3)",margin:"0 4px"}}/>
        <div style={{display:"flex",gap:4,alignItems:"center"}}>
          {COLORS.map(col=>(
            <div key={col} onClick={()=>setColor(col)} style={{width:18,height:18,borderRadius:"50%",background:col,cursor:"pointer",border:`2px solid ${color===col?"#fff":"rgba(255,255,255,0.3)"}`,transition:"border 0.15s",boxShadow:color===col?"0 0 0 1px #0891b2":"none"}}/>
          ))}
        </div>
        {dirty&&<span style={{marginLeft:"auto",fontSize:10,color:"rgba(255,255,255,0.8)"}}>Marked up ✓</span>}
      </div>
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={width} height={height}
        style={{display:"block",width:"100%",touchAction:"none",cursor:tool==="clear"?"not-allowed":tool==="pen"?"crosshair":"crosshair"}}
        onMouseDown={startDrawShape}
        onMouseMove={tool==="pen"?doDraw:undefined}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDrawShape}
        onTouchMove={tool==="pen"?doDraw:undefined}
        onTouchEnd={endDraw}
      />
      <div style={{padding:"4px 10px",background:"#cffafe",fontSize:10,color:"#0891b2",fontWeight:500}}>
        {tool==="pen"&&"Draw freely on the diagram"}{tool==="arrow"&&"Click and drag to draw an arrow"}{tool==="circle"&&"Click and drag to draw a circle"}{tool==="clear"&&"Tap to clear all markup"}
      </div>
    </div>
  );
}

function FieldsList({sec,isDesktop,values,photos,setPhotos,setVal,getVal,handlePhoto,fileRefs,activeSec,totalSections,setActiveSec,form}){
  const [lb,setLb]=useState(null);
  const [photoMarkup,setPhotoMarkup]=useState({});
  if(!sec) return null;
  return (
    <>
      {lb&&<Lightbox src={lb} onClose={()=>setLb(null)}/>}
      {sec.fields.map(field=>{
        const rt=field.responseTypes;
        return (
          <div key={field.id} style={{marginBottom:10}}>
            <Card style={{padding:isDesktop?14:11}}>
              <div style={{marginBottom:8}}>
                <div style={{display:"flex",alignItems:"flex-start",gap:6,marginBottom:4}}>
                  <span style={{fontSize:isDesktop?13:12,fontWeight:600,color:C.text,flex:1,lineHeight:1.4}}>{field.label||<span style={{color:C.textMut}}>Untitled check</span>}{field.required&&<span style={{color:C.red,marginLeft:4}}>*</span>}</span>
                </div>
                {field.refDoc&&(
                  <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:10,fontFamily:"monospace",background:C.amberLight,color:"#92400e",padding:"2px 7px",borderRadius:5,border:"1px solid #fcd34d",marginBottom:4}}>
                    {field.refDoc.startsWith("http")
                      ?<a href={field.refDoc} target="_blank" rel="noopener noreferrer" style={{color:"#92400e",textDecoration:"none"}}>📄 {field.refDoc} ↗</a>
                      :<span>📄 {field.refDoc}</span>
                    }
                  </div>
                )}
                {field.helpText&&<div style={{fontSize:11,color:C.textSec,marginTop:2,fontStyle:"italic"}}>{field.helpText}</div>}
                {field.refPhoto&&<img src={field.refPhoto} alt="reference" onClick={()=>setLb(field.refPhoto)} style={{width:"100%",maxHeight:isDesktop?120:90,objectFit:"cover",borderRadius:8,marginTop:6,border:`1px solid ${C.border}`,cursor:"zoom-in"}} title="Click to enlarge"/>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {rt.includes("checkbox")&&(
                  <label style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                    <div onClick={()=>setVal(field.id,"checkbox",!getVal(field.id,"checkbox"))} style={{width:20,height:20,borderRadius:5,border:`2px solid ${getVal(field.id,"checkbox")?C.green:C.border}`,background:getVal(field.id,"checkbox")?C.green:"#fff",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                      {getVal(field.id,"checkbox")&&<span style={{color:"#fff",fontSize:12,fontWeight:900}}>✓</span>}
                    </div>
                    <span style={{fontSize:12,color:C.textSec}}>Done / confirmed</span>
                  </label>
                )}
                {rt.includes("passfail")&&(
                  <div style={{display:"flex",gap:6}}>
                    {["Pass","Fail",...(field.naAllowed?["N/A"]:[])].map(opt=>{
                      const sel=getVal(field.id,"passfail")===opt;
                      const col=opt==="Pass"?C.green:opt==="Fail"?C.red:C.slate;
                      return <button key={opt} onClick={()=>setVal(field.id,"passfail",opt)} style={{flex:1,padding:"6px 4px",borderRadius:8,border:`1.5px solid ${sel?col:C.border}`,background:sel?col:"#fff",color:sel?"#fff":C.textSec,cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",transition:"all 0.15s"}}>{opt}</button>;
                    })}
                  </div>
                )}
                {rt.includes("number")&&(
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="number" placeholder={field.min||"0"} value={getVal(field.id,"number")||""} onChange={e=>setVal(field.id,"number",e.target.value)} style={{...inp,flex:1,fontSize:14,fontWeight:600,textAlign:"center"}}/>
                    {field.unit&&<span style={{fontSize:12,color:C.textSec,fontWeight:500,flexShrink:0}}>{field.unit}</span>}
                  </div>
                )}
                {rt.includes("text")&&<textarea placeholder="Add a comment…" value={getVal(field.id,"text")||""} onChange={e=>setVal(field.id,"text",e.target.value)} style={{...inp,minHeight:50,resize:"vertical",fontSize:12}}/>}
                {rt.includes("rating")&&(
                  <div style={{display:"flex",gap:4}}>
                    {Array.from({length:field.ratingMax||5},(_,i)=>i+1).map(n=>(
                      <button key={n} onClick={()=>setVal(field.id,"rating",n)} style={{flex:1,padding:"5px 2px",borderRadius:6,border:`1px solid ${C.border}`,background:(getVal(field.id,"rating")||0)>=n?C.amberLight:"#fff",color:(getVal(field.id,"rating")||0)>=n?"#92400e":C.textMut,cursor:"pointer",fontSize:14,fontFamily:"inherit"}}>★</button>
                    ))}
                  </div>
                )}
                {rt.includes("photo")&&(
                  <div>
                    {photos[field.id]?(
                      <div>
                        {/* Captured photo thumbnail + actions */}
                        <div style={{position:"relative",marginBottom:6}}>
                          <img src={photos[field.id]} alt="capture" style={{width:"100%",maxHeight:120,objectFit:"cover",borderRadius:8,border:`1px solid ${C.border}`,display:"block"}}/>
                          <div style={{position:"absolute",top:6,right:6,display:"flex",gap:4}}>
                            <button
                              onClick={()=>setPhotoMarkup(m=>({...m,[field.id]:m[field.id]===true?false:true}))}
                              title="Mark up this photo"
                              style={{padding:"4px 8px",borderRadius:6,border:"none",cursor:"pointer",fontSize:11,fontWeight:600,fontFamily:"inherit",background:"#0891b2",color:"#fff",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>
                              ✏️ Mark up
                            </button>
                            <button onClick={()=>{setPhotos(p=>{const n={...p};delete n[field.id];return n;});setPhotoMarkup(m=>{const n={...m};delete n[field.id];return n;});setVal(field.id,"photoMarkup",null);}}
                              style={{width:22,height:22,borderRadius:"50%",background:C.red,color:"#fff",border:"none",cursor:"pointer",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}>✕</button>
                          </div>
                        </div>
                        {/* Markup canvas — shown when Mark up is active, uses captured photo as bg */}
                        {photoMarkup[field.id]&&(
                          <div style={{marginTop:4}}>
                            <div style={{fontSize:11,fontWeight:600,color:"#0891b2",marginBottom:4}}>✏️ Mark up your photo</div>
                            <MarkupCanvas
                              bgImage={photos[field.id]}
                              value={getVal(field.id,"photoMarkup")}
                              onChange={v=>setVal(field.id,"photoMarkup",v)}
                              width={isDesktop?520:300}
                              height={isDesktop?340:200}
                            />
                          </div>
                        )}
                      </div>
                    ):(
                      <>
                        <button onClick={()=>fileRefs.current[field.id]?.click()} style={{width:"100%",padding:"7px",borderRadius:8,border:`2px dashed ${C.border}`,background:C.purpleLight,color:C.purple,cursor:"pointer",fontSize:12,fontFamily:"inherit",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>📷 Take / attach photo</button>
                        <input ref={el=>fileRefs.current[field.id]=el} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handlePhoto(field.id,e)}/>
                      </>
                    )}
                  </div>
                )}
                {rt.includes("markup")&&(
                  <div>
                    <div style={{fontSize:11,fontWeight:600,color:"#0891b2",marginBottom:4,display:"flex",alignItems:"center",gap:6}}>
                      <span>✏️</span> Mark up the diagram
                      {!field.refPhoto&&<span style={{fontWeight:400,color:C.textMut}}>— add a reference photo to this check to use as background</span>}
                    </div>
                    <MarkupCanvas
                      bgImage={field.refPhoto||null}
                      value={getVal(field.id,"markup")}
                      onChange={v=>setVal(field.id,"markup",v)}
                      width={isDesktop?520:300}
                      height={isDesktop?340:200}
                    />
                  </div>
                )}
              </div>
            </Card>
          </div>
        );
      })}
      {sec.fields.length===0&&<div style={{textAlign:"center",padding:"40px 20px",color:C.textMut}}><div style={{fontSize:32,marginBottom:8}}>📋</div><div style={{fontSize:12}}>No checks in this section</div></div>}
    </>
  );
}

// ─── PDF import modal ─────────────────────────────────────────────────────────
function PdfImportModal({onImport,onClose}){
  const [status,setStatus]=useState("idle");
  const [log,setLog]=useState("");
  const [dragOver,setDragOver]=useState(false);
  const fileRef=useRef();

  const processFile=async file=>{
    if(!file||file.type!=="application/pdf"){setStatus("error");setLog("Please select a PDF file.");return;}
    setStatus("loading");setLog("Reading PDF…");
    const toB64=f=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(",")[1]);r.onerror=rej;r.readAsDataURL(f);});
    try{
      const b64=await toB64(file);
      setLog("Sending to Claude for analysis…");
      const resp=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:8192,messages:[{role:"user",content:[
          {type:"document",source:{type:"base64",media_type:"application/pdf",data:b64}},
          {type:"text",text:`You are a form digitisation assistant. Analyse this PDF check sheet and extract its structure.

Return ONLY a raw JSON object. Start with { end with }. No markdown, no commentary.

{
  "title": "form title",
  "description": "what this check sheet covers",
  "docRef": "document reference code e.g. IP-0412.135 — look near title or footer",
  "version": "version if shown",
  "sections": [
    {
      "title": "section heading",
      "fields": [
        {
          "label": "check item text",
          "refDoc": "any per-check document reference or procedure code shown next to this item, else empty string",
          "helpText": "any instruction note next to this item",
          "required": false,
          "responseTypes": ["checkbox"],
          "unit": null, "min": null, "max": null, "ratingMax": 5, "naAllowed": true
        }
      ]
    }
  ]
}

responseTypes: pick one or more from: checkbox, passfail, number, text, photo, rating
- checkbox = tick/done/complete
- passfail = pass/fail/ok/not-ok
- number = reading, measurement, temperature, pressure, level, count
- text = comment, note, observation
- photo = photograph or visual evidence required
- rating = score or scale
For items needing result + comment use ["passfail","text"]. Extract ALL checks, preserve ALL sections.`}
        ]}]})
      });
      const data=await resp.json();
      if(!resp.ok) throw new Error(data.error?.message||"API error");
      const raw=data.content.map(c=>c.text||"").join("");
      const extractAndRepair=str=>{
        const start=str.indexOf("{");
        if(start===-1) throw new Error("No JSON found");
        let depth=0,end=-1;
        for(let i=start;i<str.length;i++){if(str[i]==="{")depth++;else if(str[i]==="}"){depth--;if(depth===0){end=i;break;}}}
        const js=end!==-1?str.slice(start,end+1):str.slice(start);
        try{return JSON.parse(js);}catch(_){}
        let rep=js;const stack=[];let inStr=false,esc=false;
        for(let i=0;i<rep.length;i++){const ch=rep[i];if(esc){esc=false;continue;}if(ch==="\\"){esc=true;continue;}if(ch==='"'){inStr=!inStr;continue;}if(inStr)continue;if(ch==="{"||ch==="[")stack.push(ch);else if(ch==="}"||ch==="]")stack.pop();}
        rep=rep.replace(/,\s*$/,"").replace(/:\s*$/,": null").trimEnd();
        if(inStr)rep+='"';
        for(let i=stack.length-1;i>=0;i--)rep+=stack[i]==="["?"]":"}";
        try{return JSON.parse(rep);}catch(e){throw new Error("Parse failed: "+e.message);}
      };
      const parsed=extractAndRepair(raw);
      const fc=parsed.sections?.reduce((a,s)=>a+(s.fields?.length||0),0)||0;
      setLog(`Done! Imported ${fc} checks across ${parsed.sections?.length||0} sections.`);
      setStatus("done");
      const hydrated={...parsed,id:uid(),status:"draft",approvals:[],tags:[],version:parsed.version||"1.0",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
        sections:(parsed.sections||[]).map(s=>({...s,id:uid(),fields:(s.fields||[]).map(f=>({...newField(),...f,id:uid(),responseTypes:Array.isArray(f.responseTypes)&&f.responseTypes.length?f.responseTypes:["checkbox"]}))}))};
      setTimeout(()=>onImport(hydrated),600);
    }catch(err){setStatus("error");setLog("Error: "+err.message);}
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
      <Card style={{width:480,padding:28}}>
        <div style={{fontSize:18,fontWeight:700,marginBottom:4,color:C.text}}>Import from PDF</div>
        <div style={{fontSize:13,color:C.textSec,marginBottom:20}}>Claude will read your check sheet and extract all sections and checks automatically. You can edit the result after.</div>
        {status==="idle"&&(
          <div onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);processFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current.click()}
            style={{border:`2px dashed ${dragOver?C.indigo:C.border}`,borderRadius:12,padding:"40px 24px",textAlign:"center",cursor:"pointer",background:dragOver?C.indigoLight:C.bg,transition:"all 0.15s"}}>
            <div style={{fontSize:40,marginBottom:10}}>📄</div>
            <div style={{fontSize:14,fontWeight:600,color:C.text,marginBottom:4}}>Drop PDF here or click to browse</div>
            <div style={{fontSize:12,color:C.textMut}}>Works with scanned and digital PDFs</div>
            <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>processFile(e.target.files[0])}/>
          </div>
        )}
        {status!=="idle"&&(
          <div style={{padding:"16px 20px",borderRadius:10,border:`1px solid ${status==="error"?C.red:status==="done"?C.green:C.border}`,background:status==="error"?C.redLight:status==="done"?C.greenLight:C.bg}}>
            <div style={{fontSize:13,color:status==="error"?C.red:status==="done"?C.green:C.textSec}}>{status==="loading"&&"⏳ "}{status==="done"&&"✅ "}{status==="error"&&"❌ "}{log}</div>
          </div>
        )}
        <div style={{display:"flex",justifyContent:"flex-end",marginTop:16}}><Btn variant="ghost" onClick={onClose}>Cancel</Btn></div>
      </Card>
    </div>
  );
}

// ─── Export modal ─────────────────────────────────────────────────────────────
function ExportModal({form,onClose}){
  const json=JSON.stringify(form,null,2);
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.6)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200,padding:24}}>
      <Card style={{width:"100%",maxWidth:640,maxHeight:"90vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",gap:12}}>
          <div style={{fontSize:15,fontWeight:700}}>Form JSON — {form.title||"Untitled"}</div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <Btn variant="ghost" size="sm" onClick={()=>navigator.clipboard.writeText(json)}>Copy</Btn>
            <Btn variant="primary" size="sm" onClick={()=>{const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([json],{type:"application/json"}));a.download=(form.title||"form").replace(/\s+/g,"_").toLowerCase()+".json";a.click();}}>Download .json</Btn>
            <Btn variant="ghost" size="sm" onClick={onClose}>Close</Btn>
          </div>
        </div>
        <pre style={{flex:1,overflowY:"auto",padding:20,fontSize:11,color:"#10b981",fontFamily:"monospace",margin:0,lineHeight:1.6,background:"#0f172a",borderRadius:"0 0 12px 12px"}}>{json}</pre>
      </Card>
    </div>
  );
}

// ─── Library page ──────────────────────────────────────────────────────────────
function LibraryPage({forms,onOpen,onNew,onImport,onDelete}){
  const [search,setSearch]=useState("");
  const [filterTag,setFilterTag]=useState("");
  const [filterStatus,setFilterStatus]=useState("");
  const [showImport,setShowImport]=useState(false);
  const [newTitle,setNewTitle]=useState("");
  const [showNewForm,setShowNewForm]=useState(false);

  const allTags=[...new Set(forms.flatMap(f=>f.tags||[]))];

  const filtered=forms.filter(f=>{
    if(search&&!f.title.toLowerCase().includes(search.toLowerCase())&&!f.docRef?.toLowerCase().includes(search.toLowerCase())) return false;
    if(filterTag&&!(f.tags||[]).includes(filterTag)) return false;
    if(filterStatus&&f.status!==filterStatus) return false;
    return true;
  });

  const grouped=filterTag||filterStatus||search?{"Results":filtered}:
    FORM_TAGS.reduce((acc,tag)=>{
      const tagged=forms.filter(f=>(f.tags||[]).includes(tag));
      if(tagged.length) acc[tag]=tagged;
      return acc;
    },{"All forms":forms.filter(f=>!(f.tags||[]).some(t=>FORM_TAGS.includes(t))),...{}});

  if(!Object.values(grouped).some(g=>g.length)) grouped["All forms"]=filtered;

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden"}}>
      {/* Library header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"16px 28px",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14}}>
          <div>
            <div style={{fontSize:22,fontWeight:800,color:C.text,letterSpacing:"-0.02em"}}>Form Library</div>
            <div style={{fontSize:13,color:C.textSec}}>{forms.length} form{forms.length!==1?"s":""}</div>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <Btn variant="ghost" onClick={()=>setShowImport(true)}>📄 Import PDF</Btn>
            <Btn variant="primary" onClick={()=>setShowNewForm(true)}>+ New form</Btn>
          </div>
        </div>
        {/* Search + filters */}
        <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:1,minWidth:200}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:C.textMut,fontSize:14}}>🔍</span>
            <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by title or document ref…" style={{paddingLeft:32}}/>
          </div>
          <select value={filterStatus} onChange={e=>setFilterStatus(e.target.value)} style={{...inp,width:"auto",color:filterStatus?C.text:C.textMut}}>
            <option value="">All statuses</option>
            {Object.entries(STATUSES).map(([k,s])=><option key={k} value={k}>{s.label}</option>)}
          </select>
          <select value={filterTag} onChange={e=>setFilterTag(e.target.value)} style={{...inp,width:"auto",color:filterTag?C.text:C.textMut}}>
            <option value="">All tags</option>
            {allTags.map(t=><option key={t} value={t}>{t}</option>)}
          </select>
          {(search||filterTag||filterStatus)&&<Btn variant="ghost" size="sm" onClick={()=>{setSearch("");setFilterTag("");setFilterStatus("");}}>Clear</Btn>}
        </div>
      </div>

      {/* Library content */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 28px"}}>
        {forms.length===0?(
          <div style={{textAlign:"center",padding:"80px 40px",color:C.textMut}}>
            <div style={{fontSize:56,marginBottom:16}}>📋</div>
            <div style={{fontSize:20,fontWeight:700,color:C.text,marginBottom:8}}>No forms yet</div>
            <div style={{fontSize:14,marginBottom:24}}>Create your first digital check sheet or import an existing PDF.</div>
            <div style={{display:"flex",gap:10,justifyContent:"center"}}>
              <Btn variant="ghost" onClick={()=>setShowImport(true)}>📄 Import PDF</Btn>
              <Btn variant="primary" onClick={()=>setShowNewForm(true)}>+ Create form</Btn>
            </div>
          </div>
        ):(
          Object.entries(grouped).map(([group,groupForms])=>groupForms.length>0&&(
            <div key={group} style={{marginBottom:28}}>
              <div style={{fontSize:11,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:"0.07em",marginBottom:12,display:"flex",alignItems:"center",gap:8}}>
                {group}
                <span style={{fontWeight:400,color:C.textMut}}>({groupForms.length})</span>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:14}}>
                {groupForms.map(f=>(
                  <Card key={f.id} style={{padding:0,overflow:"hidden",cursor:"pointer",transition:"all 0.15s"}}
                    onMouseEnter={e=>e.currentTarget.style.boxShadow=C.shadowMd}
                    onMouseLeave={e=>e.currentTarget.style.boxShadow=C.shadow}
                    onClick={()=>onOpen(f)}
                  >
                    {/* Card top colour bar based on status */}
                    <div style={{height:4,background:STATUSES[f.status||"draft"].color,opacity:0.7}}/>
                    <div style={{padding:16}}>
                      <div style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontSize:14,fontWeight:700,color:C.text,marginBottom:2,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{f.title||"Untitled form"}</div>
                          {f.docRef&&<div style={{fontSize:11,fontFamily:"monospace",color:"#92400e",background:C.amberLight,display:"inline-block",padding:"1px 6px",borderRadius:4,border:"1px solid #fcd34d"}}>{f.docRef}</div>}
                        </div>
                        <StatusBadge status={f.status||"draft"}/>
                      </div>
                      {f.description&&<div style={{fontSize:12,color:C.textSec,marginBottom:8,lineHeight:1.4,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{f.description}</div>}
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
                        {(f.tags||[]).map(t=><span key={t} style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:10,background:C.indigoLight,color:C.indigo}}>{t}</span>)}
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:0,fontSize:11,color:C.textMut,borderTop:`1px solid ${C.border}`,marginTop:8,paddingTop:8}}>
                        <span>{f.sections?.length||0} sections</span>
                        <span style={{margin:"0 6px"}}>·</span>
                        <span>{f.sections?.reduce((a,s)=>a+(s.fields?.length||0),0)||0} checks</span>
                        <span style={{margin:"0 6px"}}>·</span>
                        <span>v{f.version||"1.0"}</span>
                        <button onClick={e=>{e.stopPropagation();if(window.confirm("Delete this form?"))onDelete(f.id);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:C.textMut,fontSize:13,padding:2,lineHeight:1}} title="Delete">🗑</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* New form modal */}
      {showNewForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",backdropFilter:"blur(4px)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:200}}>
          <Card style={{width:400,padding:24}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:12}}>New form</div>
            <div style={{marginBottom:12}}><label style={lbl}>Form title</label><Input value={newTitle} placeholder="e.g. Pre-shift plant check" onChange={e=>setNewTitle(e.target.value)} autoFocus/></div>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn variant="ghost" onClick={()=>{setShowNewForm(false);setNewTitle("");}}>Cancel</Btn>
              <Btn variant="primary" onClick={()=>{onNew(newTitle);setShowNewForm(false);setNewTitle("");}}>Create</Btn>
            </div>
          </Card>
        </div>
      )}

      {showImport&&<PdfImportModal onImport={f=>{onImport(f);setShowImport(false);}} onClose={()=>setShowImport(false)}/>}
    </div>
  );
}

// ─── Form editor page ─────────────────────────────────────────────────────────
function FormEditorPage({form,onUpdate,onBack,onPreview,onExport,onSave,saving,dirty}){
  const [activeSec,setActiveSec]=useState(form.sections[0]?.id);
  const [rightTab,setRightTab]=useState("fields"); // fields | approval
  const [lightbox,setLightbox]=useState(null);

  const sec=form.sections.find(s=>s.id===activeSec)||form.sections[0];
  const totalFields=form.sections.reduce((a,s)=>a+s.fields.length,0);

  const updateSec=useCallback(updated=>onUpdate({...form,sections:form.sections.map(s=>s.id===updated.id?updated:s),updatedAt:new Date().toISOString()}),[form,onUpdate]);

  const setSections=sections=>{onUpdate({...form,sections,updatedAt:new Date().toISOString()});};
  const {onDragStart,onDragEnter,onDragEnd}=useDrag(form.sections,setSections);

  const addSection=()=>{
    const s={id:uid(),title:`Section ${form.sections.length+1}`,fields:[]};
    onUpdate({...form,sections:[...form.sections,s],updatedAt:new Date().toISOString()});
    setActiveSec(s.id);
  };
  const delSection=id=>{
    if(form.sections.length===1)return;
    const remaining=form.sections.filter(s=>s.id!==id);
    onUpdate({...form,sections:remaining,updatedAt:new Date().toISOString()});
    if(activeSec===id)setActiveSec(remaining[0].id);
  };

  const allTags=FORM_TAGS;
  const toggleTag=t=>onUpdate({...form,tags:(form.tags||[]).includes(t)?(form.tags||[]).filter(x=>x!==t):[...(form.tags||[]),t]});

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",minHeight:0}}>
      {lightbox&&<Lightbox src={lightbox} onClose={()=>setLightbox(null)}/>}

      {/* Editor sub-header */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"10px 20px",display:"flex",alignItems:"center",gap:10,flexShrink:0,flexWrap:"wrap"}}>
        <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",color:C.textSec,fontSize:13,display:"flex",alignItems:"center",gap:4,padding:"4px 8px",borderRadius:6}}>← Library</button>
        <div style={{width:1,height:20,background:C.border}}/>
        <StatusBadge status={form.status||"draft"}/>
        {form.docRef&&<span style={{fontSize:12,fontFamily:"monospace",background:C.amberLight,color:"#92400e",padding:"2px 8px",borderRadius:6,border:"1px solid #fcd34d"}}>{form.docRef}</span>}
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(form.tags||[]).map(t=><span key={t} style={{fontSize:11,fontWeight:600,padding:"2px 7px",borderRadius:10,background:C.indigoLight,color:C.indigo}}>{t}</span>)}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          {dirty&&!saving&&<span style={{fontSize:11,color:C.amber,fontWeight:600}}>● Unsaved changes</span>}
          {saving&&<span style={{fontSize:11,color:C.textMut}}>Saving…</span>}
          {!dirty&&!saving&&<span style={{fontSize:11,color:C.green}}>✓ Saved</span>}
          <Btn variant="subtle" size="sm" onClick={onPreview}>👁 Preview</Btn>
          <Btn variant="ghost"  size="sm" onClick={onExport}>⬇ Export</Btn>
          <Btn variant="primary" size="sm" onClick={onSave} disabled={saving} style={{opacity:saving?0.6:1}}>💾 {saving?"Saving…":"Save"}</Btn>
        </div>
      </div>

      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        {/* ── Left sidebar ── */}
        <div style={{width:260,background:C.surface,borderRight:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
          {/* Form meta */}
          <div style={{padding:14,borderBottom:`1px solid ${C.border}`,overflowY:"auto"}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:"0.06em",marginBottom:10}}>Form details</div>
            <div style={{marginBottom:8}}><label style={lbl}>Title</label><Input value={form.title} placeholder="Form title" onChange={e=>onUpdate({...form,title:e.target.value})}/></div>
            <div style={{marginBottom:8}}><label style={lbl}>Document ref</label><Input value={form.docRef||""} placeholder="IP-0412.135" style={{fontFamily:"monospace",fontSize:12}} onChange={e=>onUpdate({...form,docRef:e.target.value})}/></div>
            <div style={{marginBottom:8}}><label style={lbl}>Description</label><Input value={form.description||""} placeholder="Brief description" onChange={e=>onUpdate({...form,description:e.target.value})}/></div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <div style={{flex:1}}><label style={lbl}>Version</label><Input value={form.version||"1.0"} onChange={e=>onUpdate({...form,version:e.target.value})}/></div>
            </div>
            <div>
              <label style={lbl}>Tags</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {allTags.map(t=>{const on=(form.tags||[]).includes(t);return <button key={t} onClick={()=>toggleTag(t)} style={{padding:"3px 8px",borderRadius:10,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",background:on?C.indigoLight:"#f8fafc",color:on?C.indigo:C.textMut,border:`1px solid ${on?C.indigo+"44":C.border}`,transition:"all 0.15s"}}>{t}</button>;})}
              </div>
            </div>
          </div>

          {/* Sections */}
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:"0.06em"}}>Sections</span>
            <Btn variant="subtle" size="sm" onClick={addSection}>+ Add</Btn>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:"8px 10px"}}>
            {form.sections.map((s,i)=>(
              <div key={s.id} draggable onDragStart={()=>onDragStart(i)} onDragEnter={()=>onDragEnter(i)} onDragEnd={onDragEnd} onDragOver={e=>e.preventDefault()}
                onClick={()=>setActiveSec(s.id)}
                style={{display:"flex",alignItems:"center",gap:6,padding:"8px 9px",borderRadius:9,marginBottom:3,cursor:"pointer",background:s.id===activeSec?C.indigoLight:"transparent",border:`1px solid ${s.id===activeSec?C.indigo+"44":"transparent"}`,transition:"all 0.15s"}}>
                <span style={{color:C.textMut,cursor:"grab",fontSize:11,flexShrink:0,userSelect:"none"}}>⠿</span>
                <span style={{fontSize:12,flex:1,fontWeight:s.id===activeSec?600:400,color:s.id===activeSec?C.indigo:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.title||`Section ${i+1}`}</span>
                <span style={{fontSize:10,color:C.textMut,background:C.slateLight,padding:"1px 5px",borderRadius:8,flexShrink:0}}>{s.fields.length}</span>
                {form.sections.length>1&&<button onClick={e=>{e.stopPropagation();delSection(s.id);}} style={{background:"none",border:"none",cursor:"pointer",color:C.textMut,fontSize:11,padding:1,lineHeight:1,flexShrink:0}}>✕</button>}
              </div>
            ))}
          </div>

          {/* Stats */}
          <div style={{padding:"10px 14px",borderTop:`1px solid ${C.border}`,display:"flex",gap:16,flexShrink:0}}>
            <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.indigo}}>{totalFields}</div><div style={{fontSize:10,color:C.textMut}}>checks</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:C.indigo}}>{form.sections.length}</div><div style={{fontSize:10,color:C.textMut}}>sections</div></div>
            <div style={{textAlign:"center"}}><div style={{fontSize:18,fontWeight:800,color:STATUSES[form.status||"draft"].color}}>{STATUSES[form.status||"draft"].icon}</div><div style={{fontSize:10,color:C.textMut}}>{STATUSES[form.status||"draft"].label}</div></div>
          </div>
        </div>

        {/* ── Centre: field editor ── */}
        <div style={{flex:1,overflowY:"auto",padding:"20px 20px",minWidth:0}}>
          {/* Section title */}
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <input value={sec?.title||""} onChange={e=>updateSec({...sec,title:e.target.value})} style={{fontSize:18,fontWeight:700,border:"none",background:"transparent",color:C.text,outline:"none",flex:1,fontFamily:"inherit"}} placeholder="Section title…"/>
            <span style={{fontSize:12,color:C.textMut,flexShrink:0}}>{sec?.fields.length||0} checks</span>
          </div>
          {sec&&<SectionEditor section={sec} onChange={updateSec} onLightbox={setLightbox}/>}
        </div>

        {/* ── Right panel: approval ── */}
        <div style={{width:300,background:C.surface,borderLeft:`1px solid ${C.border}`,display:"flex",flexDirection:"column",flexShrink:0,overflow:"hidden"}}>
          <div style={{padding:"10px 14px",borderBottom:`1px solid ${C.border}`,flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:700,color:C.textMut,textTransform:"uppercase",letterSpacing:"0.06em"}}>Review & Approval</div>
          </div>
          <div style={{flex:1,overflowY:"auto",padding:14}}>
            <ApprovalPanel form={form} onUpdate={onUpdate}/>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Root app ─────────────────────────────────────────────────────────────────
export default function App(){
  const [page,setPage]=useState("library"); // library | editor
  const [forms,setForms]=useState([]);
  const [activeFormId,setActiveFormId]=useState(null);
  const [modal,setModal]=useState(null); // preview | export
  const [loading,setLoading]=useState(true);
  const [loadError,setLoadError]=useState(null);
  const [dirtyIds,setDirtyIds]=useState(()=>new Set());
  const [savingId,setSavingId]=useState(null);
  const [saveError,setSaveError]=useState(null);

  const activeForm=forms.find(f=>f.id===activeFormId);

  // ── Load all forms from Supabase on mount ──
  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true); setLoadError(null);
      const {data,error}=await supabase.from("forms").select("*").order("updated_at",{ascending:false});
      if(cancelled) return;
      if(error){ setLoadError(error.message); setLoading(false); return; }
      setForms((data||[]).map(row=>row.data));
      setLoading(false);
    })();
    return ()=>{cancelled=true;};
  },[]);

  const markDirty=id=>setDirtyIds(prev=>{const n=new Set(prev);n.add(id);return n;});
  const clearDirty=id=>setDirtyIds(prev=>{const n=new Set(prev);n.delete(id);return n;});

  const updateForm=useCallback(updated=>{
    setForms(fs=>fs.map(f=>f.id===updated.id?updated:f));
    markDirty(updated.id);
  },[]);

  const openForm=f=>{setActiveFormId(f.id);setPage("editor");};

  const newForm_=title=>{
    const f=emptyForm(title);
    setForms(fs=>[...fs,f]);
    markDirty(f.id);
    openForm(f);
  };

  const importForm=f=>{
    setForms(fs=>{
      const existing=fs.findIndex(x=>x.id===f.id);
      if(existing>=0){const n=[...fs];n[existing]=f;return n;}
      return [...fs,f];
    });
    markDirty(f.id);
    openForm(f);
  };

  // ── Save the active form to Supabase ──
  const saveForm=async(id)=>{
    const form=forms.find(f=>f.id===id);
    if(!form) return;
    setSavingId(id); setSaveError(null);
    const row={
      id:form.id,
      title:form.title||"",
      doc_ref:form.docRef||"",
      status:form.status||"draft",
      tags:form.tags||[],
      version:form.version||"1.0",
      data:form,
      updated_at:new Date().toISOString(),
    };
    const {error}=await supabase.from("forms").upsert(row,{onConflict:"id"});
    setSavingId(null);
    if(error){ setSaveError(error.message); return; }
    clearDirty(id);
  };

  // ── Delete goes straight to Supabase (destructive action, no local-only state) ──
  const deleteForm=async(id)=>{
    setForms(fs=>fs.filter(f=>f.id!==id));
    if(activeFormId===id){setActiveFormId(null);setPage("library");}
    clearDirty(id);
    const {error}=await supabase.from("forms").delete().eq("id",id);
    if(error) setSaveError(error.message);
  };

  if(loading){
    return (
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",color:C.textSec,background:C.bg}}>
        <div style={{textAlign:"center"}}>
          <div style={{fontSize:32,marginBottom:12}}>📋</div>
          <div style={{fontSize:14}}>Loading forms…</div>
        </div>
      </div>
    );
  }

  if(loadError){
    return (
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",background:C.bg,padding:24}}>
        <div style={{textAlign:"center",maxWidth:420}}>
          <div style={{fontSize:32,marginBottom:12}}>⚠️</div>
          <div style={{fontSize:15,fontWeight:700,color:C.red,marginBottom:8}}>Couldn't load forms</div>
          <div style={{fontSize:13,color:C.textSec,marginBottom:4}}>{loadError}</div>
          <div style={{fontSize:12,color:C.textMut}}>Check that the Supabase URL and anon key in src/supabaseClient.js are correct, and that the `forms` table exists.</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Inter','Segoe UI',system-ui,sans-serif",color:C.text,overflow:"hidden"}}>
      {/* ── Global header (always visible) ── */}
      <div style={{background:C.surface,borderBottom:`1px solid ${C.border}`,padding:"0 20px",height:50,display:"flex",alignItems:"center",gap:12,boxShadow:C.shadow,flexShrink:0,zIndex:10}}>
        <span style={{fontSize:18}}>📋</span>
        <span style={{fontSize:14,fontWeight:800,letterSpacing:"-0.01em",color:C.text}}>CheckForm Builder</span>
        <div style={{display:"flex",gap:2,marginLeft:16}}>
          {[{id:"library",label:"Library"},...(activeForm?[{id:"editor",label:activeForm.title||"Editor"}]:[])].map(tab=>(
            <button key={tab.id} onClick={()=>setPage(tab.id)} style={{padding:"4px 12px",borderRadius:6,border:"none",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600,background:page===tab.id?C.indigoLight:"transparent",color:page===tab.id?C.indigo:C.textSec,transition:"all 0.15s"}}>{tab.label}</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
          {saveError&&<span style={{fontSize:11,color:C.red}} title={saveError}>⚠ Save failed</span>}
          {page==="editor"&&activeForm&&<StatusBadge status={activeForm.status||"draft"}/>}
        </div>
      </div>

      {/* ── Page content ── */}
      <div style={{flex:1,display:"flex",overflow:"hidden",minHeight:0}}>
        {page==="library"&&(
          <LibraryPage forms={forms} onOpen={openForm} onNew={newForm_} onImport={importForm} onDelete={deleteForm}/>
        )}
        {page==="editor"&&activeForm&&(
          <FormEditorPage
            form={activeForm}
            onUpdate={updateForm}
            onBack={()=>setPage("library")}
            onPreview={()=>setModal("preview")}
            onExport={()=>setModal("export")}
            onSave={()=>saveForm(activeForm.id)}
            saving={savingId===activeForm.id}
            dirty={dirtyIds.has(activeForm.id)}
          />
        )}
      </div>

      {modal==="preview"&&activeForm&&<DevicePreview form={activeForm} onClose={()=>setModal(null)}/>}
      {modal==="export"&&activeForm&&<ExportModal form={activeForm} onClose={()=>setModal(null)}/>}
    </div>
  );
}
