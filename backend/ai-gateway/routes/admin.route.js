/**
 * AI Gateway — Admin Route
 * POST /ai/admin/classify-menu-items
 *
 * Triggers batch meal-time classification of all existing MenuItem documents.
 * Uses the in-memory food classifier — no external AI calls.
 *
 * This endpoint exists because the standalone classify_menu_items.js script
 * needs the running server's MongoDB connection (Atlas DNS requires the server's
 * network context).
 *
 * Protected: requires a valid admin token header.
 *
 * Request body (optional):
 *   { "force": true }   — Re-classify all items (default: only unclassified)
 *
 * Response:
 *   { success, processed, updated, skipped, stats }
 */

const express = require('express');
const router  = express.Router();
const mongoose = require('mongoose');
const { classifyMealTime } = require('../utils/meal_classifier');

// Simple secret check — use the same admin secret as the rest of the admin routes
function checkAdminSecret(req, res) {
  const secret = req.headers['x-admin-secret'] || req.query.secret;
  const expected = process.env.ADMIN_SECRET || process.env.JWT_SECRET;
  if (!expected || secret !== expected) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

/**
 * POST /ai/admin/classify-menu-items
 * Batch-classify all existing menu items with suggestedMealTimes.
 */
router.post('/classify-menu-items', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;

  const force = req.body?.force === true;
  const BATCH_SIZE = 200;

  try {
    const MenuItem = mongoose.model('MenuItem');

    const query = force
      ? { type: { $in: ['food', 'drink'] } }
      : {
          type: { $in: ['food', 'drink'] },
          $or: [
            { suggestedMealTimes: { $exists: false } },
            { suggestedMealTimes: { $size: 0 } },
            { suggestedMealTimes: ['all-day'] },
          ],
        };

    const totalCount = await MenuItem.countDocuments(query);
    const stats = { breakfast: 0, lunch: 0, dinner: 0, 'all-day': 0 };
    let updated = 0, skipped = 0;

    const cursor = MenuItem.find(query)
      .select('name description tags menuCategory type availableTimeSlots suggestedMealTimes')
      .cursor();

    let batch = [];

    for await (const item of cursor) {
      const classified = classifyMealTime({
        name:               item.name,
        description:        item.description,
        tags:               item.tags || [],
        menuCategory:       item.menuCategory,
        type:               item.type,
        availableTimeSlots: item.availableTimeSlots || [],
      });

      const current = (item.suggestedMealTimes || []).slice().sort().join(',');
      const next    = classified.slice().sort().join(',');

      if (current !== next) {
        batch.push({
          updateOne: {
            filter: { _id: item._id },
            update: { $set: { suggestedMealTimes: classified } },
          },
        });
        updated++;
      } else {
        skipped++;
      }

      for (const mt of classified) {
        stats[mt] = (stats[mt] || 0) + 1;
      }

      if (batch.length >= BATCH_SIZE) {
        await MenuItem.bulkWrite(batch, { ordered: false });
        batch = [];
      }
    }

    if (batch.length > 0) {
      await MenuItem.bulkWrite(batch, { ordered: false });
    }

    console.log(`[AI Admin] classify-menu-items: ${totalCount} processed, ${updated} updated, ${skipped} skipped`);

    return res.json({
      success: true,
      total: totalCount,
      updated,
      skipped,
      stats,
    });

  } catch (err) {
    console.error('[AI Admin] classify-menu-items error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /ai/admin/classify-menu-items/preview
 * Preview what would be classified (no writes).
 */
router.get('/classify-menu-items/preview', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;

  const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);

  try {
    const MenuItem = mongoose.model('MenuItem');
    const items = await MenuItem.find(
      { type: { $in: ['food', 'drink'] } },
      'name menuCategory suggestedMealTimes type availableTimeSlots description tags'
    ).limit(limit).lean();

    const preview = items.map(item => {
      const current = item.suggestedMealTimes || [];
      const proposed = classifyMealTime({
        name:               item.name,
        description:        item.description,
        tags:               item.tags || [],
        menuCategory:       item.menuCategory,
        type:               item.type,
        availableTimeSlots: item.availableTimeSlots || [],
      });
      return {
        name:     item.name,
        category: item.menuCategory || '(none)',
        current:  current.join(', ') || '(unclassified)',
        proposed: proposed.join(', '),
        changed:  current.sort().join(',') !== proposed.sort().join(','),
      };
    });

    return res.json({ success: true, count: preview.length, preview });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /ai/admin/cache
 * Flush all AI search Redis cache entries (ai:search:v4:*).
 * Call this after creating new businesses or categories to make them
 * immediately discoverable without waiting for the 5-minute TTL.
 */
router.delete('/cache', async (req, res) => {
  if (!checkAdminSecret(req, res)) return;

  try {
    let redis;
    try {
      redis = require('../../config/redis');
    } catch {
      return res.json({ success: true, deleted: 0, message: 'Redis not configured — no cache to clear' });
    }

    // Use SCAN to find all ai:search:v4:* keys without blocking
    const client = redis._client || redis.client;
    if (!client || typeof client.scan !== 'function') {
      return res.json({ success: true, deleted: 0, message: 'Redis scan not available — cache will expire in ≤5 minutes' });
    }

    let cursor = '0';
    let deleted = 0;
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', 'ai:search:v4:*', 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length > 0) {
        await client.del(...keys);
        deleted += keys.length;
      }
    } while (cursor !== '0');

    return res.json({ success: true, deleted, message: `Cleared ${deleted} AI search cache entries` });

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
