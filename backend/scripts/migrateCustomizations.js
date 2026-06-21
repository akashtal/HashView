const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dns = require('dns');

// Force Node.js to use Google DNS for SRV resolution to fix ECONNREFUSED errors
dns.setServers(['8.8.8.8', '8.8.4.4']);

const MenuItem = require('../models/MenuItem.model');
const CustomizationGroup = require('../models/CustomizationGroup.model');
const CustomizationOption = require('../models/CustomizationOption.model');

// Load environment variables
dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Missing MONGODB_URI in environment variables');
  process.exit(1);
}

const migrateCustomizations = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB.');

    // Find all menu items that have modifiers or addOns but no customizationGroups yet
    const menuItems = await MenuItem.find({
      $or: [
        { modifiers: { $exists: true, $not: { $size: 0 } } },
        { addOns: { $exists: true, $not: { $size: 0 } } }
      ],
      $or: [
        { customizationGroups: { $exists: false } },
        { customizationGroups: { $size: 0 } }
      ]
    });

    console.log(`Found ${menuItems.length} menu items to migrate.`);

    let totalGroupsCreated = 0;
    let totalOptionsCreated = 0;

    for (const item of menuItems) {
      console.log(`Migrating item: ${item.name} (ID: ${item._id})`);
      const newGroupIds = [];

      // 1. Migrate modifiers
      if (item.modifiers && item.modifiers.length > 0) {
        for (const mod of item.modifiers) {
          if (!mod.name) continue;

          // Create the Customization Group
          const group = new CustomizationGroup({
            businessId: item.business,
            name: mod.name,
            isRequired: mod.isRequired || false,
            minSelections: mod.isRequired ? 1 : 0,
            maxSelections: mod.maxSelections > 0 ? mod.maxSelections : 1, // Default to 1 if not specified
            options: [] // We will push option IDs here
          });
          
          await group.save();
          totalGroupsCreated++;

          // Create the Customization Options
          if (mod.options && mod.options.length > 0) {
            for (let i = 0; i < mod.options.length; i++) {
              const opt = mod.options[i];
              if (!opt.name) continue;

              const option = new CustomizationOption({
                groupId: group._id,
                name: opt.name,
                additionalPrice: opt.price || 0,
                // Make the first option the default if the group is required and maxSelections is 1
                isDefault: (group.isRequired && group.maxSelections === 1 && i === 0),
                isActive: true
              });
              
              await option.save();
              totalOptionsCreated++;
              
              group.options.push(option._id);
            }
            await group.save(); // Save again to update the options array
          }

          newGroupIds.push(group._id);
        }
      }

      // 2. Migrate addOns
      if (item.addOns && item.addOns.length > 0) {
        // Create a single "Optional Extras" group for addOns
        const addOnsGroup = new CustomizationGroup({
          businessId: item.business,
          name: 'Optional Extras',
          isRequired: false,
          minSelections: 0,
          maxSelections: item.addOns.length, // Can select as many as there are
          options: []
        });

        await addOnsGroup.save();
        totalGroupsCreated++;

        for (const addOn of item.addOns) {
          if (!addOn.name) continue;

          const option = new CustomizationOption({
            groupId: addOnsGroup._id,
            name: addOn.name,
            additionalPrice: addOn.price || 0,
            isDefault: false,
            isActive: true
          });

          await option.save();
          totalOptionsCreated++;
          
          addOnsGroup.options.push(option._id);
        }
        
        await addOnsGroup.save();
        newGroupIds.push(addOnsGroup._id);
      }

      // Update the menu item with the new group IDs
      item.customizationGroups = newGroupIds;
      await item.save();
      console.log(`Successfully migrated ${item.name}`);
    }

    console.log('\nMigration complete!');
    console.log(`Total Menu Items updated: ${menuItems.length}`);
    console.log(`Total Customization Groups created: ${totalGroupsCreated}`);
    console.log(`Total Customization Options created: ${totalOptionsCreated}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
    process.exit(0);
  }
};

migrateCustomizations();
