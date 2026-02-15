import { prisma } from './db';
import { esiClient } from './esi-client';

/**
 * Location Service - Handles station/structure name lookups with caching
 * 
 * Strategy:
 * 1. Check database cache first
 * 2. If not found, fetch from ESI
 * 3. Cache result in database
 * 4. Return name or fallback to ID string
 */

export class LocationService {
  /**
   * Get location name by ID (station or structure)
   * Returns cached name from DB or fetches from ESI
   */
  async getLocationName(locationId: bigint): Promise<string> {
    // Check cache first
    const cached = await prisma.location.findUnique({
      where: { locationId },
    });

    if (cached) {
      return cached.name;
    }

    // Not in cache - fetch from ESI
    const name = await this.fetchAndCacheLocation(locationId);
    return name || locationId.toString(); // Fallback to ID if fetch fails
  }

  /**
   * Get multiple location names in batch
   * Optimized for bulk lookups (e.g., for table rendering)
   */
  async getLocationNames(locationIds: bigint[]): Promise<Map<bigint, string>> {
    const result = new Map<bigint, string>();

    // Fetch all cached locations in one query
    const cached = await prisma.location.findMany({
      where: {
        locationId: {
          in: locationIds,
        },
      },
    });

    // Map cached locations
    cached.forEach((loc) => {
      result.set(loc.locationId, loc.name);
    });

    // Find missing locations
    const missing = locationIds.filter((id) => !result.has(id));

    // Fetch missing locations from ESI (batched)
    if (missing.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);
        const promises = batch.map((id) => this.fetchLocationFromESI(id));
        const fetched = await Promise.all(promises);

        const toCreate: { locationId: bigint; name: string; type: string }[] = [];

        fetched.forEach((data, index) => {
          const id = batch[index];
          if (data) {
            result.set(id, data.name);
            toCreate.push({ locationId: id, name: data.name, type: data.type });
          } else {
            result.set(id, id.toString());
          }
        });

        // BATCH INSERT instead of individual creates
        if (toCreate.length > 0) {
          await prisma.location.createMany({
            data: toCreate,
            skipDuplicates: true,
          });
        }
      }
    }

    return result;
  }

  /**
   * Fetch location name from ESI and cache it
   * Returns null if fetch fails
   */
  private async fetchAndCacheLocation(locationId: bigint): Promise<string | null> {
    try {
      const data = await this.fetchLocationFromESI(locationId);

      if (data) {
        await prisma.location.create({
          data: {
            locationId,
            name: data.name,
            type: data.type,
          },
        });
        return data.name;
      }

      return null;
    } catch (error) {
      console.error(`Failed to fetch location ${locationId}:`, error);
      return null;
    }
  }

  /**
   * Fetch location data from ESI without caching
   * Returns location data or null if fetch fails
   */
  private async fetchLocationFromESI(locationId: bigint): Promise<{ name: string; type: string } | null> {
    try {
      // Determine if it's a station or structure by ID range
      // Stations: 60000000 - 64000000
      // Structures: > 1000000000000
      const isStation = locationId < BigInt('1000000000000');

      let name: string | null = null;
      let type: string;

      if (isStation) {
        // NPC station
        type = 'station';
        name = await esiClient.getStationName(Number(locationId));
      } else {
        // Player structure
        type = 'structure';
        name = await esiClient.getStructureName(locationId);
      }

      return name ? { name, type } : null;
    } catch (error) {
      console.error(`Failed to fetch location ${locationId}:`, error);
      return null;
    }
  }
}

// Singleton instance
export const locationService = new LocationService();
