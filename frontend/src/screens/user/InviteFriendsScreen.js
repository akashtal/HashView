/**
 * InviteFriendsScreen
 *
 * Premium invite/referral UI for HashView. Allows users to:
 *  - View their unique referral code and link
 *  - Copy either to clipboard
 *  - Share via the device's native share sheet (WhatsApp, SMS, etc.)
 *  - Scan / show QR code
 *
 * Design: matches HashView palette (purple primary, orange secondary).
 * No rewards are shown — the UI is purely for sharing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Share,
  Clipboard,
  Platform,
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import QRCode from 'react-native-qrcode-svg';

import ReferralService from '../../services/referral.service';
import COLORS from '../../config/colors';

// ─── Constants ────────────────────────────────────────────────────────────────

const SHARE_MESSAGE = (link) =>
  `🍽️ I'm using HashView to discover amazing restaurants and food near me.\n\nDownload HashView using my invitation link:\n${link}`;

// ─── Small Components ─────────────────────────────────────────────────────────

/** Animated checkmark that bounces in when copy succeeds */
function CopiedBadge({ visible }) {
  const opacity = React.useRef(new Animated.Value(0)).current;
  const scale   = React.useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1,   useNativeDriver: true, tension: 180, friction: 6 }),
        Animated.timing(opacity, { toValue: 1,   useNativeDriver: true, duration: 150 }),
      ]).start();
    } else {
      Animated.timing(opacity, { toValue: 0, useNativeDriver: true, duration: 200 }).start(() => {
        scale.setValue(0.6);
      });
    }
  }, [visible]);

  return (
    <Animated.View style={[styles.copiedBadge, { opacity, transform: [{ scale }] }]}>
      <Icon name="checkmark-circle" size={14} color="#fff" />
      <Text style={styles.copiedBadgeText}>Copied!</Text>
    </Animated.View>
  );
}

/** Tappable card that shows a value and a copy button */
function InfoCard({ label, value, onCopy, copied, icon }) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardHeader}>
        <View style={styles.infoCardIcon}>
          <Icon name={icon} size={16} color={COLORS.secondary} />
        </View>
        <Text style={styles.infoCardLabel}>{label}</Text>
      </View>
      <View style={styles.infoCardRow}>
        <Text style={styles.infoCardValue} numberOfLines={1} selectable>
          {value}
        </Text>
        <TouchableOpacity
          style={styles.copyBtn}
          onPress={onCopy}
          activeOpacity={0.75}
        >
          <Icon name={copied ? 'checkmark' : 'copy-outline'} size={16} color={COLORS.primary} />
          <Text style={styles.copyBtnText}>{copied ? 'Copied' : 'Copy'}</Text>
        </TouchableOpacity>
      </View>
      <CopiedBadge visible={copied} />
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function InviteFriendsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useSelector((s) => s.auth);

  const [referral,      setReferral]      = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [copiedCode,    setCopiedCode]    = useState(false);
  const [copiedLink,    setCopiedLink]    = useState(false);
  const [sharing,       setSharing]       = useState(false);
  const [showQR,        setShowQR]        = useState(false);

  // ─── Load referral data ─────────────────────────────────────────────────────
  useEffect(() => {
    loadReferral();
  }, []);

  const INVITE_BASE = 'https://hashview.app/invite';

  // Generate a local referral code from the user's name (fallback if backend not deployed)
  const generateLocalCode = useCallback(() => {
    const namePrefix = (user?.name || 'USER')
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 8);
    const suffix = String(1000 + ((user?._id?.charCodeAt(0) || 0) * 97 + 1234) % 9000);
    return `${namePrefix}${suffix}`;
  }, [user]);

  const loadReferral = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await ReferralService.getMyReferral();
      setReferral(res.referral);
    } catch (err) {
      // If backend doesn't have the route yet (404 / network), fall back gracefully
      // to a locally-generated code so the screen is still fully usable
      const errMsg = err?.message || '';
      const isNotFound = errMsg.includes('404') || errMsg.includes('Not Found') || errMsg.includes('not found') || errMsg.includes('Cannot GET');
      if (isNotFound || errMsg.includes('Network') || errMsg.includes('network')) {
        const code = generateLocalCode();
        const link = `${INVITE_BASE}/${code}`;
        setReferral({ code, link, invitedBy: null, invitedAt: null, isLocal: true });
      } else {
        setError(errMsg || 'Failed to load referral info');
      }
    } finally {
      setLoading(false);
    }
  };

  // ─── Copy helpers ───────────────────────────────────────────────────────────
  const copyWithFeedback = useCallback(async (text, setter) => {
    try {
      Clipboard.setString(text);
      setter(true);
      setTimeout(() => setter(false), 2500);
    } catch {
      // Non-fatal — clipboard unavailable
    }
  }, []);

  // ─── Share sheet ────────────────────────────────────────────────────────────
  const handleShare = useCallback(async () => {
    if (!referral?.link || sharing) return;
    try {
      setSharing(true);
      await Share.share({
        message: SHARE_MESSAGE(referral.link),
        url:     referral.link,  // iOS uses url for rich previews
        title:   'Join me on HashView!',
      });
    } catch (err) {
      // User dismissed — not an error
    } finally {
      setSharing(false);
    }
  }, [referral, sharing]);

  // ─── Render states ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading your invite code…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="warning-outline" size={48} color={COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={loadReferral}>
          <Text style={styles.retryBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F5FF' }}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      {/* ── Header ── */}
      <LinearGradient
        colors={[COLORS.primary, '#3D1B79']}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Invite Friends</Text>
          <Text style={styles.headerSub}>Share HashView with people you love</Text>
        </View>
      </LinearGradient>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero illustration ── */}
        <View style={styles.heroCard}>
          <LinearGradient
            colors={['#F3EEFF', '#FFF9F0']}
            style={styles.heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.heroIconCircle}>
              <Icon name="people" size={36} color={COLORS.primary} />
            </View>
            <Text style={styles.heroTitle}>Invite your friends!</Text>
            <Text style={styles.heroBody}>
              Share your unique code or link. When a friend joins HashView, you'll be connected! 🎉
            </Text>
          </LinearGradient>
        </View>

        {/* ── Referral Code card ── */}
        <InfoCard
          label="Your Referral Code"
          icon="barcode-outline"
          value={referral?.code || '—'}
          onCopy={() => copyWithFeedback(referral.code, setCopiedCode)}
          copied={copiedCode}
        />

        {/* ── Referral Link card ── */}
        <InfoCard
          label="Your Invite Link"
          icon="link-outline"
          value={referral?.link || '—'}
          onCopy={() => copyWithFeedback(referral.link, setCopiedLink)}
          copied={copiedLink}
        />

        {/* ── QR Code toggle ── */}
        <TouchableOpacity
          style={styles.qrToggleBtn}
          onPress={() => setShowQR((v) => !v)}
          activeOpacity={0.8}
        >
          <Icon name={showQR ? 'qr-code' : 'qr-code-outline'} size={20} color={COLORS.primary} />
          <Text style={styles.qrToggleText}>{showQR ? 'Hide QR Code' : 'Show QR Code'}</Text>
          <Icon name={showQR ? 'chevron-up' : 'chevron-down'} size={18} color={COLORS.primary} />
        </TouchableOpacity>

        {showQR && referral?.link && (
          <View style={styles.qrCard}>
            <Text style={styles.qrLabel}>Scan to join HashView</Text>
            <View style={styles.qrWrapper}>
              <QRCode
                value={referral.link}
                size={180}
                color={COLORS.primary}
                backgroundColor="#fff"
              />
            </View>
            <Text style={styles.qrCode}>{referral.code}</Text>
          </View>
        )}

        {/* ── Invite friends button ── */}
        <TouchableOpacity
          style={[styles.shareBtn, sharing && { opacity: 0.7 }]}
          onPress={handleShare}
          activeOpacity={0.85}
          disabled={sharing}
        >
          <LinearGradient
            colors={[COLORS.secondary, '#E67800']}
            style={styles.shareBtnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {sharing ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="share-social" size={22} color="#fff" />
                <Text style={styles.shareBtnText}>Invite Friends</Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* ── Channel hints ── */}
        <View style={styles.channelRow}>
          {['logo-whatsapp', 'mail', 'chatbubble-ellipses', 'logo-instagram', 'logo-linkedin'].map(
            (icon, i) => (
              <View key={i} style={styles.channelIcon}>
                <Icon name={icon} size={22} color={COLORS.gray400} />
              </View>
            )
          )}
          <Text style={styles.channelHint}>+ more</Text>
        </View>
        <Text style={styles.channelLabel}>
          Share via any app on your device
        </Text>

        {/* ── How it works ── */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>How it works</Text>
          {[
            { icon: 'share-outline',    text: 'Share your code or link with friends' },
            { icon: 'download-outline', text: 'Friend downloads HashView' },
            { icon: 'person-add-outline', text: 'They enter your code at sign-up' },
            { icon: 'checkmark-circle-outline', text: 'You\'re connected on HashView!' },
          ].map((step, i) => (
            <View key={i} style={styles.howRow}>
              <View style={styles.howStep}>
                <Text style={styles.howStepNum}>{i + 1}</Text>
              </View>
              <Icon name={step.icon} size={20} color={COLORS.secondary} style={{ marginRight: 10 }} />
              <Text style={styles.howText}>{step.text}</Text>
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F8F5FF', padding: 32,
  },
  loadingText: { marginTop: 16, color: COLORS.gray500, fontSize: 14 },
  errorText:   { marginTop: 12, color: COLORS.error, fontSize: 15, textAlign: 'center' },
  retryBtn: {
    marginTop: 20, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: COLORS.primary, borderRadius: 12,
  },
  retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingBottom: 20,
    gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: '800' },
  headerSub:   { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  scroll: { padding: 16, gap: 12 },

  // Hero
  heroCard: {
    borderRadius: 20, overflow: 'hidden',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 12, elevation: 4,
    marginBottom: 4,
  },
  heroGradient: { padding: 24, alignItems: 'center' },
  heroIconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12, shadowRadius: 8, elevation: 3,
  },
  heroTitle: {
    fontSize: 22, fontWeight: '800', color: COLORS.primary,
    marginBottom: 8, textAlign: 'center',
  },
  heroBody: {
    fontSize: 14, color: COLORS.gray600,
    lineHeight: 22, textAlign: 'center',
  },

  // Info cards
  infoCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginBottom: 4,
  },
  infoCardHeader: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8,
  },
  infoCardIcon: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#FFF9F0',
    alignItems: 'center', justifyContent: 'center',
  },
  infoCardLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray500, textTransform: 'uppercase', letterSpacing: 0.5 },
  infoCardRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  infoCardValue: {
    flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.primary,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F3EEFF', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 10,
  },
  copyBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  // Copied badge
  copiedBadge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.success, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  copiedBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  // QR toggle
  qrToggleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
    marginBottom: 4,
  },
  qrToggleText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.primary },

  // QR card
  qrCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 24,
    alignItems: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
    marginBottom: 4,
  },
  qrLabel:   { fontSize: 13, color: COLORS.gray500, marginBottom: 16 },
  qrWrapper: {
    padding: 16, backgroundColor: '#fff', borderRadius: 16,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  qrCode: {
    marginTop: 16, fontSize: 22, fontWeight: '800',
    color: COLORS.primary, letterSpacing: 3,
  },

  // Share button
  shareBtn: { borderRadius: 16, overflow: 'hidden', marginTop: 4 },
  shareBtnGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 18,
  },
  shareBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Channel hints
  channelRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginTop: 12,
  },
  channelIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4, elevation: 2,
  },
  channelHint:  { fontSize: 12, color: COLORS.gray400, fontWeight: '600' },
  channelLabel: { fontSize: 12, color: COLORS.gray400, textAlign: 'center', marginTop: 6 },

  // How it works
  howCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    marginTop: 8,
  },
  howTitle: {
    fontSize: 16, fontWeight: '800', color: COLORS.primary, marginBottom: 16,
  },
  howRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 14,
  },
  howStep: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#F3EEFF',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 10,
  },
  howStepNum: { fontSize: 12, fontWeight: '800', color: COLORS.primary },
  howText:    { flex: 1, fontSize: 14, color: COLORS.gray700, lineHeight: 20 },
});
