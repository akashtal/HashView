import React from 'react';
import { StyleSheet, View, Platform, TouchableOpacity, Text } from 'react-native';
import ToastService from '../../utils/ToastService';
import * as AppleAuthentication from 'expo-apple-authentication';
import auth from '@react-native-firebase/auth';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import axios from 'axios';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';

export default function AppleSignInButton({ role = 'customer', style }) {
    const dispatch = useDispatch();

    const handleAppleSignIn = async () => {
        try {
            console.log('🍎 Starting Apple Sign-In...');

            // Android Support:
            // "signInAsync" on Android will open a web-browser based sign-in flow.
            // It requires "serviceId" and "redirectUri" to be configured in your build, OR passed in optional params.
            // However, Expo's documentation says: "If verifyIdentity is false, this throws... on Android, providing the proper serviceId / redirectUri options is required."
            // Since we use Firebase, we usually rely on Firebase Auth, but here we are using Expo's native module first.

            // 1. Perform Apple Sign-In
            const signInOptions = {
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            };

            if (Platform.OS === 'android') {
                // REQUIRED: You must replace these with your actual Service ID and Redirect URI
                // from your Apple Developer Account and Firebase Console.
                signInOptions.clientId = 'co.uk.hashview.auth';
                signInOptions.redirectUri = 'https://hashviewapp.firebaseapp.com/__/auth/handler';
            }

            const appleCredential = await AppleAuthentication.signInAsync(signInOptions);
            const { identityToken, nonce, fullName } = appleCredential;

            if (!identityToken) {
                throw new Error('Apple Sign-In failed - no identity token');
            }

            console.log('✅ Apple identity token received. Creating Firebase credential...');

            // 2. Create a Firebase credential from the response
            const firebaseCredential = auth.AppleAuthProvider.credential(
                identityToken,
                nonce
            );

            // 3. Sign the user in with the credential
            const userCredential = await auth().signInWithCredential(firebaseCredential);
            const user = userCredential.user;
            console.log('✅ Firebase login successful:', user.uid);

            // 4. Get the ID token
            const idToken = await user.getIdToken();

            // 5. Send to our backend
            console.log('📤 Sending token to backend...');
            const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://hashview.44.249.50.162.nip.io/api';

            // Handle potential double /api issue (safety check)
            const cleanBaseUrl = API_BASE_URL.endsWith('/api')
                ? API_BASE_URL
                : `${API_BASE_URL}/api`;

            // Prepare user name if available (Apple only sends this on first login)
            let userName = null;
            if (fullName) {
                if (fullName.givenName && fullName.familyName) {
                    userName = `${fullName.givenName} ${fullName.familyName}`;
                } else if (fullName.givenName) {
                    userName = fullName.givenName;
                }
            }

            const response = await axios.post(`${cleanBaseUrl}/auth/oauth/apple`, {
                idToken,
                role,
                fullName: userName // Send name to backend
            });

            console.log('✅ Backend login successful');
            dispatch(loginSuccess(response.data));

        } catch (error) {
            console.error('❌ Apple Sign-In error:', error);

            if (error.code === 'ERR_CANCELED') {
                console.log('User canceled Apple Sign-In');
                return; // Do nothing if cancelled
            }

            let message = 'Apple Sign-In failed. Please try again.';
            if (error.response && error.response.data && error.response.data.message) {
                message = error.response.data.message;
            } else if (Platform.OS === 'android' && error.message && error.message.includes('not available')) {
                message = 'Native Module Missing! You must rebuild the Android app: npx expo run:android';
            } else if (Platform.OS === 'android' && error.message.includes('avail')) {
                message = 'Apple Sign-In is not currently configured properly for Android. Please check Service ID.';
            }
            ToastService.showError('Sign In Failed', message);
        }
    };

    if (Platform.OS !== 'ios') {
        return null;
    }

    return (
        <View style={[styles.container, style]}>
            <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                cornerRadius={12}
                style={styles.button}
                onPress={handleAppleSignIn}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: 50,
    },
    button: {
        width: '100%',
        height: '100%',
    },
    customButton: {
        width: '100%',
        height: '100%',
        backgroundColor: '#000000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
    },
    icon: {
        marginRight: 10,
    },
    customButtonText: {
        color: '#FFFFFF',
        fontSize: 17, // Matches standardized apple button size usually
        fontWeight: '600',
    }
});
