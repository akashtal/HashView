const mongoose = require('mongoose');
const Category = require('./models/Category.model');
const Business = require('./models/Business.model');

async function test() {
  try {
    await mongoose.connect('mongodb+srv://admin:hashview-auth@cluster0.e8s1a.mongodb.net/hashview?retryWrites=true&w=majority');
    const categories = await Category.find({}, 'name slug');
    console.log("Categories in DB:");
    console.log(categories);

    const businessCategories = await Business.distinct('category');
    console.log("\nDistinct categories used in Businesses:");
    console.log(businessCategories);
  } catch (err) {
    console.error(err);
  } finally {
    mongoose.disconnect();
  }
}
test();
