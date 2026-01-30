import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import COLORS from '../../config/colors';

export default function VerifyBusinessScreen({ navigation }) {
  useEffect(() => {
    // Redirect to dashboard immediately
    navigation.replace('BusinessDashboard');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' }}>
      <ActivityIndicator size="large" color={COLORS.primary} />
    </View>
  );
}
