import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { RateTable } from './lib/bnm';
import { LatestResult, RatesRepository } from './lib/repository';

interface AppState {
  repo: RatesRepository;
  latest: LatestResult | null;
  latestError: string | null;
  loadingLatest: boolean;
  reloadLatest: () => void;
  from: string;
  to: string;
  setFrom: (c: string) => void;
  setTo: (c: string) => void;
  swap: () => void;
  currencies: string[];
}

const Ctx = createContext<AppState | null>(null);

const FRONT = ['EUR', 'USD', 'MDL', 'RON', 'UAH', 'RUB', 'GBP', 'CHF'];

export function currencyList(table: RateTable | undefined): string[] {
  if (!table) return [];
  const codes = Object.keys(table.rates);
  const front = FRONT.filter((c) => codes.includes(c));
  return [...front, ...codes.filter((c) => !FRONT.includes(c)).sort()];
}

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const repo = useMemo(() => new RatesRepository(AsyncStorage), []);
  const [latest, setLatest] = useState<LatestResult | null>(null);
  const [latestError, setLatestError] = useState<string | null>(null);
  const [loadingLatest, setLoading] = useState(true);
  const [from, setFrom] = useState('EUR');
  const [to, setTo] = useState('MDL');

  const reloadLatest = useCallback(() => {
    setLoading(true);
    repo
      .getLatest()
      .then((r) => {
        setLatest(r);
        setLatestError(null);
      })
      .catch((e: unknown) => setLatestError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [repo]);

  useEffect(reloadLatest, [reloadLatest]);

  const value: AppState = {
    repo,
    latest,
    latestError,
    loadingLatest,
    reloadLatest,
    from,
    to,
    setFrom,
    setTo,
    swap: () => {
      setFrom(to);
      setTo(from);
    },
    currencies: currencyList(latest?.table),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppState(): AppState {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppState outside provider');
  return v;
}
