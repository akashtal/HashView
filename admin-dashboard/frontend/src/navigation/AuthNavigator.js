import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

import RoleSelectionScreen from '../screens/auth/RoleSelectionScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import SignUpScreen from '../screens/auth/SignUpScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import LoginWithPhoneScreen from '../screens/auth/LoginWithPhoneScreen';
import ConfirmEmailScreen from '../screens/auth/ConfirmEmailScreen';
import VerifyOTPScreen from '../screens/auth/VerifyOTPScreen';

import BusinessDetailScreen from '../screens/user/BusinessDetailScreen';

const Stack = createStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="RoleSelection"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#2D1B69' },
      }}
    >
      <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ConfirmEmail" component={ConfirmEmailScreen} />
      <Stack.Screen name="VerifyOTP" component={VerifyOTPScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="LoginWithPhone" component={LoginWithPhoneScreen} />
      <Stack.Screen name="BusinessDetail" component={BusinessDetailScreen} />
    </Stack.Navigator>
  );
}

