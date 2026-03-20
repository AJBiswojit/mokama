/**
 * Drops stale/ghost indexes that can cause E11000 duplicate key errors.
 * Called once after MongoDB connects.
 */
const dropStaleIndexes = async (mongoose) => {
  try {
    const db = mongoose.connection.db;

    const collections = ['employers', 'workers', 'jobs', 'jobrequests', 'notifications'];

    for (const colName of collections) {
      try {
        const col = db.collection(colName);
        const indexes = await col.indexes();

        for (const idx of indexes) {
          // Drop any index that references a field not in our schema
          const staleFields = ['employerId', 'workerId', 'jobId'];
          const idxKeys = Object.keys(idx.key || {});
          const isStale = idxKeys.some(k => staleFields.includes(k));

          if (isStale) {
            await col.dropIndex(idx.name);
            console.log(`🗑️  Dropped stale index "${idx.name}" on ${colName}`);
          }
        }
      } catch (e) {
        // Collection may not exist yet — that's fine
      }
    }
  } catch (err) {
    console.warn('⚠️  Index cleanup warning:', err.message);
  }
};

module.exports = dropStaleIndexes;
