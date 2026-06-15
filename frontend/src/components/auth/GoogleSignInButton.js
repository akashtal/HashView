import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import ToastService from '../../utils/ToastService';
import { Ionicons as Icon } from '@expo/vector-icons';
import auth, { GoogleAuthProvider } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import axios from 'axios';
import { API_CONFIG } from '../../config/api.config';

// Configure Google Sign-In (call once in App.js or here)
GoogleSignin.configure({
  webClientId: '728856865659-m9cj8v3oi6bmok3573d0a8a8bd8tpi9s.apps.googleusercontent.com', // From GoogleService-Info.plist CLIENT_ID
});

export default function GoogleSignInButton({ role = 'customer', style }) {
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      console.log('🔐 Starting Google Sign-In...');

      // Sign out first to force account selection picker
      try {
        await GoogleSignin.signOut();
        console.log('🔄 Signed out to show account picker');
      } catch (signOutError) {
        // Ignore error if not signed in
        console.log('ℹ️ Not previously signed in');
      }

      // Check Play Services
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Sign in with Google - this will now show account picker
      const userInfo = await GoogleSignin.signIn();
      console.log('✅ Google Sign-In successful, user:', userInfo.data?.user?.email);

      // Extract idToken from the response
      const googleIdToken = userInfo.data?.idToken;

      if (!googleIdToken) {
        throw new Error('Failed to get ID token from Google Sign-In');
      }

      console.log('🔑 Got Google ID token, creating Firebase credential...');

      // Create Firebase credential
      const googleCredential = GoogleAuthProvider.credential(googleIdToken);

      // Sign in to Firebase
      const userCredential = await auth().signInWithCredential(googleCredential);
      console.log('✅ Firebase sign-in successful');

      // Get Firebase ID token
      const firebaseIdToken = await userCredential.user.getIdToken();
      console.log('🔑 Got Firebase ID token, sending to backend...');

      // Send to backend
      const response = await axios.post(`${API_CONFIG.BASE_URL}/auth/oauth/google`, {
        idToken: firebaseIdToken,
        role, // 'customer' or 'business'
      });

      console.log('✅ Backend response received:', {
        success: response.data.success,
        userName: response.data.user?.name,
        userRole: response.data.user?.role,
        message: response.data.message,
      });

      if (response.data.success) {
        console.log('📤 Dispatching loginSuccess with:', {
          userName: response.data.user.name,
          userRole: response.data.user.role,
          userId: response.data.user.id,
        });

        // Save token and user data to Redux
        dispatch(
          loginSuccess({
            user: response.data.user,
            token: response.data.token,
          })
        );

        // Request notification permission after successful login
        setTimeout(async () => {
          try {
            const NotificationPermissionHelper =
              require('../../services/notification.service').default;
            console.log('🔔 Requesting notification permission after login...');
            await NotificationPermissionHelper.requestPermission();
          } catch (err) {
            console.log('⚠️ Could not request notification permission:', err);
          }
        }, 1000);

        ToastService.showSuccess(
          'Success!',
          `Signed in as ${response.data.user.role}: ${response.data.user.name}`
        );
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);

      if (error.code === 'SIGN_IN_CANCELLED') {
        // User cancelled sign-in
        return;
      }

      let message = 'Google Sign-In failed. Please try again.';

      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.message) {
        message = error.message;
      }

      ToastService.showError('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handleGoogleSignIn}
      disabled={loading}
      className="bg-white border-2 border-gray-300 rounded-xl py-3.5 px-4 flex-row items-center justify-center"
      style={[{ elevation: 2 }, style]}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#4285F4" />
      ) : (
        <>
          <Icon name="logo-google" size={20} color="#4285F4" />
          <Text className="text-gray-900 font-semibold text-base ml-3">Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}
