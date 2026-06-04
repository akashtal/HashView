/**
 * One-Time Batch Classification Script
 * ─────────────────────────────────────
 * Classifies ALL existing MenuItem documents in the database with the
 * appropriate suggestedMealTimes values using the food knowledge base.
 *
 * Run this ONCE after deploying the new MenuItem model:
 *   node ai-gateway/scripts/classify_menu_items.js
 *
 * Safe to run multiple times (idempotent):
 *   - Items already classified are SKIPPED (unless --force flag is passed)
 *   - Items classified as "all-day" are re-classified (may need updating)
 *
 * Usage:
 *   node classify_menu_items.js            → Skip already classified items
 *   node classify_menu_items.js --force    → Re-classify ALL items
 *   node classify_menu_items.js --dry-run  → Show what WOULD be changed without saving
 *
 * Expected runtime: ~1-5 seconds per 1000 items (pure in-memory, no AI calls)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { classifyMealTime } = require('../utils/meal_classifier');

// Parse flags
const FORCE   = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

const BATCH_SIZE = 200; // Process 200 items at a time to avoid memory issues

async function run() {
  // Connect to MongoDB
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGO_URI not set in environment. Check your .env file.');
    process.exit(1);
  }

  console.log(`\n🍽️  HashView — Menu Item Meal-Time Classifier`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no saves)' : FORCE ? 'FORCE (re-classify all)' : 'INCREMENTAL (skip classified)'}\n`);

  await mongoose.connect(mongoUri);
  console.log('✅ Connected to MongoDB\n');

  const MenuItem = mongoose.model('MenuItem', require('../../models/MenuItem.model.js').schema);

  // Build query — either all items or only unclassified/all-day ones
  const query = FORCE
    ? { type: { $in: ['food', 'drink'] } }
    : {
        type: { $in: ['food', 'drink'] },
        $or: [
          { suggestedMealTimes: { $exists: false } },
          { suggestedMealTimes: { $size: 0 } },
          { suggestedMealTimes: ['all-day'] }, // Re-check all-day items (may be more specific)
        ],
      };

  const totalCount = await MenuItem.countDocuments(query);
  console.log(`📊 Items to classify: ${totalCount}\n`);

  if (totalCount === 0) {
    console.log('✅ Nothing to classify. All items are already classified.');
    await mongoose.disconnect();
    return;
  }

  let processed = 0;
  let updated   = 0;
  let skipped   = 0;
  let errors    = 0;

  // Stats by meal time
  const stats = { breakfast: 0, lunch: 0, dinner: 0, 'all-day': 0, multi: 0 };

  // Process in batches
  let cursor = MenuItem.find(query)
    .select('name description tags menuCategory type availableTimeSlots suggestedMealTimes')
    .cursor();

  const batch = [];

  for await (const item of cursor) {
    const classified = classifyMealTime({
      name:               item.name,
      description:        item.description,
      tags:               item.tags || [],
      menuCategory:       item.menuCategory,
      type:               item.type,
      availableTimeSlots: item.availableTimeSlots || [],
    });

    const current = (item.suggestedMealTimes || []).sort().join(',');
    const next    = classified.sort().join(',');

    if (!DRY_RUN && current !== next) {
      batch.push({
        updateOne: {
          filter: { _id: item._id },
          update: { $set: { suggestedMealTimes: classified } },
        },
      });
      updated++;
    } else if (current === next) {
      skipped++;
    }

    // Track stats
    if (classified.length > 1) stats.multi++;
    else stats[classified[0]] = (stats[classified[0]] || 0) + 1;

    processed++;

    // Execute batch
    if (batch.length >= BATCH_SIZE) {
      if (!DRY_RUN) {
        try {
          await MenuItem.bulkWrite(batch, { ordered: false });
        } catch (err) {
          console.error(`⚠️  Batch write error: ${err.message.slice(0, 100)}`);
          errors++;
        }
        batch.length = 0;
      }

      const pct = Math.round((processed / totalCount) * 100);
      process.stdout.write(`\r   Progress: ${processed}/${totalCount} (${pct}%)  `);
    }
  }

  // Final batch
  if (!DRY_RUN && batch.length > 0) {
    try {
      await MenuItem.bulkWrite(batch, { ordered: false });
    } catch (err) {
      console.error(`\n⚠️  Final batch write error: ${err.message.slice(0, 100)}`);
      errors++;
    }
  }

  console.log(`\n\n✅ Done!\n`);
  console.log(`   Processed: ${processed} items`);
  console.log(`   Updated:   ${updated} items`);
  console.log(`   Skipped:   ${skipped} items (already correct)`);
  if (errors > 0) console.log(`   Errors:    ${errors}`);
  console.log(`\n📊 Meal-time breakdown:`);
  console.log(`   🌅 Breakfast: ${stats.breakfast}`);
  console.log(`   ☀️  Lunch:     ${stats.lunch}`);
  console.log(`   🌙 Dinner:    ${stats.dinner}`);
  console.log(`   🕐 All-day:   ${stats['all-day']}`);
  console.log(`   🔀 Multiple:  ${stats.multi}`);

  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
}

run().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
