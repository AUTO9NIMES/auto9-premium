"use client";

import { useEffect, useMemo, useState } from "react";

type Status = "A contacter" | "Mail envoye" | "A rappeler" | "RDV obtenu" | "Essai prevu" | "Partenaire" | "Sans suite";
type Prospect = { id: string; name: string; city: string; phone: string; email: string; contact: string; status: Status; nextDate: string; notes: string; potential: number };
type Task = { id: string; title: string; done: boolean; due: string };
const KEY = "auto9-crm-development-v1";
const statuses: Status[] = ["A contacter","Mail envoye","A rappeler","RDV obtenu","Essai prevu","Partenaire","Sans suite"];
const firstProspects: Prospect[] = [
  {id:"twiice",name:"Twiice Auto",city:"Nîmes",phone:"",email:"",contact:"",status:"Partenaire",nextDate:"",notes:"Partenaire actuel — environ 8 véhicules/mois (moyenne non garantie).",potential:8},
  {id:"bolides",name:"Bolides et Légendes",city:"Nîmes",phone:"",email:"",contact:"",status:"Partenaire",nextDate:"",notes:"Partenaire actuel — environ 8 véhicules/mois (moyenne non garantie).",potential:8},
  {id:"b2p",name:"B2P Auto",city:"Caissargues",phone:"",email:"",contact:"",status:"A contacter",nextDate:"",notes:"Piste à qualifier. Vérifier le besoin de préparation et l'interlocuteur.",potential:8},
  {id:"design",name:"Design Car",city:"Nîmes / alentours",phone:"",email:"",contact:"",status:"A contacter",nextDate:"",notes:"Piste à qualifier. Vérifier si la préparation est internalisée.",potential:8},
  {id:"driving",name:"Driving Spirit",city:"Nîmes / alentours",phone:"",email:"",contact:"",status:"A contacter",nextDate:"",notes:"Piste à qualifier avant proposition commerciale.",potential:8},
];
const firstTasks: Task[] = [
  {id:"1",title:"Qualifier 20 garages VO autour de Nîmes",done:false,due:""},
  {id:"2",title:"Préparer le mail de présentation AUTO 9",done:false,due:""},
  {id:"3",title:"Préparer les visuels avant/après et la plaquette",done:false,due:""},
  {id:"4",title:"Contacter 8 prospects prioritaires",done:false,due:""},
  {id:"5",title:"Relancer par téléphone les premiers contacts",done:false,due:""},
  {id:"6",title:"Contacter 12 autres prospects",done:false,due:""},
  {id:"7",title:"Obtenir 5 échanges commerciaux",done:false,due:""},
  {id:"8",title:"Décrocher 2 essais payants",done:false,due:""},
  {id:"9",title:"Signer 2 collaborations régulières",done:false,due:""},
];
const uid=()=>Math.random().toString(36).slice(2,10);
const today=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Europe/Paris",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
const tag=(s:Status)=>s==="Partenaire"?"text-emerald-300 bg-emerald-400/10 border-emerald-400/20":s==="A rappeler"?"text-amber-200 bg-amber-400/10 border-amber-400/20":s==="Sans suite"?"text-white/40 bg-white/5 border-white/10":"text-cyan-200 bg-cyan-400/10 border-cyan-400/20";
const input="w-full rounded-xl border border-white/10 bg-[#101a26] px-3 py-3 text-sm text-white outline-none focus:border-cyan-400/50";
function initial(){return {prospects:firstProspects,tasks:firstTasks};}

export default function DevelopmentPage(){
 const [data,setData]=useState(initial);
 const [loaded,setLoaded]=useState(false);
 const [tab,setTab]=useState<"prospects"|"tasks"|"relances">("prospects");
 const [filter,setFilter]=useState("Tous");
 const [search,setSearch]=useState("");
 const [editing,setEditing]=useState<string|null>(null);
 const [adding,setAdding]=useState(false);
 const [taskText,setTaskText]=useState("");
 const [taskDue,setTaskDue]=useState("");
 const [draft,setDraft]=useState<Prospect|null>(null);
 useEffect(()=>{try{const raw=localStorage.getItem(KEY);if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed.prospects)&&Array.isArray(parsed.tasks))setData(parsed);}}catch{}setLoaded(true)},[]);
 useEffect(()=>{if(loaded)try{localStorage.setItem(KEY,JSON.stringify(data))}catch{}},[data,loaded]);
 const prospects=data.prospects;
 const tasks=data.tasks;
 const partners=prospects.filter(p=>p.status==="Partenaire").length;
 const active=prospects.filter(p=>p.status!=="Partenaire"&&p.status!=="Sans suite").length;
 const due=prospects.filter(p=>p.nextDate&&p.nextDate<=today()&&p.status!=="Sans suite"&&p.status!=="Partenaire").sort((a,b)=>a.nextDate.localeCompare(b.nextDate));
 const list=prospects.filter(p=>(filter==="Tous"||p.status===filter)&&([p.name,p.city,p.contact,p.notes].join(" ").toLowerCase().includes(search.toLowerCase())));
 const progress=tasks.filter(t=>t.done).length;
 const update=(p:Prospect)=>setData(d=>({...d,prospects:d.prospects.map(x=>x.id===p.id?p:x)}));
 const save=()=>{if(!draft||!draft.name.trim())return;setData(d=>({...d,prospects:editing?d.prospects.map(p=>p.id===editing?draft:p):[...d.prospects,draft]}));setEditing(null);setAdding(false);setDraft(null)};
 const openNew=()=>{setEditing(null);setAdding(true);setDraft({id:uid(),name:"",city:"",phone:"",email:"",contact:"",status:"A contacter",nextDate:"",notes:"",potential:8})};
 const openEdit=(p:Prospect)=>{setAdding(false);setEditing(p.id);setDraft({...p})};
 const field=(k:keyof Prospect,value:string)=>setDraft(d=>d?({...d,[k]:k==="potential"?Number(value):value}):d);
 const exportCsv=()=>{const rows=[["Garage","Ville","Téléphone","Email","Contact","Statut","Relance","Volume estimé","Notes"],...prospects.map(p=>[p.name,p.city,p.phone,p.email,p.contact,p.status,p.nextDate,String(p.potential),p.notes])];const csv="\uFEFF"+rows.map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(";")).join("\r\n");const blob=new Blob([csv],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="AUTO9-prospection.csv";a.click();URL.revokeObjectURL(a.href)};
 return <div className="mx-auto max-w-6xl space-y-6 pb-16">
  <header className="rounded-[28px] border border-cyan-300/15 bg-gradient-to-br from-[#10253a] via-[#0a1521] to-[#080d14] p-5 md:p-8">
   <p className="text-[10px] uppercase tracking-[.3em] text-cyan-200/65">AUTO 9 · Command Center</p>
   <div className="mt-3 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-bold md:text-5xl">Développement</h1><p className="mt-2 text-sm text-white/50">Prospection, relances, checklist et croissance commerciale.</p></div><button onClick={openNew} className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-bold text-[#05131b]">+ Nouveau prospect</button></div>
  </header>
  <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
   {[["Partenaires actifs",String(partners)],["Prospects à travailler",String(active)],["Relances échues",String(due.length)],["Checklist",progress+"/"+tasks.length]].map(([label,value])=><div key={label} className="rounded-2xl border border-white/10 bg-white/[.035] p-4"><p className="text-xs text-white/45">{label}</p><p className="mt-3 text-3xl font-bold text-cyan-100">{value}</p></div>)}
  </section>
  <section className="rounded-2xl border border-white/10 bg-[#0b1520] p-4 md:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold">Mission : +2 garages récurrents</p><p className="text-xs text-white/45">Base : 2 garages · objectif : 4 · hypothèse de 8 véhicules à 100 € par nouveau garage.</p></div><p className="text-2xl font-semibold text-cyan-200">{partners} / 4</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-cyan-400" style={{width:Math.min(100,partners/4*100)+"%"}}/></div><p className="mt-3 text-xs text-white/40">Chaque nouveau garage avec 8 véhicules/mois représente 800 € de chiffre d'affaires théorique, pas du bénéfice.</p></section>
  <div className="flex flex-wrap gap-2">{(["prospects","tasks","relances"] as const).map((t)=><button key={t} onClick={()=>setTab(t)} className={"rounded-full border px-4 py-2.5 text-sm "+(tab===t?"border-cyan-300/50 bg-cyan-300/15 text-cyan-100":"border-white/10 text-white/55")}>{t==="prospects"?"Prospects":t==="tasks"?"To-do & checklist":"Relances"}{t==="relances"&&due.length>0?" · "+due.length:""}</button>)}</div>
  {tab==="prospects"&&<section className="space-y-4">
    <div className="flex flex-wrap gap-2"><input aria-label="Rechercher un prospect" className={input+" min-w-[160px] flex-1"} placeholder="Rechercher un garage…" value={search} onChange={e=>setSearch(e.target.value)}/><select aria-label="Filtrer par statut" className={input+" max-w-[180px]"} value={filter} onChange={e=>setFilter(e.target.value)}><option>Tous</option>{statuses.map(s=><option key={s}>{s}</option>)}</select><button onClick={exportCsv} className="rounded-xl border border-white/15 px-4 py-2 text-xs text-white/70">Exporter CSV</button></div>
    <div className="grid gap-3 md:grid-cols-2">{list.map(p=><article key={p.id} className="rounded-2xl border border-white/10 bg-[#0c1520] p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{p.name}</h3><p className="mt-1 text-xs text-white/40">{p.city||"Secteur à préciser"} {p.contact?"· "+p.contact:""}</p></div><button onClick={()=>openEdit(p)} className="rounded-lg border border-white/15 px-3 py-2 text-xs">Modifier</button></div><div className="mt-3 flex flex-wrap items-center gap-2"><span className={"rounded-full border px-2 py-1 text-[11px] "+tag(p.status)}>{p.status}</span>{p.nextDate&&<span className="text-xs text-white/50">Relance : {p.nextDate}</span>}</div>{p.notes&&<p className="mt-3 text-xs leading-5 text-white/50">{p.notes}</p>}<div className="mt-3 flex flex-wrap gap-3 text-xs">{p.phone&&<a className="text-cyan-200" href={"tel:"+p.phone}>Appeler</a>}{p.email&&<a className="text-cyan-200" href={"mailto:"+p.email}>Écrire</a>}<span className="text-white/35">Volume potentiel : {p.potential} / mois (estimation)</span></div><select aria-label={"Statut de "+p.name} value={p.status} onChange={e=>update({...p,status:e.target.value as Status})} className={input+" mt-3"}>{statuses.map(s=><option key={s}>{s}</option>)}</select></article>)}</div>{list.length===0&&<p className="rounded-xl border border-white/10 p-8 text-center text-sm text-white/50">Aucun prospect pour ce filtre.</p>}
  </section>}
  {tab==="tasks"&&<section className="rounded-2xl border border-white/10 bg-[#0b1520] p-4 md:p-6"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Plan de développement</h2><p className="text-sm text-cyan-200">{progress}/{tasks.length}</p></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-cyan-400" style={{width:(tasks.length?progress/tasks.length*100:0)+"%"}}/></div><div className="mt-5 space-y-2">{tasks.map(t=><div key={t.id} className="flex items-center gap-3 rounded-xl border border-white/8 p-3"><input type="checkbox" checked={t.done} onChange={e=>setData(d=>({...d,tasks:d.tasks.map(x=>x.id===t.id?{...x,done:e.target.checked}:x)}))} className="h-5 w-5 accent-cyan-400"/><div className="min-w-0 flex-1"><p className={"text-sm "+(t.done?"text-white/35 line-through":"text-white")}>{t.title}</p>{t.due&&<p className="text-xs text-white/40">Échéance : {t.due}</p>}</div><button aria-label={"Supprimer "+t.title} className="p-2 text-white/35" onClick={()=>setData(d=>({...d,tasks:d.tasks.filter(x=>x.id!==t.id)}))}>×</button></div>)}</div><form onSubmit={e=>{e.preventDefault();if(!taskText.trim())return;setData(d=>({...d,tasks:[...d.tasks,{id:uid(),title:taskText.trim(),due:taskDue,done:false}]}));setTaskText("");setTaskDue("")}} className="mt-5 flex flex-wrap gap-2"><input className={input+" flex-1"} placeholder="Nouvelle tâche…" value={taskText} onChange={e=>setTaskText(e.target.value)}/><input className={input+" w-auto"} aria-label="Date limite" type="date" value={taskDue} onChange={e=>setTaskDue(e.target.value)}/><button className="rounded-xl bg-cyan-300 px-4 py-2 font-semibold text-[#07121a]">Ajouter</button></form></section>}
  {tab==="relances"&&<section className="space-y-3"><p className="text-sm text-white/50">Relances arrivées à échéance au {today()} (heure de Paris).</p>{due.length===0?<div className="rounded-2xl border border-white/10 p-6 text-sm text-white/50">Aucune relance échue. Ajoute une date sur chaque fiche prospect pour suivre tes rappels.</div>:due.map(p=><div key={p.id} className="rounded-xl border border-amber-300/20 bg-amber-200/[.035] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{p.name}</p><p className="text-xs text-amber-100/60">À relancer depuis le {p.nextDate}</p></div><button onClick={()=>{openEdit(p);setTab("prospects")}} className="rounded-xl border border-cyan-300/25 px-4 py-2 text-xs text-cyan-100">Mettre à jour</button></div>{p.phone&&<a href={"tel:"+p.phone} className="mt-2 inline-block text-xs text-cyan-200">Appeler {p.phone}</a>}</div>)}</section>}
  <p className="rounded-xl border border-amber-300/15 bg-amber-300/[.035] p-3 text-xs leading-5 text-amber-100/65">Version initiale : sauvegarde locale dans ce navigateur uniquement. Pour retrouver les mêmes données sur tous tes appareils et les protéger durablement, une synchronisation serveur est nécessaire. Les garages candidats préchargés sont des pistes à qualifier ; aucune prise de contact n'a été effectuée.</p>
  {(adding||editing)&&draft&&<div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 backdrop-blur-sm"><div className="mx-auto my-4 max-w-xl rounded-3xl border border-cyan-300/20 bg-[#091522] p-5 shadow-2xl"><div className="flex justify-between gap-3"><h2 className="text-xl font-bold">{editing?"Modifier le prospect":"Nouveau prospect"}</h2><button onClick={()=>{setAdding(false);setEditing(null);setDraft(null)}} className="px-3 text-white/50">Fermer ×</button></div><form onSubmit={e=>{e.preventDefault();save()}} className="mt-5 grid gap-3 sm:grid-cols-2">{([["name","Garage *"],["city","Ville"],["contact","Contact"],["phone","Téléphone"],["email","Email"],["potential","Véhicules potentiels / mois"]] as const).map(([k,label])=><label key={k} className="text-xs text-white/60">{label}<input className={input+" mt-1"} required={k==="name"} type={k==="potential"?"number":k==="email"?"email":"text"} value={String(draft[k])} onChange={e=>field(k,e.target.value)}/></label>)}<label className="text-xs text-white/60">Statut<select className={input+" mt-1"} value={draft.status} onChange={e=>field("status",e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label><label className="text-xs text-white/60">Date de relance<input className={input+" mt-1"} type="date" value={draft.nextDate} onChange={e=>field("nextDate",e.target.value)}/></label><label className="text-xs text-white/60 sm:col-span-2">Notes<textarea className={input+" mt-1 min-h-24"} value={draft.notes} onChange={e=>field("notes",e.target.value)}/></label><div className="flex items-center gap-3 sm:col-span-2"><button type="submit" className="flex-1 rounded-xl bg-cyan-300 px-4 py-3 font-bold text-[#07121a]">Enregistrer</button>{editing&&<button type="button" className="rounded-xl border border-red-400/20 px-4 py-3 text-xs text-red-200" onClick={()=>{if(confirm("Supprimer ce prospect ?")){setData(d=>({...d,prospects:d.prospects.filter(p=>p.id!==editing)}));setEditing(null);setDraft(null)}}}>Supprimer</button>}</div></form></div></div>}
 </div>;
}
