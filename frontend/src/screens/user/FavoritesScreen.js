import React, { useEffect, useState, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image, Dimensions } from 'react-native';
import { Ionicons as Icon } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { updateUser } from '../../store/slices/authSlice';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

const { width } = Dimensions.get('window');

export default function FavoritesScreen({ navigation }) {
    const dispatch = useDispatch();
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);
    const isInitialLoad = useRef(true);

    useEffect(() => {
        fetchFavorites();

        // Refresh when screen comes into focus
        const unsubscribe = navigation.addListener('focus', () => {
            fetchFavorites();
        });

        return unsubscribe;
    }, [navigation]);

    const fetchFavorites = async () => {
        try {
            // Only show full-screen loading on first load, not on refetch
            if (isInitialLoad.current) setLoading(true);
            const response = await ApiService.getFavoriteBusinesses();
            if (response.success) {
                setFavorites(response.favorites);
            }
        } catch (error) {
            console.error('Error fetching favorites:', error);
        } finally {
            setLoading(false);
            isInitialLoad.current = false;
        }
    };

    const handleRemoveFavorite = async (businessId, businessName) => {
        try {
            // Remove from local list immediately (optimistic)
            setFavorites(prev => prev.filter(f => f._id !== businessId));
            const response = await ApiService.toggleFavoriteBusiness(businessId);
            if (response.success) {
                // Sync to Redux (safe — MainNavigator uses targeted selectors)
                dispatch(updateUser({ favoritePlaces: response.favorites }));
            } else {
                // Revert on failure
                fetchFavorites();
            }
        } catch (error) {
            console.error('Error removing favorite:', error);
            // Revert on error
            fetchFavorites();
        }
    };

    const renderItem = ({ item }) => (
        <TouchableOpacity
            activeOpacity={0.8}
            className="bg-white rounded-2xl mb-4 shadow-sm border border-gray-100 overflow-hidden"
            onPress={() => navigation.navigate('BusinessDetail', { businessId: item._id, business: item })}
        >
            {/* Cover Image */}
            <View className="h-32 bg-gray-200 relative">
                {item.coverImage?.url ? (
                    <Image
                        source={{ uri: item.coverImage.url }} // Displaying cover image
                        className="w-full h-full"
                        resizeMode="cover"
                    />
                ) : (
                    <View className="w-full h-full items-center justify-center bg-gray-100">
                        <Icon name="image-outline" size={40} color="#D1D5DB" />
                    </View>
                )}

                {/* Rating Badge */}
                <View className="absolute top-3 right-3 bg-white px-2 py-1 rounded-lg flex-row items-center shadow-sm">
                    <Icon name="star" size={14} color="#FFA500" />
                    <Text className="text-xs font-bold text-gray-900 ml-1">{item.rating?.average?.toFixed(1) || '0.0'}</Text>
                </View>

                {/* Unfavorite Button */}
                <TouchableOpacity
                    onPress={() => handleRemoveFavorite(item._id, item.name)}
                    className="absolute top-3 left-3 bg-white/90 w-8 h-8 rounded-full items-center justify-center shadow-sm"
                    activeOpacity={0.7}
                >
                    <Icon name="heart" size={16} color="#EF4444" />
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View className="p-4">
                <View className="flex-row items-center mb-1">
                    <Text className="text-xs font-bold text-primary-600 uppercase tracking-wider">{item.category}</Text>
                </View>

                <Text className="text-lg font-bold text-gray-900 mb-1" numberOfLines={1}>{item.name}</Text>

                <View className="flex-row items-center mb-2">
                    <Icon name="location-outline" size={14} color="#6B7280" />
                    <Text className="text-sm text-gray-500 ml-1 flex-1" numberOfLines={1}>
                        {item.address?.city || item.address?.fullAddress || 'Address not available'}
                    </Text>
                </View>

                {/* Tags/Status */}
                <View className="flex-row items-center mt-2">
                    {item.openStatus && (
                        <View className={`px-2 py-0.5 rounded-md mr-2 ${item.isOpenNow ? 'bg-green-50' : 'bg-red-50'}`}>
                            <Text className={`text-[10px] font-bold ${item.isOpenNow ? 'text-green-700' : 'text-red-700'}`}>
                                {item.openStatus}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View className="flex-1 justify-center items-center bg-gray-50">
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View className="flex-1 bg-gray-50 pt-safe">
            {/* Header */}
            <View className="bg-white px-5 pt-12 pb-4 border-b border-gray-100 flex-row items-center">
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    className="w-10 h-10 rounded-full bg-gray-50 items-center justify-center mr-3"
                >
                    <Icon name="arrow-back" size={24} color="#374151" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-gray-900">My Favorites</Text>
            </View>

            {favorites.length === 0 ? (
                <View className="flex-1 items-center justify-center px-6">
                    <View className="w-20 h-20 rounded-full bg-gray-100 items-center justify-center mb-4">
                        <Icon name="heart-outline" size={40} color="#D1D5DB" />
                    </View>
                    <Text className="text-lg font-bold text-gray-900 mb-2">No favorites yet</Text>
                    <Text className="text-center text-gray-500 mb-6">
                        Start exploring businesses and tap the heart icon to add them to your favorites list.
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        className="bg-primary-600 px-6 py-3 rounded-xl shadow-lg shadow-primary-500/30"
                    >
                        <Text className="text-white font-bold">Explore Businesses</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    renderItem={renderItem}
                    keyExtractor={(item) => item._id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
}
