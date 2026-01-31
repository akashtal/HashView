import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import axios from 'axios';
import { API_URL } from '../../config/api.config';

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

            // Check Play Services
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Sign in with Google
            const { idToken } = await GoogleSignin.signIn();

            // Create Firebase credential
            const googleCredential = auth.GoogleAuthProvider.credential(idToken);

            // Sign in to Firebase
            const userCredential = await auth().signInWithCredential(googleCredential);

            // Get Firebase ID token
            const firebaseIdToken = await userCredential.user.getIdToken();

            // Send to backend
            const response = await axios.post(`${API_URL}/auth/oauth/google`, {
                idToken: firebaseIdToken,
                role // 'customer' or 'business'
            });

            if (response.data.success) {
                // Save token and user data to Redux
                dispatch(loginSuccess({
                    user: response.data.user,
                    token: response.data.token
                }));

                Alert.alert('Success!', 'Signed in with Google successfully');
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

            Alert.alert('Error', message);
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
                    <Text className="text-gray-900 font-semibold text-base ml-3">
                        Continue with Google
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}
