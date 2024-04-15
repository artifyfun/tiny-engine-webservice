const NodeCache = require('node-cache');
const cache = new NodeCache();
module.exports = {
  get cache() {
    return cache;
  },
  set(key, value, ttl) {
    cache.set(key, value, ttl || 15 * 60);
  },
};