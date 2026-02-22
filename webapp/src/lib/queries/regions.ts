import { useQuery } from '@tanstack/react-query';
import type { Region } from '@/lib/regions';
import { dataUrl } from '@/lib/data-url';

interface RegionsResponse {
  success: boolean;
  count: number;
  data: Region[];
}

export function useRegions() {
  return useQuery({
    queryKey: ['regions'],
    queryFn: async (): Promise<Region[]> => {
      // Try loading from generated regions.json first (GitHub Pages / local data dir)
      // This reflects exactly what was fetched — no hardcoded list needed
      try {
        const res = await fetch(dataUrl('regions.json'));
        if (res.ok) {
          return res.json() as Promise<Region[]>;
        }
      } catch {
        // Fall through to API fallback
      }

      // Fallback: API route uses the hardcoded list in src/lib/regions.ts
      // Used during local dev before data has been generated
      const response = await fetch('/api/regions');
      if (!response.ok) {
        throw new Error('Failed to fetch regions');
      }
      const json: RegionsResponse = await response.json();
      return json.data;
    },
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000,
  });
}
