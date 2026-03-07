/**
 * Static region data for static-cache architecture
 * These are the EVE Online regions we track for market opportunities
 */

export interface Region {
  regionId: number;
  name: string;
  notableSystems?: string[];
}

export interface TradeHub {
  systemName: string;
  regionId: number;
  regionName: string;
}

export interface SolarSystem {
  systemName: string;
  regionId: number;
}

// Notable solar systems per tracked region for autocomplete
export const NOTABLE_SYSTEMS: SolarSystem[] = [
  // The Forge (10000002) — Jita hub
  { systemName: 'Jita', regionId: 10000002 },
  { systemName: 'Perimeter', regionId: 10000002 },
  { systemName: 'New Caldari', regionId: 10000002 },
  { systemName: 'Maurasi', regionId: 10000002 },
  // Domain (10000043) — Amarr hub
  { systemName: 'Amarr', regionId: 10000043 },
  { systemName: 'Ashab', regionId: 10000043 },
  { systemName: 'Madirmilire', regionId: 10000043 },
  // Metropolis (10000042) — Hek hub
  { systemName: 'Hek', regionId: 10000042 },
  { systemName: 'Altbrard', regionId: 10000042 },
  { systemName: 'Eystur', regionId: 10000042 },
  // Sinq Laison (10000032) — Dodixie hub
  { systemName: 'Dodixie', regionId: 10000032 },
  { systemName: 'Balle', regionId: 10000032 },
  { systemName: 'Oursulaert', regionId: 10000032 },
  // Heimatar (10000030) — Rens hub
  { systemName: 'Rens', regionId: 10000030 },
  { systemName: 'Frarn', regionId: 10000030 },
  { systemName: 'Odatrik', regionId: 10000030 },
  // Lonetrek (10000016)
  { systemName: 'Kisogo', regionId: 10000016 },
  { systemName: 'Nonni', regionId: 10000016 },
  // The Citadel (10000033)
  { systemName: 'Muvolailen', regionId: 10000033 },
  { systemName: 'Urlen', regionId: 10000033 },
  // Black Rise (10000069)
  { systemName: 'Tama', regionId: 10000069 },
  // Essence (10000023)
  { systemName: 'Orvolle', regionId: 10000023 },
  { systemName: 'Algogille', regionId: 10000023 },
  // Placid (10000025)
  { systemName: 'Stacmon', regionId: 10000025 },
  { systemName: 'Pelille', regionId: 10000025 },
  // Verge Vendor (10000068)
  { systemName: 'Adacyne', regionId: 10000068 },
  // Solitude (10000048)
  { systemName: 'Boystin', regionId: 10000048 },
  { systemName: 'Octanneve', regionId: 10000048 },
  // Tash-Murkon (10000020)
  { systemName: 'Tash-Murkon Prime', regionId: 10000020 },
  { systemName: 'Sehmy', regionId: 10000020 },
  // Kador (10000052)
  { systemName: 'Kador Prime', regionId: 10000052 },
  // Khanid (10000049)
  { systemName: 'Ashmarir', regionId: 10000049 },
  // Kor-Azor (10000065)
  { systemName: 'Kor-Azor Prime', regionId: 10000065 },
  // Genesis (10000067)
  { systemName: 'Yulai', regionId: 10000067 },
  // Devoid (10000036)
  { systemName: 'Eram', regionId: 10000036 },
  // The Bleak Lands (10000038)
  { systemName: 'Anka', regionId: 10000038 },
  // Molden Heath (10000028)
  { systemName: 'Teonusude', regionId: 10000028 },
  { systemName: 'Egbinger', regionId: 10000028 },
  // Derelik (10000035)
  { systemName: 'Romi', regionId: 10000035 },
  { systemName: 'Doril', regionId: 10000035 },
];

// High-volume EVE Online trade hubs
const HIGH_VOLUME_REGIONS: Region[] = [
  { regionId: 10000002, name: 'The Forge', notableSystems: ['Jita'] },
  { regionId: 10000043, name: 'Domain', notableSystems: ['Amarr'] },
  { regionId: 10000042, name: 'Metropolis', notableSystems: ['Hek'] },
  { regionId: 10000032, name: 'Sinq Laison', notableSystems: ['Dodixie'] },
];

// Quick-select trade hub presets (most active markets)
export const TRADE_HUBS: TradeHub[] = [
  { systemName: 'Jita', regionId: 10000002, regionName: 'The Forge' },
  { systemName: 'Amarr', regionId: 10000043, regionName: 'Domain' },
  { systemName: 'Hek', regionId: 10000042, regionName: 'Metropolis' },
  { systemName: 'Dodixie', regionId: 10000032, regionName: 'Sinq Laison' },
  { systemName: 'Rens', regionId: 10000030, regionName: 'Heimatar' },
];

// Additional K-space trading regions (empire + border lowsec)
const ACTIVE_REGIONS: Region[] = [
  // Minmatar
  { regionId: 10000030, name: 'Heimatar', notableSystems: ['Rens'] },        // Rens
  { regionId: 10000028, name: 'Molden Heath' },
  // Caldari
  { regionId: 10000016, name: 'Lonetrek' },
  { regionId: 10000033, name: 'The Citadel' },
  { regionId: 10000069, name: 'Black Rise' },
  // Gallente
  { regionId: 10000037, name: 'Everyshore' },
  { regionId: 10000023, name: 'Essence' },
  { regionId: 10000025, name: 'Placid' },
  { regionId: 10000068, name: 'Verge Vendor' },
  { regionId: 10000048, name: 'Solitude' },
  // Amarr
  { regionId: 10000020, name: 'Tash-Murkon' },
  { regionId: 10000052, name: 'Kador' },
  { regionId: 10000049, name: 'Khanid' },
  { regionId: 10000065, name: 'Kor-Azor' },
  { regionId: 10000067, name: 'Genesis' },
  { regionId: 10000036, name: 'Devoid' },
  { regionId: 10000038, name: 'The Bleak Lands' },
  // Ammatar/Minmatar border
  { regionId: 10000035, name: 'Derelik' },
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
