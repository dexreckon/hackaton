'use client';
import { useEffect, useState } from 'react';
import { useEv } from './Ctx';
import CiteText, { Chip } from './CiteText';

export default function Overview({ goto }: { goto: (tab: string) => void }) {
  const { ev } = useEv();
  const [sum, setSum] = useState<{ summary: string; mode: string; provider?: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetch('/api/summary').then((r) => r.json()).then((j) => live && setSum(j)).catch(() => {});
    return () => { live = false; };
  }, []);

  const live = ev.incidents.filter((i) => i.status === 'escalate');
  const closed = ev.incidents.filter((i) => i.status === 'closed-harmless');
  const count = (i: (typeof live)[number], l: string) => i.claims.filter((c) => c.label === l).length;

  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Summary</h2>
          <span className="small muted">{sum?.mode === 'llm' ? `written by the model (${sum.provider}), citations checked` : 'built from the verified findings'}</span>
        </div>
        <p style={{ margin: 0 }}><CiteText text={sum?.summary ?? ev.report.summary} /></p>
      </div>

      <div className="grid2">
        {live.map((i) => (
          <div className="card" key={i.id}>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <h3>{i.id} · {i.title}</h3>
              <span className={`badge sev-${i.severity}`}>{i.severity}</span>
            </div>
            <div className="small muted">First seen {i.firstSeenUtc}</div>
            <div className="row" style={{ margin: '8px 0' }}>
              <span className="badge confirmed">{count(i, 'confirmed')} confirmed</span>
              <span className="badge suspected">{count(i, 'suspected')} suspected</span>
              <span className="badge noevidence">{count(i, 'noevidence')} not enough evidence</span>
            </div>
            {i.parts.map((p) => (
              <div className="small" key={p.name}><span className={`sev-${p.severity}`}><b>{p.severity}</b></span> {p.name}</div>
            ))}
            <div className="row" style={{ marginTop: 10 }}>
              <button className="btn ghost" onClick={() => goto('Attack chain')}>See the chain</button>
              <button className="btn ghost" onClick={() => goto('Report')}>Read the report</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Closed as harmless (not escalated)</h3>
        {closed.map((c) => (
          <div className="claim" key={c.id}>
            <span className="badge harmless">{c.closedBy}</span>
            <div>
              <div>{c.title.replace('Closed as harmless: ', '')}</div>
              <div className="small muted">{c.closedReason}</div>
              <div className="small">{c.claims[0].cites.map((k) => <Chip key={k} k={k} />)}{c.claims[1]?.cites.slice(0, 4).map((k) => <Chip key={k} k={k} />)}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3>Where the logs have holes</h3>
        {ev.gaps.map((g) => (
          <div className="banner" key={g.what}>
            <b>{g.what}.</b> {g.impact} <Chip k={g.cite} />
          </div>
        ))}
        <div className="small muted" style={{ marginTop: 6 }}>Not collected at all: {ev.missingSources.map((m) => m.text.replace(/\.$/, '')).join(' · ')}</div>
      </div>
    </>
  );
}
