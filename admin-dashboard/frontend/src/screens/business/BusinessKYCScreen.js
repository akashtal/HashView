/* eslint-disable react-native/no-inline-styles */
import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
    ActivityIndicator,
    StatusBar,
    Alert,
    Platform
} from 'react-native';
import { useDispatch } from 'react-redux';
import { loadUser } from '../../store/slices/authSlice';
import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { uploadDocuments } from '../../store/slices/businessSlice';
import { COLORS } from '../../config/colors';
import { showErrorMessage, showSuccessMessage } from '../../utils/errorHandler';

export default function BusinessKYCScreen({ navigation, route }) {
    const dispatch = useDispatch();
    const businessId = route.params?.businessId;
    const [uploading, setUploading] = useState(false);

    // Block hardware back button
    React.useEffect(() => {
        const onBackPress = () => {
            // Return true to stop default back behavior
            return true;
        };

        const subscription = require('react-native').BackHandler.addEventListener(
            'hardwareBackPress',
            onBackPress
        );

        return () => subscription.remove();
    }, []);

    const [documents, setDocuments] = useState({
        addressProof: null,
        selfie: null
    });

    const pickImage = async (type) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access photos');
                return;
            }

            const options = {
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true, // Allow cropping for documents
                quality: 0.8,
            };

            // Optimize for different document types
            if (type === 'selfie') {
                options.aspect = [1, 1];
                options.cameraType = ImagePicker.CameraType.front;
            } else {
                options.aspect = [4, 3]; // Standard document aspect ratio
            }

            const result = await ImagePicker.launchImageLibraryAsync(options);

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setDocuments(prev => ({ ...prev, [type]: result.assets[0] }));
            }
        } catch (error) {
            console.error('Pick image error:', error);
            showErrorMessage('Failed to pick image');
        }
    };

    const handleSubmit = async () => {
        if (!documents.addressProof || !documents.selfie) {
            showErrorMessage('Please upload address proof and selfie to continue');
            return;
        }

        if (!businessId) {
            showErrorMessage('Business ID missing. Please register again.');
            return;
        }

        setUploading(true);
        try {
            const formData = new FormData();

            // Helper to append file to FormData
            const appendFile = (key, asset) => {
                const uri = Platform.OS === 'android' ? asset.uri : asset.uri.replace('file://', '');
                const filename = uri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : 'image/jpeg';

                formData.append(key, {
                    uri,
                    name: filename,
                    type
                });
            };

            appendFile('addressProof', documents.addressProof);
            appendFile('selfie', documents.selfie);

            console.log('📤 Uploading KYC documents (address proof + selfie) for business:', businessId);

            await dispatch(uploadDocuments({ id: businessId, formData })).unwrap();

            // Refresh user profile to update business KYC status in Redux
            await dispatch(loadUser()).unwrap();

            showSuccessMessage(
                'Verification Submitted',
                'Your documents have been submitted for admin verification.'
            );

            // Force navigation reset to trigger MainNavigator re-evaluation
            // This ensures the app redirects to Dashboard when kycStatus changes to 'in_review'
            navigation.reset({
                index: 0,
                routes: [{ name: 'Business' }]
            });

        } catch (error) {
            console.error('❌ KYC upload failed:', error);
            showErrorMessage(error);
        } finally {
            setUploading(false);
        }
    };

    const renderUploadCard = (type, title, description, icon) => {
        const file = documents[type];

        return (
            <View className="bg-white rounded-xl mb-4 shadow-sm border border-gray-100 overflow-hidden">
                <View className="p-4">
                    <View className="flex-row items-center mb-2">
                        <View className="bg-indigo-50 p-2 rounded-lg mr-3">
                            <Icon name={icon} size={24} color={COLORS.primary} />
                        </View>
                        <View className="flex-1">
                            <Text className="text-gray-900 font-bold text-base">{title}</Text>
                            <Text className="text-gray-500 text-xs">{description}</Text>
                        </View>
                    </View>

                    {file ? (
                        <View className="mt-2">
                            <Image
                                source={{ uri: file.uri }}
                                className="w-full h-48 rounded-lg bg-gray-100"
                                resizeMode="cover"
                            />
                            <TouchableOpacity
                                onPress={() => setDocuments(prev => ({ ...prev, [type]: null }))}
                                className="absolute top-2 right-2 bg-red-500 rounded-full p-2 shadow"
                            >
                                <Icon name="trash" size={16} color="white" />
                            </TouchableOpacity>
                            <View className="flex-row items-center mt-2 justify-center">
                                <Icon name="checkmark-circle" size={18} color="#10B981" />
                                <Text className="text-green-600 font-semibold ml-1">Ready to upload</Text>
                            </View>
                        </View>
                    ) : (
                        <TouchableOpacity
                            onPress={() => pickImage(type)}
                            className="mt-3 border-2 border-dashed border-gray-300 rounded-lg h-32 items-center justify-center bg-gray-50 active:bg-gray-100"
                        >
                            <Icon name="cloud-upload-outline" size={32} color={COLORS.gray400} />
                            <Text className="text-gray-500 font-medium mt-2">Tap to upload</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View className="flex-1 bg-gray-50">
            <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

            {/* Header */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                className="pt-12 pb-6 px-6"
            >
                <View className="flex-row items-center">
                    <Text className="text-white text-2xl font-bold">Business Verification</Text>
                </View>
                <Text className="text-indigo-100 mt-2">
                    Verify your identity to activate your business profile.
                </Text>
            </LinearGradient>

            <ScrollView className="flex-1 px-4 py-6" showsVerticalScrollIndicator={false}>
                <View className="mb-6 bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <View className="flex-row items-start">
                        <Icon name="information-circle" size={24} color={COLORS.secondary} />
                        <Text className="text-gray-700 ml-2 flex-1 text-sm leading-5">
                            To ensure safety and trust on HashView, we require all business owners to verify their identity. Your documents are stored securely and only visible to admins.
                        </Text>
                    </View>
                </View>

                {renderUploadCard(
                    'addressProof',
                    'Business Address Proof',
                    'Upload Electricity Bill, Bank Statement, Rent Agreement, or Business License',
                    'document-text'
                )}

                {renderUploadCard(
                    'selfie',
                    'Owner Selfie (Profile Photo)',
                    'Take a clear selfie - this will be your business profile photo',
                    'camera'
                )}

                <View className="h-24" />
            </ScrollView>

            {/* Footer Submit Button */}
            <View className="absolute bottom-0 left-0 right-0 bg-white p-4 border-t border-gray-100 shadow-lg">
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={uploading}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={[COLORS.primary, COLORS.primaryDark]}
                        className="py-4 rounded-xl items-center"
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        {uploading ? (
                            <View className="flex-row items-center">
                                <ActivityIndicator color="white" className="mr-2" />
                                <Text className="text-white font-bold text-lg">Submitting Documents...</Text>
                            </View>
                        ) : (
                            <Text className="text-white font-bold text-lg">Submit for Verification</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
}
