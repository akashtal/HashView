/**
 * Utility script to perform a full backup of all MongoDB collections.
 * Uses BSON EJSON to preserve ObjectIds, Dates, and other data types correctly.
 * 
 * Run using: node scripts/backup_db.js
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

  console.log('Connecting to MongoDB...');
  await mongoose.connect(dbUri);
  const db = mongoose.connection.db;
  console.log('✅ Connected to MongoDB');

  // Fetch all collections
  const collections = await db.listCollections().toArray();
  const nonSystemCollections = collections.filter(c => !c.name.startsWith('system.'));

  console.log(`📋 Found ${nonSystemCollections.length} collections to back up.`);

  // Create timestamped backup folder
  const now = new Date();
  const timestamp = now.toISOString()
    .replace(/T/, '-')
    .replace(/:/g, '')
    .split('.')[0]; // Format: YYYY-MM-DD-HHMMSS

  const backupDirName = `backup-${timestamp}`;
  const backupParentDir = path.join(__dirname, '../backups');
  const backupDir = path.join(backupParentDir, backupDirName);

  if (!fs.existsSync(backupParentDir)) {
    fs.mkdirSync(backupParentDir, { recursive: true });
  }
  fs.mkdirSync(backupDir, { recursive: true });

  console.log(`📁 Saving backup files to: ${backupDir}`);

  const backupMeta = {
    timestamp: now.toISOString(),
    database: mongoose.connection.name,
    collections: {}
  };

  for (const col of nonSystemCollections) {
    const colName = col.name;
    console.log(`\n⏳ Backing up collection: "${colName}"...`);

    const docs = await db.collection(colName).find({}).toArray();
    console.log(`   Fetched ${docs.length} document(s).`);

    // Serialize using BSON EJSON to preserve types
    const serializedData = EJSON.stringify(docs, null, 2);
    const filePath = path.join(backupDir, `${colName}.json`);
    
    fs.writeFileSync(filePath, serializedData, 'utf8');
    console.log(`   Saved to ${colName}.json`);

    backupMeta.collections[colName] = docs.length;
  }

  // Save metadata
  fs.writeFileSync(
    path.join(backupDir, 'backup_info.json'),
    JSON.stringify(backupMeta, null, 2),
    'utf8'
  );

  console.log('\n==================================================');
  console.log('🎉 SUCCESS: Full database backup completed!');
  console.log(`📁 Backup Folder: backend/backups/${backupDirName}`);
  console.log('==================================================');

  await mongoose.disconnect();
  console.log('✅ Disconnected from database.');
  process.exit(0);
})().catch(err => {
  console.error('❌ Backup failed:', err);
  process.exit(1);
});
