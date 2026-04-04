import { useEffect, useLayoutEffect } from 'react';

/** Client: `useLayoutEffect` (pre-paint DOM work). Server: `useEffect` to avoid SSR warnings. */
export const useIsomorphicLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;
