'use client';

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  type ReactNode,
} from 'react';
import { TastifyClient, type TastifyConfig } from '@tastify/core';

export interface TastifyProviderProps {
  tokenUrl?: string;
  getToken?: () => Promise<string>;
  token?: string;
  cacheTTL?: TastifyConfig['cacheTTL'];
  children: ReactNode;
}

const TastifyContext = createContext<TastifyClient | null>(null);

function buildConfig(props: Omit<TastifyProviderProps, 'children'>): TastifyConfig {
  const config: TastifyConfig = { cacheTTL: props.cacheTTL };
  if (props.tokenUrl) config.tokenUrl = props.tokenUrl;
  else if (props.getToken) config.getToken = props.getToken;
  else if (props.token) config.token = props.token;
  return config;
}

export function TastifyProvider({
  tokenUrl,
  getToken,
  token,
  cacheTTL,
  children,
}: TastifyProviderProps) {
  const clientRef = useRef<TastifyClient | null>(null);

  // Create client synchronously so it's available on first render
  const client = useMemo(() => {
    if (clientRef.current) {
      clientRef.current.destroy();
    }
    const newClient = new TastifyClient(buildConfig({ tokenUrl, getToken, token, cacheTTL }));
    clientRef.current = newClient;
    return newClient;
  }, [tokenUrl, getToken, token, cacheTTL]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.destroy();
      clientRef.current = null;
    };
  }, []);

  return (
    <TastifyContext.Provider value={client}>{children}</TastifyContext.Provider>
  );
}

export function useTastifyClient(): TastifyClient {
  const client = useContext(TastifyContext);
  if (!client) {
    throw new Error(
      'useTastifyClient must be used within a <TastifyProvider>',
    );
  }
  return client;
}
