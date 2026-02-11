// Simple in-memory rate limiter per IP and identifier
const buckets = new Map();

function getKey(req, identifier) {
  const ip = (req.headers['x-forwarded-for'] || req.connection.remoteAddress || '').toString();
  return `${ip}|${identifier || 'unknown'}`;
}

module.exports = function rateLimit({ windowMs = 300000, maxPerIdentifier = 5 }) {
  return (req, res, next) => {
    try {
      const identifier = (req.body?.email || req.body?.phone || '').toString().toLowerCase();
      const key = getKey(req, identifier);
      const now = Date.now();
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { timestamps: [] };
        buckets.set(key, bucket);
      }
      // prune outside window
      bucket.timestamps = bucket.timestamps.filter(ts => now - ts < windowMs);
      if (bucket.timestamps.length >= maxPerIdentifier) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
      }
      bucket.timestamps.push(now);
      next();
    } catch (e) {
      // Fail open
      next();
    }
  };
}
