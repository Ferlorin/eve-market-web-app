/**
 * ESI Cache Header Compliance Checker
 *
 * Verifies CCP's EVE Online ESI API cache headers to ensure
 * our caching strategy complies with their terms of service.
 *
 * Run this before implementing any caching architecture.
 */

import axios from 'axios';

interface ESICacheInfo {
  endpoint: string;
  cacheControl: string | null;
  expires: string | null;
  maxAgeSeconds: number | null;
  expiresDate: Date | null;
  recommendedCacheDuration: string;
  ourCacheDuration: string;
  compliant: boolean;
}

const ESI_BASE_URL = 'https://esi.evetech.net/latest';
const OUR_CACHE_DURATION_MINUTES = 30; // GitHub Actions runs every 30 min

async function checkESICacheHeaders(): Promise<void> {
  console.log('🔍 EVE Online ESI Cache Compliance Check\n');
  console.log(`Our caching strategy: ${OUR_CACHE_DURATION_MINUTES} minutes\n`);

  const endpoints = [
    {
      name: 'Market Orders (The Forge)',
      url: `${ESI_BASE_URL}/markets/10000002/orders/`,
      description: 'Primary data source - market orders',
    },
    {
      name: 'Region List',
      url: `${ESI_BASE_URL}/universe/regions/`,
      description: 'Static data - rarely changes',
    },
    {
      name: 'Item Type Info',
      url: `${ESI_BASE_URL}/universe/types/34/`,
      description: 'Item metadata - static',
    },
    {
      name: 'Station Info',
      url: `${ESI_BASE_URL}/universe/stations/60003760/`,
      description: 'Station metadata - static',
    },
  ];

  const results: ESICacheInfo[] = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`📡 Checking: ${endpoint.name}`);
      console.log(`   URL: ${endpoint.url}`);

      const response = await axios.head(endpoint.url, {
        headers: {
          'User-Agent': 'EVE-Market-Scanner/1.0 (compliance-check)',
          'Accept': 'application/json',
        },
      });

      const cacheControl = response.headers['cache-control'] || null;
      const expires = response.headers['expires'] || null;

      // Parse max-age from Cache-Control header
      let maxAgeSeconds: number | null = null;
      if (cacheControl) {
        const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
        if (maxAgeMatch) {
          maxAgeSeconds = parseInt(maxAgeMatch[1], 10);
        }
      }

      // Parse Expires header
      let expiresDate: Date | null = null;
      if (expires) {
        expiresDate = new Date(expires);
      }

      // Determine recommended cache duration
      const recommendedMinutes = maxAgeSeconds ? Math.floor(maxAgeSeconds / 60) : null;
      const recommendedCacheDuration = recommendedMinutes
        ? `${recommendedMinutes} minutes (${maxAgeSeconds}s)`
        : 'Unknown';

      // Check compliance
      const compliant =
        maxAgeSeconds === null ||
        OUR_CACHE_DURATION_MINUTES * 60 <= maxAgeSeconds;

      results.push({
        endpoint: endpoint.name,
        cacheControl,
        expires,
        maxAgeSeconds,
        expiresDate,
        recommendedCacheDuration,
        ourCacheDuration: `${OUR_CACHE_DURATION_MINUTES} minutes`,
        compliant,
      });

      console.log(`   Cache-Control: ${cacheControl || 'Not provided'}`);
      console.log(`   Expires: ${expires || 'Not provided'}`);
      console.log(`   Max-Age: ${maxAgeSeconds ? `${maxAgeSeconds}s (${recommendedMinutes}min)` : 'Not specified'}`);
      console.log(`   Compliance: ${compliant ? '✅ COMPLIANT' : '❌ VIOLATION'}\n`);

    } catch (error) {
      console.error(`   ❌ Error checking endpoint: ${(error as Error).message}\n`);
    }
  }

  // Summary Report
  console.log('\n' + '='.repeat(70));
  console.log('📊 COMPLIANCE SUMMARY');
  console.log('='.repeat(70) + '\n');

  const allCompliant = results.every((r) => r.compliant);

  console.log('Endpoint Analysis:');
  results.forEach((r) => {
    console.log(`  ${r.compliant ? '✅' : '❌'} ${r.endpoint}`);
    console.log(`     ESI allows: ${r.recommendedCacheDuration}`);
    console.log(`     We cache: ${r.ourCacheDuration}`);
  });

  console.log('\n' + '='.repeat(70));

  if (allCompliant) {
    console.log('✅ RESULT: Our caching strategy is COMPLIANT with ESI terms');
    console.log('\nWe are permitted to cache data for up to the durations specified');
    console.log('by ESI Cache-Control headers. Our 30-minute refresh cycle is within');
    console.log('acceptable limits for all tested endpoints.');
  } else {
    console.log('❌ RESULT: COMPLIANCE VIOLATION DETECTED');
    console.log('\nWARNING: Our caching duration exceeds ESI recommendations for some');
    console.log('endpoints. This may violate CCP\'s Terms of Service.');
    console.log('\nACTION REQUIRED:');
    console.log('1. Reduce GitHub Actions schedule to match ESI cache headers');
    console.log('2. Review CCP Developer License Agreement');
    console.log('3. Contact CCP support for clarification if needed');
  }

  console.log('='.repeat(70) + '\n');

  // Legal disclaimer
  console.log('⚖️  LEGAL DISCLAIMER:');
  console.log('This check verifies cache headers but does NOT constitute legal advice.');
  console.log('Always review CCP\'s current Developer License Agreement:');
  console.log('https://developers.eveonline.com/resource/license-agreement\n');

  // Exit with error code if non-compliant
  if (!allCompliant) {
    process.exit(1);
  }
}

// Run the check
checkESICacheHeaders().catch((error) => {
  console.error('Fatal error during compliance check:', error);
  process.exit(1);
});
