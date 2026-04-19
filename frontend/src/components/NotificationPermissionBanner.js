import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * NotificationPermissionBanner
 *
 * Shows a dismissable banner when notification permission is denied.
 * Appears at the top of the app, prompting the user to go to Settings.
 *
 * Props:
 *   onDismiss      — called when user dismisses the banner
 *   onOpenSettings — called when user taps "Enable" to open device Settings
 */
export default function NotificationPermissionBanner({ onDismiss, onOpenSettings }) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>🔔</Text>
        <Text style={styles.text}>
          Enable notifications to receive offers & updates from your favourite businesses
        </Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity onPress={onDismiss} style={styles.dismissBtn}>
          <Text style={styles.dismissText}>Later</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenSettings} style={styles.enableBtn}>
          <Text style={styles.enableText}>Enable</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a0040',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#2d1066',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  text: {
    color: '#e0d4ff',
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  dismissBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  dismissText: {
    color: '#8b7ab5',
    fontSize: 13,
    fontWeight: '500',
  },
  enableBtn: {
    backgroundColor: '#6c3ce9',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  enableText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
});
