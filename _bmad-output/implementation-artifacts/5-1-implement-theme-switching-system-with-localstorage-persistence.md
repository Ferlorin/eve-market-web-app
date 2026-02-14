# Story 5.1: Implement Theme Switching System with localStorage Persistence

Status: ready-for-dev

## Story

As a user,
I want to switch between light and dark themes with instant visual transition,
So that I can use the app comfortably regardless of lighting conditions.

## Acceptance Criteria

**Given** the app is styled with Tailwind CSS
**When** I implement theme switching using CSS variables (--background, --text-primary, --accent, etc.)
**Then** the app defaults to dark theme on first visit
**And** the app detects system preference using `prefers-color-scheme` media query on first visit
**And** a theme toggle button (sun/moon icon) appears in the top-right corner of the page
**And** clicking the toggle instantly switches between light and dark themes (< 50ms transition)
**And** the selected theme is stored in localStorage as `theme: 'light' | 'dark'`
**And** the theme persists across page refreshes and browser sessions
**And** both themes meet WCAG AA contrast requirements (dark: 14.2:1 high emphasis text, light: 15.8:1 high emphasis text)

## Technical Requirements

### Theme Context and Hook

**File:** `lib/contexts/ThemeContext.tsx`

```typescript
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    setMounted(true);

    // Check localStorage first
    const storedTheme = localStorage.getItem('theme') as Theme | null;

    if (storedTheme) {
      setThemeState(storedTheme);
      document.documentElement.classList.toggle('dark', storedTheme === 'dark');
    } else {
      // Detect system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const initialTheme = prefersDark ? 'dark' : 'light';
      setThemeState(initialTheme);
      document.documentElement.classList.toggle('dark', initialTheme === 'dark');
      localStorage.setItem('theme', initialTheme);
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  // Prevent flash of unstyled content
  if (!mounted) {
    return <div className="dark">{children}</div>;
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
```

### Theme Toggle Button Component

**File:** `components/ThemeToggle.tsx`

```typescript
'use client';

import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '@/lib/contexts/ThemeContext';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg border border-gray-700 dark:border-gray-600 
        bg-gray-100 dark:bg-gray-800 
        text-gray-800 dark:text-gray-200
        hover:bg-gray-200 dark:hover:bg-gray-700
        focus:outline-none focus-visible:ring-2 focus-visible:ring-eve-blue focus-visible:ring-offset-2
        transition-colors"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <SunIcon className="h-5 w-5" />
      ) : (
        <MoonIcon className="h-5 w-5" />
      )}
    </button>
  );
}
```

### Tailwind Dark Mode Configuration

**Update `tailwind.config.ts`:**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        'eve-blue': '#33B5E5',
        'eve-blue-dark': '#0099CC',
        'eve-gold': '#FFB800',
        'eve-red': '#FF4757',
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7785',
          600: '#4B5563',
          700: '#374151',
          800: '#1F2937',
          850: '#1A2028',
          900: '#111827',
        }
      },
    },
  },
  plugins: [],
};

export default config;
```

### Global CSS with Theme Variables

**Update `app/globals.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  /* Light theme */
  --background: 255 255 255;
  --foreground: 17 24 39;
  --card: 249 250 251;
  --border: 229 231 235;
  --accent: 51 181 229;
}

.dark {
  /* Dark theme */
  --background: 10 14 20;
  --foreground: 249 250 251;
  --card: 21 25 33;
  --border: 55 65 81;
  --accent: 51 181 229;
}

/* Smooth transitions for theme changes */
* {
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;
}

/* Disable transitions on inputs to prevent flash */
input,
textarea,
select {
  transition: none !important;
}

/* Custom scrollbar */
.scrollbar-thin::-webkit-scrollbar {
  width: 8px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  @apply bg-gray-200 dark:bg-gray-800;
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  @apply bg-gray-400 dark:bg-gray-600;
  border-radius: 4px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  @apply bg-gray-500 dark:bg-gray-500;
}

/* Firefox scrollbar */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgb(156 163 175) rgb(229 231 235);
}

.dark .scrollbar-thin {
  scrollbar-color: rgb(75 85 99) rgb(31 41 55);
}
```

### Update Layout with Theme Provider

**Update `app/layout.tsx`:**

```typescript
import { Inter, JetBrains_Mono } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/lib/contexts/ThemeContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
});

const queryClient = new QueryClient();

export const metadata = {
  title: 'EVE Market Scanner',
  description: 'Find profitable trading opportunities across EVE Online regions',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className={`${inter.className} bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            {children}
          </QueryClientProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Update Header with Theme Toggle

**Update `app/page.tsx` header section:**

```typescript
import { ThemeToggle } from '@/components/ThemeToggle';

// In the header:
<header className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
        EVE Market Scanner
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
        Find profitable trading opportunities across regions
      </p>
    </div>
    <ThemeToggle />
  </div>
</header>
```

### Verification Steps

1. **Test default theme:**
   ```
   1. Clear localStorage
   2. Load page
   3. Should detect system preference (light/dark)
   4. localStorage should store detected theme
   ```

2. **Test theme toggle:**
   ```
   1. Click sun/moon icon in header
   2. Theme switches instantly (<50ms)
   3. All colors update smoothly
   4. Check localStorage: Value changed
   ```

3. **Test persistence:**
   ```
   1. Set theme to light
   2. Refresh page → Still light
   3. Close browser, reopen → Still light
   4. Toggle to dark → Persists
   ```

4. **Test contrast:**
   ```
   1. Use Chrome DevTools Lighthouse
   2. Run accessibility audit
   3. Both themes should pass WCAG AA contrast
   4. Dark: 14.2:1, Light: 15.8:1
   ```

5. **Test smooth transitions:**
   ```
   1. Toggle theme
   2. All backgrounds/borders fade smoothly
   3. No jarring color changes
   4. Transition completes in 150ms
   ```

## Architecture Context

### Why CSS Class-Based Dark Mode

**Tailwind darkMode: 'class':**
- Manual control over theme (not automatic)
- Works with localStorage persistence
- No flashing (initial theme set before render)

**Alternative:**
- `darkMode: 'media'` uses system preference only
- No manual toggle possible

**Verdict:** Class-based provides best UX

### Why localStorage

**Client-Side Persistence:**
- Theme preference personal to user
- No server-side session needed
- Works offline
- Instant read (no API call)

**Alternative:**
- Cookies: Unnecessary overhead
- Database: Overkill for preference

### FOUC (Flash of Unstyled Content) Prevention

**Strategy:**
- Check mounted state before rendering
- Set initial theme class before first paint
- Default to dark (matches EVE aesthetic)

**Without Prevention:**
- Light theme flashes→ Dark theme loads
- Poor UX, especially for dark theme users

### Transition Performance

**150ms Duration:**
- Fast enough to feel instant
- Slow enough to be smooth (not jarring)
- Standard for UI transitions

**Disable on Inputs:**
- Text inputs shouldn't transition
- Causes cursor flicker
- Excluded with `transition: none !important`

## Dev Notes

### Prerequisites

- Tailwind CSS configured (Story 1.1)
- @heroicons/react installed (Story 3.2)

### No Additional Dependencies

- Uses React Context API (built-in)
- Uses localStorage (browser API)
- Uses Tailwind dark mode (built-in)

### Common Issues and Solutions

**Issue: Theme flashes on page load**
- Solution: Ensure mounted check in ThemeProvider
- Add initial dark class to HTML in layout

**Issue: localStorage not persisting**
- Solution: Check browser privacy settings
- Incognito mode blocks localStorage

**Issue: Toggle button doesn't change icon**
- Solution: Verify theme state updating correctly
- Check conditional render logic

**Issue: Some components don't change theme**
- Solution: Add dark: prefix to all color classes
- Example: `bg-gray-800` → `bg-gray-100 dark:bg-gray-800`

**Issue: Transitions too slow/fast**
- Solution: Adjust duration in globals.css
- `150ms` → `100ms` (faster) or `200ms` (slower)

### Updating Existing Components

**Add dark mode to all components:**

```typescript
// Before:
<div className="bg-gray-800 text-white">

// After:
<div className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white">
```

**Common patterns:**
```typescript
// Backgrounds
bg-white dark:bg-gray-900
bg-gray-100 dark:bg-gray-800

// Text
text-gray-900 dark:text-white
text-gray-600 dark:text-gray-400

// Borders
border-gray-200 dark:border-gray-700
```

### Testing Both Themes

**Manual testing checklist:**
- [ ] Header readable in both themes
- [ ] Region selectors visible in both themes
- [ ] Table rows distinct in both themes
- [ ] Buttons contrasted in both themes
- [ ] Footer readable in both themes
- [ ] Focus states visible in both themes

### Performance Expectations

**Theme Toggle:**
- State update: <5ms
- DOM class toggle: <10ms
- CSS transitions: 150ms
- Total perceived: <200ms

**Page Load:**
- localStorage read: <1ms
- Initial theme set: <5ms
- No performance impact

### Next Steps

After this story is complete:
1. **Story 5.2:** Add full keyboard navigation
2. **Story 5.3:** Apply WCAG AA accessibility standards
3. **Story 5.4:** Add font scaling feature

### References

**Source Documents:**
- [PRD: Theming Requirement](../planning-artifacts/prd.md#accessibility-level)
- [UX Spec: Theme System](../planning-artifacts/ux-design-specification.md)
- [Epic 5: User Experience & Accessibility](../planning-artifacts/epics.md#epic-5-user-experience--accessibility)

**External Documentation:**
- Tailwind Dark Mode: https://tailwindcss.com/docs/dark-mode
- localStorage API: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- prefers-color-scheme: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-color-scheme

## Dev Agent Record

### Agent Model Used

_To be filled by Dev agent_

### Completion Notes

_To be filled by Dev agent_

### File List

_To be filled by Dev agent_
