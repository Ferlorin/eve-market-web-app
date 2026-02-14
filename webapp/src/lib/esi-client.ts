import axios, { AxiosInstance, AxiosError } from 'axios';
import { z } from 'zod';

// ESI API Response Schemas (zod validation)
const ESIMarketOrderSchema = z.object({
  order_id: z.number(),
  type_id: z.number(),
  location_id: z.number(),
  volume_remain: z.number(),
  price: z.number(),
  is_buy_order: z.boolean(),
  issued: z.string().datetime(),
  duration: z.number(),
  min_volume: z.number(),
  range: z.string(),
  system_id: z.number().optional(),
});

export type ESIMarketOrder = z.infer<typeof ESIMarketOrderSchema>;

const ESIRegionSchema = z.object({
  region_id: z.number(),
  name: z.string().optional(),
});

const ESIStationSchema = z.object({
  station_id: z.number(),
  name: z.string(),
  system_id: z.number().optional(),
});

const ESIStructureSchema = z.object({
  name: z.string(),
  solar_system_id: z.number().optional(),
});

// Rate Limiter using Token Bucket Algorithm
class RateLimiter {
  private tokens: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private lastRefill: number;

  constructor(requestsPerSecond: number) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refill();
    
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }
    
    // Wait until a token is available
    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.tokens = 0;
  }
}

export class ESIClient {
  private axiosInstance: AxiosInstance;
  private rateLimiter: RateLimiter;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: 'https://esi.evetech.net/latest',
      timeout: 30000,
      headers: {
        'User-Agent': 'EVE-Market-Scanner/1.0 (contact@example.com)',
        'Accept': 'application/json',
      },
    });
    
    // NFR-I1: Respect 150 req/sec limit
    this.rateLimiter = new RateLimiter(150);
    
    // Request interceptor for rate limiting
    this.axiosInstance.interceptors.request.use(async (config) => {
      await this.rateLimiter.acquire();
      return config;
    });
    
    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      this.handleError.bind(this)
    );
  }
  
  private async handleError(error: AxiosError): Promise<never> {
    if (error.response) {
      // Server responded with error status
      const status = error.response.status;
      const endpoint = error.config?.url || 'unknown';
      
      if (status === 503) {
        // Service unavailable - will be handled by retry logic in Story 2.3
        throw new ESIError(
          `ESI API unavailable (503): ${endpoint}`,
          status,
          endpoint,
          true // retryable
        );
      }
      
      if (status === 429) {
        // Rate limited (shouldn't happen with our rate limiter)
        throw new ESIError(
          `ESI API rate limited (429): ${endpoint}`,
          status,
          endpoint,
          true
        );
      }
      
      throw new ESIError(
        `ESI API error (${status}): ${endpoint}`,
        status,
        endpoint,
        false
      );
    }
    
    // Network error or timeout
    throw new ESIError(
      `Network error: ${error.message}`,
      0,
      error.config?.url || 'unknown',
      true
    );
  }
  
  async getAllRegions(): Promise<number[]> {
    try {
      const response = await this.axiosInstance.get<number[]>('/universe/regions/');
      
      // ESI returns array of region IDs
      const regionIds = z.array(z.number()).parse(response.data);
      
      // Filter out wormhole regions (starts with 110000xx)
      return regionIds.filter(id => !id.toString().startsWith('11'));
    } catch (error) {
      if (error instanceof ESIError) throw error;
      throw new ESIError('Failed to fetch region list', 0, '/universe/regions/', false);
    }
  }
  
  async getRegionOrders(regionId: number): Promise<ESIMarketOrder[]> {
    try {
      // ESI Market Orders endpoint (paginated)
      const allOrders: ESIMarketOrder[] = [];
      let page = 1;
      let hasMorePages = true;
      
      while (hasMorePages) {
        const response = await this.axiosInstance.get(
          `/markets/${regionId}/orders/`,
          { params: { page } }
        );
        
        // Validate response with zod
        const orders = z.array(ESIMarketOrderSchema).parse(response.data);
        allOrders.push(...orders);
        
        // Check X-Pages header for pagination
        const totalPages = parseInt(response.headers['x-pages'] || '1', 10);
        hasMorePages = page < totalPages;
        page++;
      }
      
      return allOrders;
    } catch (error) {
      if (error instanceof ESIError) {
        error.context = { ...error.context, regionId };
        throw error;
      }
      throw new ESIError(
        `Failed to fetch orders for region ${regionId}`,
        0,
        `/markets/${regionId}/orders/`,
        false,
        { regionId }
      );
    }
  }
  
  async getStationName(stationId: number): Promise<string> {
    try {
      const response = await this.axiosInstance.get(
        `/universe/stations/${stationId}/`
      );
      
      const station = ESIStationSchema.parse(response.data);
      return station.name;
    } catch (error) {
      if (error instanceof ESIError) {
        error.context = { ...error.context, stationId };
        throw error;
      }
      throw new ESIError(
        `Failed to fetch station ${stationId}`,
        0,
        `/universe/stations/${stationId}/`,
        false,
        { stationId }
      );
    }
  }
  
  async getStructureName(structureId: bigint): Promise<string | null> {
    try {
      const response = await this.axiosInstance.get(
        `/universe/structures/${structureId}/`
      );
      
      const structure = ESIStructureSchema.parse(response.data);
      return structure.name;
    } catch (error) {
      // Structures may require auth or be inaccessible - return null instead of throwing
      if (error instanceof ESIError && (error.statusCode === 403 || error.statusCode === 401)) {
        return null; // Forbidden/Unauthorized - private structure
      }
      if (error instanceof ESIError && error.statusCode === 404) {
        return null; // Not found
      }
      // Other errors - log but don't crash
      console.warn(`Failed to fetch structure ${structureId}:`, error);
      return null;
    }
  }
}

// Custom error class for ESI API errors
export class ESIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public endpoint: string,
    public retryable: boolean,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'ESIError';
  }
}

// Singleton instance
export const esiClient = new ESIClient();
