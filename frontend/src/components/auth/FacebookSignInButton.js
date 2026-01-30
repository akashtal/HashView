import React, { useState } from 'react';
import { TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import auth from '@react-native-firebase/auth';
import { LoginManager, AccessToken } from 'react-native-fbsdk-next';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import axios from 'axios';
import { API_URL } from '../../config/api.config';

export default function FacebookSignInButton({ role = 'customer', style }) {
    const [loading, setLoading] = useState(false);
    const dispatch = useDispatch();

    const handleFacebookSignIn = async () => {
        try {
            setLoading(true);

            // Login with Facebook
            const result = await LoginManager.logInWithPermissions(['public_profile', 'email']);

            if (result.isCancelled) {
                setLoading(false);
                return;
            }

            // Get access token
            const data = await AccessToken.getCurrentAccessToken();

            if (!data) {
                throw new Error('Failed to get Facebook access token');
            }

            // Create Firebase credential
            const facebookCredential = auth.FacebookAuthProvider.credential(data.accessToken);

            // Sign in to Firebase
            const userCredential = await auth().signInWithCredential(facebookCredential);

            // Get Firebase ID token
            const firebaseIdToken = await userCredential.user.getIdToken();

            // Send to backend
            const response = await axios.post(`${API_URL}/auth/oauth/facebook`, {
                idToken: firebaseIdToken,
                role
            });

            if (response.data.success) {
                dispatch(loginSuccess({
                    user: response.data.user,
                    token: response.data.token
                }));

                Alert.alert('Success!', 'Signed in with Facebook successfully');
            }
        } catch (error) {
            console.error('Facebook Sign-In error:', error);

            let message = 'Facebook Sign-In failed. Please try again.';

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
            onPress={handleFacebookSignIn}
            disabled={loading}
            className="bg-[#1877F2] rounded-xl py-3.5 px-4 flex-row items-center justify-center"
            style={[{ elevation: 2 }, style]}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator size="small" color="#FFF" />
            ) : (
                <>
                    <Icon name="logo-facebook" size={20} color="#FFF" />
                    <Text className="text-white font-semibold text-base ml-3">
                        Continue with Facebook
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
}
