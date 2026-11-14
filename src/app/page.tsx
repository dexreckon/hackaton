import evidence from '@/generated/evidence.json';
import type { Evidence } from '@/lib/types';
import Dashboard from '@/components/Dashboard';

export default function Page() {
  return <Dashboard evidence={evidence as unknown as Evidence} />;
}
