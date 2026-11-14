'use client';
import { useEv, pkt } from './Ctx';

export default function RawPanel({ refKey, onClose }: { refKey: string; onClose: () => void }) {
  const { ev } = useEv();
  const ref = ev.refs[refKey];
  const e = ev.events.find((x) => x.id === refKey);
  return (
    <aside className="drawer" aria-label="Raw evidence">
      <button className="close" onClick={onClose}>Close</button>
      <h3 style={{ margin: '0 0 4px' }}>Raw evidence</h3>
      <div className="mono small muted">{ref ? `${ref.file} · ${ref.loc}` : refKey}</div>
      {!ref && <p>That citation does not exist in the files.</p>}
      {ref && <pre>{ref.raw}</pre>}
      {e && (
        <>
          <h4 style={{ marginBottom: 4 }}>Time</h4>
          <div className="small">
            <b>{e.tsUtc.replace('T', ' ').replace('Z', ' UTC')}</b> [{pkt(e.tsUtc)}]
            <div className="muted">{e.timeNote}</div>
            {e.loggedUtc && <div className="muted">Line written at {e.loggedUtc.replace('T', ' ').replace('Z', ' UTC')}</div>}
          </div>
          {e.actor && <p className="small">Account behind this line: <b>{e.actor}</b></p>}
          {e.approvedBy && <p className="small"><span className="badge harmless">Approved</span> by change <button className="chip" onClick={() => document.dispatchEvent(new CustomEvent('open-ref', { detail: `05_change_calendar.md:${e.approvedBy}` }))}>{e.approvedBy}</button></p>}
          {e.incidents.length > 0 && <p className="small">Part of: {e.incidents.join(', ')}</p>}
        </>
      )}
    </aside>
  );
}
