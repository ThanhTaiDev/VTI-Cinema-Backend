const Redis = require('ioredis');
const Redlock = require('redlock').default || require('redlock');

let redis = null;
let redlock = null;
let redisWarned = false; // Flag to only log once

// Check if Redis is enabled (optional - can disable via env var)
const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';

// Try to create Redis client (optional - fallback to DB transaction if Redis unavailable)
if (REDIS_ENABLED) {
  try {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      retryStrategy: (times) => {
        // Stop retrying after 5 attempts
        if (times > 5) {
          if (!redisWarned) {
            console.warn('[Redis] Redis not available after 5 retries, falling back to DB transactions');
            redisWarned = true;
            redis = null;
            redlock = null;
          }
          return null; // Stop retrying
        }
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      lazyConnect: true, // Don't connect immediately
      enableOfflineQueue: false, // Don't queue commands when offline
      showFriendlyErrorStack: false, // Reduce error spam
    });

    // Create Redlock instance
    redlock = new Redlock([redis], {
      driftFactor: 0.01,
      retryCount: 3,
      retryDelay: 200,
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });

    // Try to connect (will fail silently if Redis unavailable)
    redis.connect().catch(() => {
      if (!redisWarned) {
        console.warn('[Redis] Redis not available, falling back to DB transactions');
        redisWarned = true;
      }
      redis = null;
      redlock = null;
    });

    // Handle Redis connection events (only if redis was created)
    if (redis) {
      redis.on('connect', () => {
        console.log('[Redis] Connected to Redis');
        redisWarned = false; // Reset warning flag
      });

      // Suppress error spam - only log once
      redis.on('error', (err) => {
        if (!redisWarned && err.code !== 'ECONNREFUSED') {
          console.error('[Redis] Error:', err.message);
          redisWarned = true;
        }
        // Don't set redis to null on error - allow retry
      });

      redis.on('close', () => {
        // Only log once
        if (!redisWarned) {
          console.log('[Redis] Connection closed');
        }
      });
    }
  } catch (error) {
    if (!redisWarned) {
      console.warn('[Redis] Redis initialization failed, falling back to DB transactions:', error.message);
      redisWarned = true;
    }
    redis = null;
    redlock = null;
  }
} else {
  console.log('[Redis] Redis disabled via REDIS_ENABLED=false, using DB transactions only');
}

module.exports = { redis, redlock };

