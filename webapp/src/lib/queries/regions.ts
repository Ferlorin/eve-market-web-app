import { useQuery } from '@tanstack/react-query';
import type { Region } from '@/lib/regions';
import { getAllRegions } from '@/lib/regions';
import { dataUrl } from '@/lib/data-url';

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async (): Promise<Region[]> => {
      // Try loading from generated regions.json first (GitHub Pages / local data dir)
      try {
        const res = await fetch(dataUrl('regions.json'));
        if (res.ok) {
          return res.json() as Promise<Region[]>;
        }
      } catch {
        // Fall through to hardcoded fallback
      }

      // Fallback: hardcoded list — works in static export, no API route needed
      return getAllRegions();
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
  });
}
