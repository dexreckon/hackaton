'use client';
import { useEv } from './Ctx';

const RE = /(\[\d{2}_[A-Za-z0-9_]+\.md:[^\]]+\])/g;

/** Turns [11_vpn_auth_log.md:L7] in a text into a clickable chip that opens the raw line. */
export function Chip({ k }: { k: string }) {
  const { select } = useEv();
  const [file, ...rest] = k.split(':');
  const loc = rest.join(':');
  return (
    <button className="chip" title={k} onClick={() => select(k)}>
      {file.slice(0, 2)}:{loc.length > 24 ? loc.slice(0, 23) + '…' : loc}
    </button>
  );
}

export default function CiteText({ text }: { text: string }) {
  return (
    <>
      {text.split(RE).map((part, i) =>
        RE.test(part) || /^\[\d{2}_[A-Za-z0-9_]+\.md:[^\]]+\]$/.test(part) ? <Chip key={i} k={part.slice(1, -1)} /> : <span key={i}>{part}</span>,
      )}
    </>
  );
}
