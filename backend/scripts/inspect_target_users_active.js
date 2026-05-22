require('dns').setDefaultResultOrder('ipv4first');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../models/User.model');

const TARGET_IDS = [
  '69cbd92753133c9316f1f34c',
  '69bd90840cf5632ef55f6c8b',
  '69184e88b3b38c47d4501cdb',
  '696679f6cee3b10352170731'
];

async function main() {
  const dbUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!dbUri) {
    console.error('❌ MONGODB_URI not found');
    process.exit(1);
  }

  await mongoose.connect(dbUri);
  console.log('✅ Connected to MongoDB');

  for (const id of TARGET_IDS) {
    const user = await User.findById(id);
    if (user) {
      console.log(`\nFound User ID: ${id}`);
      console.log(` - Name: "${user.name}"`);
      console.log(` - Email: "${user.email}"`);
      console.log(` - FirebaseUid: "${user.firebaseUid || 'N/A'}"`);
      console.log(` - AuthProvider: "${user.authProvider}"`);
      console.log(` - Role: "${user.role}"`);
    } else {
      console.log(`\n❌ User ID ${id} not found in DB`);
    }
  }

  await mongoose.disconnect();
}

main().catch(console.error);
