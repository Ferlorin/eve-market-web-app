'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

type FontScale = 75 | 100 | 125 | 150;

interface FontScaleContextType {
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
}

const FontScaleContext = createContext<FontScaleContextType | undefined>(
  undefined
);

export function FontScaleProvider({ children }: { children: ReactNode }) {
  const [fontScale, setFontScaleState] = useState<FontScale>(100);
  const [mounted, setMounted] = useState(false);

  // Initialize font scale on mount
  useEffect(() => {
    setMounted(true);

    // Check localStorage
    const stored = localStorage.getItem('fontScale');
    if (stored && [75, 100, 125, 150].includes(Number(stored))) {
      setFontScaleState(Number(stored) as FontScale);
    }
  }, []);

  const setFontScale = (newScale: FontScale) => {
    setFontScaleState(newScale);
    localStorage.setItem('fontScale', String(newScale));
    document.documentElement.style.setProperty(
      '--font-scale',
      String(newScale / 100)
    );
  };

  // Apply font scale on mount and scale change
  useEffect(() => {
    if (mounted) {
      document.documentElement.style.setProperty(
        '--font-scale',
        String(fontScale / 100)
      );
    }
  }, [fontScale, mounted]);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <FontScaleContext.Provider value={{ fontScale, setFontScale }}>
      {children}
    </FontScaleContext.Provider>
  );
}

export function useFontScale() {
  const context = useContext(FontScaleContext);
  if (context === undefined) {
    throw new Error('useFontScale must be used within a FontScaleProvider');
  }
  return context;
}
