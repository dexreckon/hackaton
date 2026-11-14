'use client';
import { useState } from 'react';
import { useEv, LABEL } from './Ctx';
import CiteText, { Chip } from './CiteText';

export default function ReportView() {
  const { ev } = useEv();
  const [copied, setCopied] = useState(false);
  const live = ev.incidents.filter((i) => i.status === 'escalate');

  const download = () => {
    const url = URL.createObjectURL(new Blob([ev.report.markdown], { type: 'text/markdown' }));
    const a = document.createElement('a');
    a.href = url; a.download = 'incident-report.md'; a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(ev.report.markdown); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 12 }}>
        <button className="btn" onClick={download}>Download report (.md)</button>
        <button className="btn ghost" onClick={copy}>{copied ? 'Copied' : 'Copy as Markdown'}</button>
        <span className="small muted">Sections follow rule 7 of the company security rules.</span>
      </div>

      {live.map((i) => (
        <div className="card" key={i.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h2>{i.id} · {i.title}</h2>
            <span className={`badge sev-${i.severity}`}>{i.severity}</span>
          </div>

          <h3>Severity, step by step</h3>
          {i.parts.map((p) => (
            <div key={p.name} style={{ marginBottom: 8 }}>
              <div><b className={`sev-${p.severity}`}>{p.severity}</b> {p.name}</div>
              <ol className="small" style={{ margin: '4px 0 0 18px', padding: 0 }}>
                {p.steps.map((s, k) => <li key={k}><CiteText text={s.replace(/^Step \d+\. /, '').replace(/\[([^\]]+)\]/g, (_m, x: string) => (/^\d{2}_/.test(x) ? `[${x}]` : `(${x})`))} /></li>)}
              </ol>
            </div>
          ))}

          {(['confirmed', 'suspected', 'noevidence'] as const).map((l) => (
            <div key={l}>
              <h3 style={{ marginTop: 14 }}>{LABEL[l]}</h3>
              {i.claims.filter((c) => c.label === l).map((c, k) => (
                <div className="claim" key={k}>
                  <span className={`badge ${l}`}>{l === 'noevidence' ? 'no evidence' : l}</span>
                  <div>{c.text} {c.cites.slice(0, 6).map((x) => <Chip key={x} k={x} />)}</div>
                </div>
              ))}
            </div>
          ))}

          <h3 style={{ marginTop: 14 }}>Recommended actions (runbook steps only)</h3>
          <table className="plain">
            <tbody>
              {i.actions.map((a, k) => (
                <tr key={k}>
                  <td style={{ whiteSpace: 'nowrap' }}><Chip k={a.cite} /><div className="small muted">{a.runbook} · step {a.step}</div></td>
                  <td><div className="small muted">{a.text}</div>{a.applied}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h3 style={{ marginTop: 14 }}>Who to inform, and how fast</h3>
          <div className="small muted">Clock starts when the SOC first sees it. Assumed: {i.firstSeenBasis}. First seen {i.firstSeenUtc}.</div>
          <table className="plain">
            <tbody>
              {i.inform.map((x, k) => (
                <tr key={k}><td>{x.who}</td><td><b>{x.limit}</b>{x.deadlineUtc && <div className="small muted">by {x.deadlineUtc}</div>}</td><td className="small">{x.how}</td><td><Chip k={x.cite} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {ev.observations.length > 0 && (
        <div className="card">
          <h3>Other observations</h3>
          {ev.observations.map((o, k) => (
            <div className="claim" key={k}><span className={`badge ${o.label}`}>{o.label}</span><div>{o.text} {o.cites.slice(0, 4).map((x) => <Chip key={x} k={x} />)}</div></div>
          ))}
        </div>
      )}
    </>
  );
}
