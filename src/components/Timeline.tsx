'use client';
import { useMemo, useState } from 'react';
import { useEv, pkt } from './Ctx';
import { SOURCE_NAMES } from './sources';

export default function Timeline({ selected }: { selected: string | null }) {
  const { ev, select } = useEv();
  const sources = [...new Set(ev.events.map((e) => e.source))];
  const [src, setSrc] = useState<string[]>(sources);
  const [inc, setInc] = useState<string>('all');
  const [showApproved, setShowApproved] = useState(true);
  const [q, setQ] = useState('');

  const rows = useMemo(
    () => ev.events.filter((e) =>
      src.includes(e.source) &&
      (inc === 'all' || (inc === 'none' ? e.incidents.length === 0 : e.incidents.includes(inc))) &&
      (showApproved || !e.approvedBy) &&
      (!q || (e.raw + e.action).toLowerCase().includes(q.toLowerCase()))),
    [ev.events, src, inc, showApproved, q],
  );
  const toggle = (s: string) => setSrc((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  return (
    <div className="card">
      <div className="filters">
        {sources.map((s) => (
          <button key={s} aria-pressed={src.includes(s)} onClick={() => toggle(s)}>{SOURCE_NAMES[s] ?? s}</button>
        ))}
      </div>
      <div className="filters">
        <select value={inc} onChange={(e) => setInc(e.target.value)} className="pill" aria-label="Incident">
          <option value="all">All events</option>
          {ev.incidents.map((i) => <option key={i.id} value={i.id}>{i.id} {i.status === 'escalate' ? `(${i.severity})` : '(closed)'}</option>)}
          <option value="none">Not part of any incident</option>
        </select>
        <label className="small"><input type="checkbox" checked={showApproved} onChange={(e) => setShowApproved(e.target.checked)} /> show approved activity</label>
        <input className="pill" placeholder="search the raw lines" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 200 }} />
        <span className="small muted">{rows.length} of {ev.events.length} events. Click a row for the raw line and how its time was converted.</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table className="tl">
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className={`${e.approvedBy ? 'approved' : ''} ${selected === e.id ? 'sel' : ''}`} onClick={() => select(e.id)}>
                <td className="mono" style={{ whiteSpace: 'nowrap' }}>{e.tsUtc.slice(11, 19)}<div className="small muted">{pkt(e.tsUtc).slice(0, 8)} PKT</div></td>
                <td><span className="src">{SOURCE_NAMES[e.source] ?? e.source}</span></td>
                <td>{e.action}{e.loggedUtc && <span className="small muted"> · start time, written {e.loggedUtc.slice(11, 19)}Z</span>}</td>
                <td className="small" style={{ whiteSpace: 'nowrap' }}>
                  {e.incidents.map((i) => <span key={i} className="badge" style={{ marginRight: 4 }}>{i}</span>)}
                  {e.approvedBy && <span className="badge harmless">{e.approvedBy}</span>}
                </td>
                <td className="mono small muted">{e.file.slice(0, 2)}:{e.loc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
