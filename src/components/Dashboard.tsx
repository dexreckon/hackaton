'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Evidence } from '@/lib/types';
import { EvCtx } from './Ctx';
import RawPanel from './RawPanel';
import Overview from './Overview';
import Timeline from './Timeline';
import AttackChain from './AttackChain';
import Matches from './Matches';
import ReportView from './ReportView';
import AskPanel from './AskPanel';
import Home, { eyeState } from './Home';

const TABS = ['Home', 'Overview', 'Timeline', 'Attack chain', 'Who is who', 'Report', 'Ask'] as const;
type Tab = (typeof TABS)[number];

const LABEL: Record<Tab, string> = { Home: 'Home', Overview: 'Details', Timeline: 'Timeline', 'Attack chain': 'Story', 'Who is who': 'Who is who', Report: 'Report', Ask: 'Ask' };

/** One plain sentence on top of every inner page, so nobody has to guess what they are looking at. */
const INTRO: Partial<Record<Tab, [string, string]>> = {
  Overview: ['Details', 'Every finding sorted into what the logs prove, what is only suspected, and what the logs cannot tell us.'],
  Timeline: ['Timeline', 'Every log entry in time order. Click any row to see the original line exactly as it was written.'],
  'Attack chain': ['How it happened', 'Each attack step by step. Solid boxes are proven by the logs; dashed boxes are educated guesses.'],
  'Who is who': ['Who is who', 'The same person or computer shows up under different names in different logs. This page links them together.'],
  Report: ['Incident report', 'The full written report with every source. Download it or copy it to send to management.'],
  Ask: ['Ask a question', 'Ask anything about the incident. Answers only use the logs, and every sentence shows its source.'],
};

// The opening scan plays once per page load, not every time you return to Home.
let scannedThisLoad = false;

export default function Dashboard({ evidence }: { evidence: Evidence }) {
  const [tab, setTab] = useState<Tab>('Home');
  const [sel, setSel] = useState<string | null>(null);
  const [scanning, setScanning] = useState(!scannedThisLoad);
  const ctx = useMemo(() => ({ ev: evidence, select: (k: string) => setSel(k) }), [evidence]);
  const finishScan = useCallback(() => { scannedThisLoad = true; setScanning(false); }, []);

  // Colour theme: obsidian by default; ?theme=dusk | midnight | aurora | sunset previews the others.
  const [palette, setPalette] = useState('obsidian');
  const [still, setStill] = useState(false);
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const t = qs.get('theme');
    if (t && /^[a-z]+$/.test(t)) setPalette(t);
    if (qs.get('still') === '1') { scannedThisLoad = true; setScanning(false); setStill(true); }
  }, []);

  useEffect(() => {
    const h = (e: Event) => setSel((e as CustomEvent<string>).detail);
    document.addEventListener('open-ref', h);
    return () => document.removeEventListener('open-ref', h);
  }, []);

  const go = (t: Tab) => { setTab(t); setSel(null); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const verdict = eyeState(evidence.report.overall, evidence.incidents.some((i) => i.status === 'escalate'));
  const theme = scanning ? 'safe' : verdict;
  const intro = INTRO[tab];

  return (
    <EvCtx.Provider value={ctx}>
      <div className={`app theme-${theme}${still ? ' still' : ''}`} data-palette={palette}>
        <div className="grain" aria-hidden="true" />
        <div className="wrap">
          <nav className="topbar" aria-label="Main">
            <button className="brand" onClick={() => go('Home')}><span className="logo" aria-hidden="true"><i /></span>Orbit Triage</button>
            <div className="links" role="tablist">
              {TABS.filter((t) => t !== 'Ask').map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => go(t)}>{LABEL[t]}</button>
              ))}
            </div>
            <button className="cta" onClick={() => go('Ask')}>Ask <i aria-hidden="true">↗</i></button>
          </nav>
          <main key={tab} className="page">
            {intro && (
              <header className="page-head">
                <h1>{intro[0]}</h1>
                <p>{intro[1]}</p>
              </header>
            )}
            {tab === 'Home' && <Home goto={(t) => go(t as Tab)} scanning={scanning} onScanned={finishScan} />}
            {tab === 'Overview' && <Overview goto={(t) => go(t as Tab)} />}
            {tab === 'Timeline' && <Timeline selected={sel} />}
            {tab === 'Attack chain' && <AttackChain />}
            {tab === 'Who is who' && <Matches />}
            {tab === 'Report' && <ReportView />}
            {tab === 'Ask' && <AskPanel />}
          </main>
          {sel && <RawPanel refKey={sel} onClose={() => setSel(null)} />}
        </div>
      </div>
    </EvCtx.Provider>
  );
}
