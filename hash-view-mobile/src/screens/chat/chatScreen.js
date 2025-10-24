import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

export default function $(echo $screen | sed 's/Screen//')Screen() {
  return (
    <View style={styles.container}>
      <Text>$(echo $screen | sed 's/Screen//') Screen - Coming Soon!</Text>
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
