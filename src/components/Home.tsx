'use client';
import { useEffect, useState, type ReactNode } from 'react';
import type { Incident, Inform, Sev } from '@/lib/types';
import { useEv } from './Ctx';
import Eye, { type EyeState } from './Eye';
import AskPanel from './AskPanel';

export const SEV_WORD: Record<Sev, { word: string; hint: string }> = {
  P1: { word: 'Critical', hint: 'Act right now' },
  P2: { word: 'Serious', hint: 'Act today' },
  P3: { word: 'Moderate', hint: 'Fix this week' },
  P4: { word: 'Low', hint: 'Keep an eye on it' },
};

type Kind = 'phish' | 'web' | 'scan' | 'other';
const kindOf = (i: Incident): Kind => (/phishing|account takeover/i.test(i.title) ? 'phish' : /sql|web/i.test(i.title) ? 'web' : /scan/i.test(i.title) ? 'scan' : 'other');

/** Plain-English one-liner for an incident (falls back to the technical title). */
export function plainTitle(i: Incident): string {
  const u = i.accounts[0];
  switch (kindOf(i)) {
    case 'phish': return `A fake email tricked ${u ?? 'a user'}. Someone then logged in as them and copied a large amount of data.`;
    case 'web': return 'Someone is attacking the company website, trying to read its database.';
    case 'scan': return 'An outside computer is probing our network for weak spots.';
    default: return i.title;
  }
}

/** What it means for the business, in one sentence. Only says what the findings support. */
function plainImpact(i: Incident): string {
  switch (kindOf(i)) {
    case 'phish': return 'About 2.4 GB left the finance and HR file server. The logs cannot show which files.';
    case 'web': return 'If the attack worked, data in the website’s database could be exposed. Success is suspected, not proven.';
    case 'scan': return 'No break-in was seen, but a scan like this is often the first step before an attack.';
    default: return '';
  }
}

const ICON: Record<Kind, ReactNode> = {
  phish: <path d="M3 6.5h18v11H3zM3 7l9 6 9-6" />,
  web: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.7 2.6 15.3 0 18M12 3c-2.6 2.7-2.6 15.3 0 18" /></>,
  scan: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><path d="M12 12l6-6" /></>,
  other: <path d="M12 3l9 16H3zM12 10v4M12 17v.5" />,
};
const Icon = ({ k }: { k: Kind }) => (
  <svg className="inc-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{ICON[k]}</svg>
);

/** "CISO - Hamza Qureshi (+92-300-5550001)" → name, phone, email. */
function contact(p: Inform) {
  const phone = p.who.match(/\((\+[\d-]+)\)/)?.[1];
  const email = p.who.match(/\(([^()\s]+@[^()\s]+)\)/)?.[1];
  const name = p.who.replace(/\s*\([^)]*\)/g, '').trim();
  return { name, phone, email };
}

const QUICK = ['Was any data stolen?', 'Which accounts are affected?', 'Why were two items ignored?'];

const GLOSSARY: [string, string][] = [
  ['Phishing', 'A fake email that tries to get you to click a link or type your password.'],
  ['VPN', 'The secure “tunnel” staff use to reach company systems from outside the office.'],
  ['Account takeover', 'Someone else logging in with a real employee’s username and password.'],
  ['Data exfiltration', 'Copying company data out to somewhere it should not go.'],
  ['SQL injection', 'Typing special code into a website form to trick its database into giving data away.'],
  ['Port scan', 'Knocking on every door of a computer to see which ones are open.'],
  ['Firewall', 'The gatekeeper that decides which network traffic is allowed in or out.'],
  ['Approved change', 'Work that IT planned and signed off in advance, so it is not an attack.'],
];

export function eyeState(overall: Sev | undefined, hasLive: boolean): EyeState {
  if (!hasLive) return 'safe';
  return overall === 'P1' || overall === 'P2' ? 'alert' : 'warn';
}

/** Ticked-off steps, remembered in this browser only. */
function useDone() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setDone(JSON.parse(localStorage.getItem('orbit-done') ?? '{}')); } catch { /* storage unavailable */ }
  }, []);
  const toggle = (k: string) => setDone((d) => {
    const n = { ...d, [k]: !d[k] };
    try { localStorage.setItem('orbit-done', JSON.stringify(n)); } catch { /* storage unavailable */ }
    return n;
  });
  return { done, toggle };
}

function IncidentCard({ i, goto, done, toggle, index }: { i: Incident; goto: (t: string) => void; done: Record<string, boolean>; toggle: (k: string) => void; index: number }) {
  const [all, setAll] = useState(false);
  const s = i.severity as Sev;
  const k = kindOf(i);
  const steps = i.actions.filter((a) => a.runbook !== 'RB-PHISH-01' || i.actions.every((x) => x.runbook === 'RB-PHISH-01'));
  const shown = all ? steps : steps.slice(0, 3);
  const key = (a: (typeof steps)[number]) => `${i.id}:${a.runbook}:${a.step}`;
  const nDone = steps.filter((a) => done[key(a)]).length;

  return (
    <article className={`glass inc inc-${s} rise`} id={`card-${i.id}`} style={{ animationDelay: `${0.12 + index * 0.08}s` }}>
      <div className="inc-head">
        <span className={`inc-badge sev-bg-${s}`}><Icon k={k} /></span>
        <div className="inc-meta">
          <span className={`sevtag sevtag-${s}`}>{SEV_WORD[s].word}</span>
          <span className="muted small">{SEV_WORD[s].hint}</span>
        </div>
      </div>
      <h2>{plainTitle(i)}</h2>
      <p className="impact">{plainImpact(i)}</p>
      <div className="small muted">First noticed {i.firstSeenUtc}</div>

      {i.inform.length > 0 && (
        <>
          <h3>Tell these people</h3>
          <ul className="people">
            {i.inform.map((p) => {
              const c = contact(p);
              return (
                <li key={p.who}>
                  <div><b>{c.name}</b><span className="muted"> · within {p.limit}</span></div>
                  {(c.phone || c.email) && (
                    <div className="reach">
                      {c.phone && <a href={`tel:${c.phone}`}>{c.phone}</a>}
                      {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {steps.length > 0 && (
        <>
          <div className="row between steps-head">
            <h3>What to do</h3>
            <span className="small muted">{nDone} of {steps.length} done</span>
          </div>
          <div className="progress" aria-hidden="true"><i style={{ width: `${(nDone / steps.length) * 100}%` }} /></div>
          <ul className="checklist">
            {shown.map((a) => (
              <li key={key(a)}>
                <label className={done[key(a)] ? 'done' : ''}>
                  <input type="checkbox" checked={!!done[key(a)]} onChange={() => toggle(key(a))} />
                  <span className="box" aria-hidden="true" />
                  <span>{a.text}</span>
                </label>
              </li>
            ))}
          </ul>
          {steps.length > 3 && <button className="linkbtn" onClick={() => setAll(!all)}>{all ? 'Show fewer steps' : `Show all ${steps.length} steps`}</button>}
        </>
      )}

      <div className="row card-actions">
        <button className="btn-soft" onClick={() => goto('Attack chain')}>See how it happened</button>
        <button className="btn-soft" onClick={() => goto('Report')}>Full report</button>
      </div>
    </article>
  );
}

export default function Home({ goto, scanning, onScanned }: { goto: (tab: string) => void; scanning: boolean; onScanned: () => void }) {
  const { ev } = useEv();
  const [q, setQ] = useState('');
  const [asked, setAsked] = useState<{ text: string; n: number } | null>(null);
  const [count, setCount] = useState(0);
  const { done, toggle } = useDone();
  const live = ev.incidents.filter((i) => i.status === 'escalate');
  const closed = ev.incidents.filter((i) => i.status === 'closed-harmless');
  const state = eyeState(ev.report.overall, live.length > 0);
  const total = ev.stats.events;

  // The opening scan: the eye starts blue, counts through the logs, then shows the verdict.
  useEffect(() => {
    if (!scanning) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dur = reduced ? 300 : 2600;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      setCount(Math.round(total * (1 - Math.pow(1 - k, 2))));
      if (k < 1) raf = requestAnimationFrame(step);
      else onScanned();
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [scanning, total, onScanned]);

  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    setAsked({ text: t, n: (asked?.n ?? 0) + 1 });
    setQ('');
    setTimeout(() => document.getElementById('answer')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  };

  const bySev = (['P1', 'P2', 'P3', 'P4'] as Sev[]).map((s) => ({ s, list: live.filter((i) => i.severity === s) })).filter((x) => x.list.length);
  const worst = live.find((i) => i.severity === ev.report.overall) ?? live[0];
  const firstCall = worst?.inform[0] ? contact(worst.inform[0]) : undefined;
  const headline = !live.length ? 'Everything looks fine.' : state === 'alert' ? 'Something is wrong.' : 'A few things to watch.';

  return (
    <div className="home">
      <section className="hero-screen">
        <Eye state={state} scanning={scanning} />
        <div className={`status-pill ${scanning ? 'scan' : state}`} aria-live="polite">
          <span className="new">{scanning ? 'Scanning' : state === 'alert' ? 'Alert' : state === 'warn' ? 'Caution' : 'Clear'}</span>
          {scanning ? <>Reading log entry <b className="num">{count}</b> of {total}</> : <>✦ {live.length ? `${live.length} problem${live.length > 1 ? 's' : ''} found` : 'No problems found'}</>}
        </div>
        <h1 className="hero" key={scanning ? 'scan' : 'done'}>{scanning ? 'Checking your logs…' : headline}</h1>
        <p className="sub">
          {scanning
            ? `Looking through email, VPN, firewall, website and server logs from ${ev.stats.sources} systems.`
            : `Checked ${total} log entries from ${ev.stats.sources} systems and set aside ${closed.length} harmless item${closed.length === 1 ? '' : 's'}. Ask anything in plain words.`}
        </p>

        <form className="askbox" onSubmit={(e) => { e.preventDefault(); submit(q); }}>
          <textarea value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(q); } }} placeholder="Ask about the incident…" maxLength={500} aria-label="Ask a question" rows={2} />
          <div className="askbar">
            <div className="inchips">
              <button type="button" onClick={() => submit('What happened, in order?')}><span aria-hidden="true">◷</span> What happened</button>
              <button type="button" onClick={() => submit('Who must be informed and how fast?')}><span aria-hidden="true">☏</span> Who to call</button>
              <button type="button" onClick={() => submit('What should I do first?')}><span aria-hidden="true">✓</span> What to do</button>
            </div>
            <button type="submit" className="send" aria-label="Ask" disabled={!q.trim()}>↑</button>
          </div>
        </form>
        <div className="chips">
          {QUICK.map((s) => <button key={s} onClick={() => submit(s)}>{s}</button>)}
        </div>
        {!scanning && live.length > 0 && (
          <button className="scroll-hint" onClick={() => document.getElementById('glance')?.scrollIntoView({ behavior: 'smooth' })} aria-label="Show the problems">
            <span>See what we found</span><i aria-hidden="true" />
          </button>
        )}
      </section>

      {asked && (
        <div id="answer" className="answer">
          <AskPanel key={asked.n} initial={asked.text} compact onClose={() => setAsked(null)} />
        </div>
      )}

      {!scanning && (
        <>
          {live.length > 0 && (
            <section id="glance" className="glance rise">
              {bySev.map(({ s, list }) => (
                <button key={s} className={`tile tile-${s}`} onClick={() => document.getElementById(`card-${list[0].id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
                  <b>{list.length}</b><span>{SEV_WORD[s].word}</span>
                </button>
              ))}
              <div className="tile tile-ok"><b>{closed.length}</b><span>Harmless</span></div>
              {firstCall && worst && (
                <div className="tile tile-call">
                  <span className="small muted">Call first</span>
                  <b className="callname">{firstCall.name}</b>
                  <span className="small">within {worst.inform[0].limit}{firstCall.phone && <> · <a href={`tel:${firstCall.phone}`}>{firstCall.phone}</a></>}</span>
                </div>
              )}
            </section>
          )}

          <div className="cards">
            {live.map((i, n) => <IncidentCard key={i.id} i={i} goto={goto} done={done} toggle={toggle} index={n} />)}
          </div>

          {closed.length > 0 && (
            <section className="glass okbox rise">
              <h3>Checked and harmless</h3>
              <p className="small muted" style={{ margin: '0 0 8px' }}>These looked suspicious at first, but IT had planned and approved them in advance.</p>
              {closed.map((c) => (
                <div key={c.id} className="okrow"><span className="tick" aria-hidden="true">✓</span><span>{c.title.replace('Closed as harmless: ', '').replace(/\s*\(CHG-[^)]*\)/, '')}</span><span className="chg">{c.closedBy}</span></div>
              ))}
            </section>
          )}

          <section className="glass glossary rise">
            <h3>New to security? What these words mean</h3>
            <dl>
              {GLOSSARY.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
            </dl>
          </section>

          <p className="muted small center foot">Overall level: <b>{SEV_WORD[ev.report.overall].word}</b> ({ev.report.overall}). Every finding links to the exact log line it came from — open <button className="linkbtn" onClick={() => goto('Overview')}>Details</button> to see them.</p>
        </>
      )}
    </div>
  );
}
