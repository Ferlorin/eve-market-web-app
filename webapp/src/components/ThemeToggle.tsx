'use client';

import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/lib/theme-context';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg border transition-colors ${
        isDark
          ? 'bg-gray-800 border-gray-700 hover:bg-gray-700'
          : 'bg-gray-200 border-gray-300 hover:bg-gray-300'
      }`}
      aria-label="Toggle theme"
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {isDark ? (
        <SunIcon className="h-5 w-5 text-gray-300" />
      ) : (
        <MoonIcon className="h-5 w-5 text-gray-700" />
      )}
    </button>
  );
}
