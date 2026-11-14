import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Orbit Logistics · Incident triage',
  description: 'Reads the security logs, builds the timeline, separates real attacks from noise, and writes an evidence-based incident report.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
