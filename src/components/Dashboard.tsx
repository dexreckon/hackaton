'use client';
import { useEffect, useMemo, useState } from 'react';
import type { Evidence } from '@/lib/types';
import { EvCtx } from './Ctx';
import RawPanel from './RawPanel';
import Overview from './Overview';
import Timeline from './Timeline';
import AttackChain from './AttackChain';
import Matches from './Matches';
import ReportView from './ReportView';
import AskPanel from './AskPanel';

const TABS = ['Overview', 'Timeline', 'Attack chain', 'Who is who', 'Report', 'Ask'] as const;
type Tab = (typeof TABS)[number];

export default function Dashboard({ evidence }: { evidence: Evidence }) {
  const [tab, setTab] = useState<Tab>('Overview');
  const [sel, setSel] = useState<string | null>(null);
  const ctx = useMemo(() => ({ ev: evidence, select: (k: string) => setSel(k) }), [evidence]);

  useEffect(() => {
    const h = (e: Event) => setSel((e as CustomEvent<string>).detail);
    document.addEventListener('open-ref', h);
    return () => document.removeEventListener('open-ref', h);
  }, []);

  const date = evidence.events[0]?.tsUtc.slice(0, 10);
  const s = evidence.stats;
  return (
    <EvCtx.Provider value={ctx}>
      <div className="wrap">
        <header className="top">
          <div>
            <h1>Orbit Logistics · Incident triage</h1>
            <p>Logs of {date}. Every statement links to the log line it came from. Times are UTC, PKT in brackets.</p>
          </div>
          <div className="stats">
            <div className="stat"><b className={`sev-${evidence.report.overall}`}>{evidence.report.overall}</b><span>overall</span></div>
            <div className="stat"><b>{s.events}</b><span>events, {s.sources} systems</span></div>
            <div className="stat"><b>{s.incidents}</b><span>incidents</span></div>
            <div className="stat"><b>{s.closed}</b><span>closed, harmless</span></div>
          </div>
        </header>
        <nav className="tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => { setTab(t); setSel(null); }}>{t}</button>
          ))}
        </nav>
        {tab === 'Overview' && <Overview goto={(t) => { setTab(t as Tab); setSel(null); }} />}
        {tab === 'Timeline' && <Timeline selected={sel} />}
        {tab === 'Attack chain' && <AttackChain />}
        {tab === 'Who is who' && <Matches />}
        {tab === 'Report' && <ReportView />}
        {tab === 'Ask' && <AskPanel />}
        {sel && <RawPanel refKey={sel} onClose={() => setSel(null)} />}
      </div>
    </EvCtx.Provider>
  );
}
