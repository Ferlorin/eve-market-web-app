import { logger } from './logger';

/**
 * Database metrics tracker to monitor request counts and performance
 * Helps verify the 99% reduction in database requests
 */
class DbMetrics {
  private queryCount = 0;
  private connectionCount = 0;
  private operationCounts: Record<string, number> = {};
  private startTime = Date.now();

  incrementQuery(operation: string) {
    this.queryCount++;
    this.operationCounts[operation] = (this.operationCounts[operation] || 0) + 1;
  }

  incrementConnection() {
    this.connectionCount++;
  }

  getStats() {
    const duration = Date.now() - this.startTime;
    return {
      totalQueries: this.queryCount,
      totalConnections: this.connectionCount,
      durationMs: duration,
      durationMinutes: (duration / 1000 / 60).toFixed(2),
      queriesPerMinute: (this.queryCount / (duration / 1000 / 60)).toFixed(2),
      operationBreakdown: this.operationCounts,
    };
  }

  logStats() {
    const stats = this.getStats();

    console.log('\n' + '='.repeat(60));
    console.log('📊 DATABASE METRICS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Queries:        ${stats.totalQueries.toLocaleString()}`);
    console.log(`Total Connections:    ${stats.totalConnections}`);
    console.log(`Duration:             ${stats.durationMinutes} minutes`);
    console.log(`Queries/Minute:       ${stats.queriesPerMinute}`);
    console.log('\nOperation Breakdown:');
    Object.entries(stats.operationBreakdown)
      .sort(([, a], [, b]) => b - a)
      .forEach(([op, count]) => {
        console.log(`  ${op.padEnd(20)} ${count.toLocaleString()}`);
      });
    console.log('='.repeat(60) + '\n');

    logger.info({
      event: 'db_metrics_summary',
      ...stats
    });

    return stats;
  }

  reset() {
    this.queryCount = 0;
    this.connectionCount = 0;
    this.operationCounts = {};
    this.startTime = Date.now();
  }
}

export const dbMetrics = new DbMetrics();
