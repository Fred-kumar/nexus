const { createClient } = require('redis');
const logger = require('../utils/logger');

let redisClient;

const connectRedis = async () => {
  try {
    redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
    redisClient.on('error', (err) => logger.error('Redis error:', err));
    redisClient.on('connect', () => logger.info('✅ Redis connected'));
    await redisClient.connect();
  } catch (err) {
    logger.warn(`⚠️ Redis not available: ${err.message}. Continuing without cache.`);
    redisClient = null;
  }
};

const getRedis = () => redisClient;

const cacheSet = async (key, value, ttlSeconds = 3600) => {
  if (!redisClient) return;
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value));
  } catch (e) {}
};

const cacheGet = async (key) => {
  if (!redisClient) return null;
  try {
    const val = await redisClient.get(key);
    return val ? JSON.parse(val) : null;
  } catch (e) { return null; }
};

const cacheDel = async (key) => {
  if (!redisClient) return;
  try { await redisClient.del(key); } catch (e) {}
};

module.exports = { connectRedis, getRedis, cacheSet, cacheGet, cacheDel };
