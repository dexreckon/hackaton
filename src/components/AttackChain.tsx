'use client';
import { useEv, LABEL } from './Ctx';

export default function AttackChain() {
  const { ev, select } = useEv();
  return (
    <>
      <div className="row small" style={{ marginBottom: 10 }}>
        <span className="badge confirmed">Confirmed: shown by a log line</span>
        <span className="badge suspected">Suspected: needs a guess (dashed)</span>
        <span className="badge noevidence">Not enough evidence in the logs (dashed)</span>
        <span className="badge harmless">Harmless: approved change</span>
      </div>
      {ev.incidents.map((i) => (
        <div className="card" key={i.id}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3>{i.id} · {i.title}</h3>
            {i.status === 'escalate' ? <span className={`badge sev-${i.severity}`}>{i.severity}</span> : <span className="badge harmless">closed · {i.closedBy}</span>}
          </div>
          <div className="chain">
            {i.chain.map((n, idx) => (
              <div key={idx} className="row" style={{ gap: 0, flexWrap: 'nowrap' }}>
                {idx > 0 && <span className="arrow" aria-hidden>→</span>}
                <button className={`node ${n.kind}`} title={LABEL[n.kind]} onClick={() => n.cite && select(n.cite)}>
                  <div className="t">{n.time ?? LABEL[n.kind]}</div>
                  {n.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
