const mongoose = require('mongoose');

const customizationGroupSchema = new mongoose.Schema({
  business: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Business',
    required: [true, 'Business reference is required'],
    index: true
  },
  name: {
    type: String,
    required: [true, 'Group name is required'],
    trim: true,
    maxlength: [100, 'Group name cannot exceed 100 characters']
  },
  selectionType: {
    type: String,
    enum: ['single', 'multiple'],
    required: [true, 'Selection type is required'],
    default: 'single'
  },
  isRequired: {
    type: Boolean,
    default: false
  },
  minSelections: {
    type: Number,
    default: 0,
    min: [0, 'Minimum selections cannot be negative']
  },
  maxSelections: {
    type: Number,
    default: null // null indicates unlimited (if selectionType is 'multiple')
  },
  sortOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Compound index for querying groups by business
customizationGroupSchema.index({ business: 1, sortOrder: 1 });

module.exports = mongoose.model('CustomizationGroup', customizationGroupSchema);
