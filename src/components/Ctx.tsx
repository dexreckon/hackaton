'use client';
import { createContext, useContext } from 'react';
import type { Evidence } from '@/lib/types';

export interface Ctx { ev: Evidence; select: (refKey: string) => void }
export const EvCtx = createContext<Ctx | null>(null);
export const useEv = () => {
  const c = useContext(EvCtx);
  if (!c) throw new Error('useEv must be used inside <Dashboard>');
  return c;
};

export const LABEL: Record<string, string> = { confirmed: 'Confirmed', suspected: 'Suspected', noevidence: 'Not enough evidence in the logs', harmless: 'Harmless (approved)' };
export const pkt = (utcIso: string) => {
  const d = new Date(Date.parse(utcIso) + 5 * 3600e3);
  return d.toISOString().slice(11, 19) + ' PKT';
};
