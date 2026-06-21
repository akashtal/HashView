const mongoose = require('mongoose');

const customizationOptionSchema = new mongoose.Schema({
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CustomizationGroup',
    required: [true, 'CustomizationGroup reference is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Option name is required'],
    trim: true,
    maxlength: [100, 'Option name cannot exceed 100 characters']
  },
  additionalPrice: {
    type: Number,
    default: 0,
    min: [0, 'Additional price cannot be negative']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isDefault: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index to query options by group efficiently
customizationOptionSchema.index({ group: 1, sortOrder: 1 });

module.exports = mongoose.model('CustomizationOption', customizationOptionSchema);
