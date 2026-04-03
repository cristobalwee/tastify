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

export type TastifyTheme = 'light' | 'dark' | 'auto';

export interface TastifyProviderProps {
  tokenUrl?: string;
  getToken?: () => Promise<string>;
  token?: string;
  cacheTTL?: TastifyConfig['cacheTTL'];
  theme?: TastifyTheme;
  children: ReactNode;
}

const TastifyContext = createContext<TastifyClient | null>(null);
const TastifyThemeContext = createContext<TastifyTheme | undefined>(undefined);

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
  theme,
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

  const themeAttr = theme && theme !== 'light' ? theme : undefined;

  return (
    <TastifyContext.Provider value={client}>
      <TastifyThemeContext.Provider value={theme}>
        {themeAttr ? (
          <div data-tf-theme={themeAttr} style={{ display: 'contents' }}>
            {children}
          </div>
        ) : (
          children
        )}
      </TastifyThemeContext.Provider>
    </TastifyContext.Provider>
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

export function useTastifyTheme(): TastifyTheme | undefined {
  return useContext(TastifyThemeContext);
}
