'use client';
import { useEv } from './Ctx';
import { Chip } from './CiteText';

export default function Matches() {
  const { ev } = useEv();
  return (
    <>
      <p className="muted small">The same person or machine appears under different names in different files. This is how each one was joined, with the line that proves each name.</p>
      {ev.matches.map((m) => (
        <div className="card" key={m.entity}>
          <h3>{m.entity}</h3>
          <div className="small muted" style={{ marginBottom: 6 }}>{m.how}</div>
          <table className="plain">
            <tbody>
              {m.names.map((n, i) => (
                <tr key={i}><td>{n.value}</td><td style={{ whiteSpace: 'nowrap' }}><Chip k={n.cite} /></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}
