import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function AdminDashboardScreen() {
  return (
    <View style={styles.container}>
      <Text>Admin Dashboard Screen - Coming Soon!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
