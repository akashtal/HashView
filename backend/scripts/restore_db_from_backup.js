/**
 * Utility script to restore MongoDB collections from an EJSON backup folder.
 * 
 * Run using:
 *   node scripts/restore_db_from_backup.js                       (Restores from the latest backup)
 *   node scripts/restore_db_from_backup.js backup-2026-05-22-... (Restores from a specific backup folder)
 */

require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { EJSON } = require('bson');

(async () => {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUri) {
    console.error('❌ Error: MONGODB_URI or MONGO_URI not found in environment');
    process.exit(1);
  }

  const backupsParentDir = path.join(__dirname, '../backups');

  if (!fs.existsSync(backupsParentDir)) {
    console.error('❌ Error: No backups directory found. Run node scripts/backup_db.js first.');
    process.exit(1);
  }

  // Determine which backup folder to use
  let backupFolder = process.argv[2];

  if (!backupFolder) {
    // Pick the latest backup automatically
    const folders = fs.readdirSync(backupsParentDir)
      .filter(f => f.startsWith('backup-') && fs.statSync(path.join(backupsParentDir, f)).isDirectory())
      .sort((a, b) => b.localeCompare(a)); // Sort descending (latest first)

    if (folders.length === 0) {
      console.error('❌ Error: No backup folders found under backend/backups/');
      process.exit(1);
    }
    backupFolder = folders[0];
    console.log(`ℹ️ No backup folder specified. Automatically selected the latest: "${backupFolder}"`);
  }

  const backupDir = path.join(backupsParentDir, backupFolder);

  if (!fs.existsSync(backupDir)) {
    console.error(`❌ Error: Specified backup folder does not exist: ${backupDir}`);
    process.exit(1);
  }

  console.log(`\n⚠️  WARNING: Restoring will overwrite all documents in the target database: "${mongoose.connection.name || 'hashview'}"`);
  console.log(`   Source Backup: ${backupFolder}`);
  console.log('   Starting in 5 seconds... Press Ctrl+C to cancel.');
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\nConnecting to MongoDB...');
  await mongoose.connect(dbUri);
  const db = mongoose.connection.db;
  console.log('✅ Connected to MongoDB');

  // Read all JSON files in the backup folder
  const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.json') && f !== 'backup_info.json');

  console.log(`📋 Found ${files.length} collections to restore.`);

  for (const file of files) {
    const colName = path.basename(file, '.json');
    const filePath = path.join(backupDir, file);

    console.log(`\n⏳ Restoring collection: "${colName}"...`);
    const fileContent = fs.readFileSync(filePath, 'utf8');

    // Parse BSON EJSON to restore ObjectIds and Dates correctly
    const docs = EJSON.parse(fileContent);
    console.log(`   Read ${docs.length} document(s) from backup.`);

    // Clear existing documents in the collection (preserves indexes, unlike dropping the collection)
    const clearResult = await db.collection(colName).deleteMany({});
    console.log(`   Cleared ${clearResult.deletedCount} existing document(s).`);

    if (docs.length > 0) {
      const insertResult = await db.collection(colName).insertMany(docs);
      console.log(`   Restored ${insertResult.insertedCount} document(s) successfully.`);
    } else {
      console.log('   Collection was empty in backup. No documents inserted.');
    }
  }

  console.log('\n==================================================');
  console.log('🎉 SUCCESS: Database restoration completed successfully!');
  console.log(`📁 Source Folder: backend/backups/${backupFolder}`);
  console.log('==================================================');

  await mongoose.disconnect();
  console.log('✅ Disconnected from database.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Restore failed:', err);
  process.exit(1);
});
