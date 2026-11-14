'use client';
import { useRef, useState } from 'react';
import CiteText from './CiteText';

interface Msg { role: 'user' | 'bot'; text: string; note?: string; mode?: string }
const IDEAS = [
  'What happened, in order?',
  'Was data stolen from the file server?',
  'Was the scan from SCAN01 an attack?',
  'Why was braza’s remote desktop to the domain controller not escalated?',
  'Who is 10.10.3.45?',
  'Which logs are missing?',
  'Who must be informed and how fast?',
  'Did sraheel or utariq click the phishing link?',
];

export default function AskPanel() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function ask(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history = msgs.slice(-4).map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    setMsgs((m) => [...m, { role: 'user', text: question }]);
    setQ(''); setBusy(true);
    try {
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, history }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? 'Something went wrong');
      setMsgs((m) => [...m, { role: 'bot', text: j.answer, mode: j.mode, note: [j.note, j.dropped ? `${j.dropped} unsupported statement(s) were removed by the citation check.` : ''].filter(Boolean).join(' ') }]);
    } catch (e) {
      setMsgs((m) => [...m, { role: 'bot', text: `Could not answer: ${(e as Error).message}` }]);
    } finally {
      setBusy(false);
      setTimeout(() => end.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }

  return (
    <div className="card">
      <p className="muted small" style={{ marginTop: 0 }}>Answers use only the log files. Every sentence needs a citation that exists, or it is removed. Click a citation to see the raw line.</p>
      <div className="row" style={{ marginBottom: 10 }}>
        {IDEAS.map((i) => <button key={i} className="pill" onClick={() => ask(i)}>{i}</button>)}
      </div>
      {msgs.map((m, i) => (
        <div key={i} className={`bubble ${m.role}`}>
          {m.role === 'bot' ? <CiteText text={m.text} /> : m.text}
          {m.note && <div className="small muted" style={{ marginTop: 6 }}>{m.note}</div>}
          {m.mode && <div className="small muted">{m.mode === 'llm' ? 'Model answer, citations verified' : 'Built-in answer from verified findings'}</div>}
        </div>
      ))}
      {busy && <div className="bubble bot muted">Checking the logs…</div>}
      <div ref={end} />
      <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about the incident, for example: was the scan approved?" maxLength={500} />
        <button type="submit" disabled={busy}>Ask</button>
      </form>
    </div>
  );
}
