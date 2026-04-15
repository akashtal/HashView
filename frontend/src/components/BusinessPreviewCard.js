import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import COLORS from '../config/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * BusinessPreviewCard
 *
 * Pixel-perfect mirror of UserHomeScreen's BusinessCard.
 * Accepts local state so owners can preview how their listing looks
 * BEFORE submitting. Works with both local file:// and https:// URIs.
 *
 * Key fix: the <Image> has a `key` prop tied to `coverImageUri`,
 * which forces React Native to destroy & recreate the Image component
 * whenever the URI changes — bypassing any in-memory cache.
 */
const BusinessPreviewCard = ({
  name,
  category,
  coverImageUri,
  address,
  isFullScreen = false,
}) => {
  const cardWidth = isFullScreen ? SCREEN_WIDTH - 32 : '100%';

  return (
    <View style={[styles.card, { width: cardWidth }]}>

      {/* ── Cover Image ───────────────────────────────────── */}
      <View style={styles.coverWrapper}>
        {coverImageUri ? (
          // key prop forces full remount when URI changes → no stale cache
          <Image
            key={coverImageUri}
            source={{ uri: coverImageUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark || '#3b0080']}
            style={[StyleSheet.absoluteFill, styles.coverPlaceholder]}
          >
            <Icon name="business-outline" size={40} color="rgba(255,255,255,0.4)" />
            <Text style={styles.coverPlaceholderText}>Upload a cover photo</Text>
          </LinearGradient>
        )}

        {/* Gradient overlay — matches real card */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />

        {/* ★ Rating badge — top right */}
        <View style={styles.ratingBadge}>
          <Icon name="star" size={12} color="#F4B400" />
          <Text style={styles.ratingText}>New</Text>
        </View>

        {/* 👁 PREVIEW label — top left, subtle */}
        <View style={styles.previewLabel}>
          <Icon name="eye-outline" size={9} color="rgba(255,255,255,0.9)" />
          <Text style={styles.previewLabelText}>PREVIEW</Text>
        </View>
      </View>

      {/* ── Info Section ──────────────────────────────────── */}
      <View style={styles.infoSection}>
        {/* Name + location */}
        <Text style={styles.businessName} numberOfLines={1}>
          {name && name.trim() ? name : 'Business Name'}
        </Text>
        <View style={styles.locationRow}>
          <Icon name="location-outline" size={12} color="#5e399e" style={{ opacity: 0.7 }} />
          <Text style={styles.locationText} numberOfLines={1}>
            {address && address.trim() ? address : 'City, Country'}
          </Text>
        </View>

        {/* Badges */}
        <View style={styles.badgesRow}>
          <View style={styles.categoryPill}>
            <Text style={styles.categoryLabel} numberOfLines={1}>
              {category && category.trim() ? category : 'Category'}
            </Text>
          </View>
          <View style={styles.unclaimedBadge}>
            <Icon name="flag-outline" size={9} color="#B45309" />
            <Text style={styles.unclaimedText}>Unclaimed</Text>
          </View>
        </View>
      </View>

      {/* ── Ratings section ───────────────────────────────── */}
      <View style={styles.ratingsSection}>
        <View style={styles.ratingsHeader}>
          <Text style={styles.ratingsLabel}>Overall Rating</Text>
          <Text style={styles.ratingsCount}>0 reviews</Text>
        </View>
        <View style={styles.googleRow}>
          <Icon name="logo-google" size={14} color="#3B82F6" />
          <Text style={styles.googleLabel}>Google</Text>
          <View style={{ flex: 1 }} />
          <Icon name="star" size={12} color="#F4B400" />
          <Text style={styles.googleValue}>N/A</Text>
          <Text style={styles.googleCount}>  (0)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#5e399e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },

  // ── Cover ──────────────────────────────────────────────
  coverWrapper: {
    height: 144,
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  coverPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '500',
  },

  // Rating badge — top right
  ratingBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#5e399e',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  ratingText: {
    color: '#F4B400',
    fontWeight: '700',
    fontSize: 11,
    marginLeft: 3,
  },

  // Preview label — top left
  previewLabel: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(0,0,0,0.50)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    gap: 3,
  },
  previewLabelText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.8,
  },

  // ── Info ───────────────────────────────────────────────
  infoSection: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5e399e',
    marginBottom: 3,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  locationText: {
    fontSize: 12,
    color: '#5e399e',
    opacity: 0.8,
    marginLeft: 3,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryPill: {
    backgroundColor: '#FFF1E6',
    borderColor: '#FCD9BD',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#e6ba4c',
  },
  unclaimedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unclaimedText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#B45309',
  },

  // ── Ratings ────────────────────────────────────────────
  ratingsSection: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  ratingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  ratingsLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#111827',
  },
  ratingsCount: {
    fontSize: 11,
    color: '#6B7280',
  },
  googleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  googleLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#111827',
    marginLeft: 5,
  },
  googleValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
    marginLeft: 3,
  },
  googleCount: {
    fontSize: 11,
    color: '#6B7280',
  },
});

export default BusinessPreviewCard;
