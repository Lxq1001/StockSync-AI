import { useState } from 'react';
import { Activity, FileClock, Search } from 'lucide-react';
import { Empty, PageTitle, when } from '@/components/common';
import type { StoreData } from '@/lib/procurement';

// Restored unchanged from the pre-login baseline (ab96459); only the prop type is adapted.
export function ActivityPage({data}:{data:StoreData}){const [query,setQuery]=useState(''),filtered=data.audit.filter(a=>`${a.actor} ${a.action} ${a.details}`.toLowerCase().includes(query.toLowerCase()));return <main className="content"><PageTitle eyebrow="Decision history" title="Activity log" subtitle="A chronological record of local demo decisions. Each approval and status change stays visible." right={<span className="pill delivery">Local audit trail</span>}/>
 <div className="warning"><Activity/><span>This log is stored in this browser only. Entries document simulated demo actions; no external supplier communication takes place.</span></div>
 <div className="toolbar"><label className="searchbox"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search actor or activity" data-testid="input-activity-search"/></label><span className="item-detail" style={{marginLeft:'auto'}}>{filtered.length} entries</span></div>
 <div className="panel"><div className="panel-head"><div><div className="panel-title">Recent activity</div><div className="panel-meta">Newest entries first · times shown in local browser time</div></div><FileClock size={17} color="#638277"/></div>{filtered.length?<div>{filtered.map(a=><div className="activity-row" key={a.id} data-testid={`row-activity-${a.id}`}><div className="item-detail">{when(a.timestamp)}</div><div className="actor">{a.actor}</div><div><div className="activity-action">{a.action}</div><div className="activity-detail">{a.details}</div></div></div>)}</div>:<Empty title="No activity found" detail="When you approve or update an order, the decision will be recorded here."/>}</div>
 </main>}
