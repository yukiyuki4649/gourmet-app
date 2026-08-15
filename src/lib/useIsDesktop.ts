import { useEffect, useState } from 'react';

// Matches the app's existing `lg:` Tailwind breakpoint (see e.g. Dashboard.tsx's filter grid),
// used here to decide whether a viewer is on a wide-enough screen to eagerly load all photos.
const QUERY = '(min-width: 1024px)';

export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(QUERY).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  return isDesktop;
}
