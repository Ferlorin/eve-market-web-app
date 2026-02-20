/**
 * Static region data for static-cache architecture
 * These are the EVE Online regions we track for market opportunities
 */

export interface Region {
  regionId: number;
  name: string;
}

// High-volume EVE Online trade hubs
const HIGH_VOLUME_REGIONS: Region[] = [
  { regionId: 10000002, name: 'The Forge' },       // Jita
  { regionId: 10000043, name: 'Domain' },          // Amarr
  { regionId: 10000042, name: 'Metropolis' },      // Hek/Rens
  { regionId: 10000032, name: 'Sinq Laison' },     // Dodixie
];

// Additional active trading regions
const ACTIVE_REGIONS: Region[] = [
  { regionId: 10000030, name: 'Heimatar' },
  { regionId: 10000016, name: 'Lonetrek' },
  { regionId: 10000033, name: 'The Citadel' },
  { regionId: 10000037, name: 'Everyshore' },
  { regionId: 10000028, name: 'Molden Heath' },
  { regionId: 10000020, name: 'Tash-Murkon' },
];

// All trading regions (sorted alphabetically)
const ALL_REGIONS: Region[] = [...HIGH_VOLUME_REGIONS, ...ACTIVE_REGIONS].sort((a, b) =>
  a.name.localeCompare(b.name)
);

/**
 * Get all available trading regions (static list)
 */
export async function getAllRegions(): Promise<Region[]> {
  return ALL_REGIONS;
}

/**
 * Get region by ID
 */
export async function getRegionById(regionId: number): Promise<Region | null> {
  return ALL_REGIONS.find(r => r.regionId === regionId) || null;
}

/**
 * Get region by name (case-insensitive)
 */
export async function getRegionByName(name: string): Promise<Region | null> {
  return ALL_REGIONS.find(r => r.name.toLowerCase() === name.toLowerCase()) || null;
}
