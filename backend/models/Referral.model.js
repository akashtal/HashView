/**
 * Referral Audit Model
 *
 * Tracks each completed referral event: who referred whom, which code was used,
 * and the current status. This is the primary hook point for a future reward engine.
 *
 * Design principles:
 *  - One document per referral relationship (referrer → referee pair is unique)
 *  - Status flow: 'pending' → 'completed' (future: 'rewarded')
 *  - All future reward/campaign data should be added to THIS model as new fields,
 *    not in a separate collection — keeps the audit trail self-contained.
 *
 * Future fields to add when implementing rewards:
 *   rewardGranted:    Boolean
 *   rewardAmount:     Number
 *   rewardCurrency:   String  ('coins' | 'GBP' | etc.)
 *   rewardGrantedAt:  Date
 *   campaign:         String  (e.g. 'summer2025')
 */

const mongoose = require('mongoose');

const referralSchema = new mongoose.Schema(
  {
    // The user who shared their code
    referrer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // The newly registered user who used the code
    referee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // A user can only be referred once
    },

    // The exact code that was used
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true
    },

    // Lifecycle status
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending'
    },

    // Set when the referee completes their first meaningful action
    // (for now: set immediately at registration — future: first order/review)
    completedAt: {
      type: Date,
      default: null
    }

    // ────────────────────────────────────────────────────────────────────────
    // Future reward fields (add here, do NOT create a separate collection):
    // rewardGranted:   { type: Boolean, default: false }
    // rewardAmount:    { type: Number,  default: 0 }
    // rewardGrantedAt: { type: Date,    default: null }
    // campaign:        { type: String,  default: null }
    // ────────────────────────────────────────────────────────────────────────
  },
  {
    timestamps: true
  }
);

// Compound index: fast lookup of all referrals made by a given user
referralSchema.index({ referrer: 1, createdAt: -1 });

module.exports = mongoose.model('Referral', referralSchema);
