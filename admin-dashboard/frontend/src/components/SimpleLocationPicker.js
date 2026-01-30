import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons as Icon } from '@expo/vector-icons';
import COLORS from '../config/colors';

export default function SimpleLocationPicker({ visible, onClose, onSelectLocation, initialLocation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState({
    latitude: initialLocation?.latitude || null,
    longitude: initialLocation?.longitude || null,
    address: initialLocation?.address || ''
  });

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a location to search');
      return;
    }

    try {
      setLoading(true);
      const results = await Location.geocodeAsync(searchQuery);
      
      if (results && results.length > 0) {
        // Get addresses for all results
        const resultsWithAddresses = await Promise.all(
          results.map(async (result) => {
            try {
              const addressResults = await Location.reverseGeocodeAsync({
                latitude: result.latitude,
                longitude: result.longitude
              });
              
              const addr = addressResults[0];
              const fullAddress = addr 
                ? `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}, ${addr.country || ''}`
                : `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`;
                
              return {
                ...result,
                address: fullAddress.trim()
              };
            } catch (error) {
              return {
                ...result,
                address: `${result.latitude.toFixed(6)}, ${result.longitude.toFixed(6)}`
              };
            }
          })
        );
        
        setSearchResults(resultsWithAddresses);
      } else {
        Alert.alert('Not Found', 'No results found. Try a different search term.');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Error', 'Failed to search location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });

      const addressResults = await Location.reverseGeocodeAsync({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });

      const addr = addressResults[0];
      const fullAddress = addr 
        ? `${addr.street || ''}, ${addr.city || ''}, ${addr.region || ''}, ${addr.country || ''}`
        : 'Current Location';

      setSelectedLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        address: fullAddress.trim()
      });

      Alert.alert('Success', 'Current location detected!');
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = (location) => {
    setSelectedLocation(location);
    setSearchResults([]);
    setSearchQuery('');
  };

  const confirmLocation = () => {
    if (!selectedLocation.latitude || !selectedLocation.longitude) {
      Alert.alert('Error', 'Please select a location first');
      return;
    }

    onSelectLocation(selectedLocation);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select Business Location</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Search Bar */}
          <View style={styles.searchContainer}>
            <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by area, street name..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={searchLocation}
            />
            <TouchableOpacity onPress={searchLocation} style={styles.searchButton}>
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Icon name="arrow-forward" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Current Location Button */}
          <TouchableOpacity
            style={styles.currentLocationButton}
            onPress={getCurrentLocation}
            disabled={loading}
          >
            <Icon name="locate" size={24} color={COLORS.primary} />
            <Text style={styles.currentLocationText}>Use my current location</Text>
          </TouchableOpacity>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Search Results:</Text>
              {searchResults.map((result, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.resultItem}
                  onPress={() => selectLocation(result)}
                >
                  <Icon name="location-outline" size={20} color={COLORS.primary} />
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultAddress}>{result.address}</Text>
                    <Text style={styles.resultCoords}>
                      {result.latitude.toFixed(6)}, {result.longitude.toFixed(6)}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#999" />
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Selected Location */}
          {selectedLocation.latitude && (
            <View style={styles.selectedContainer}>
              <Text style={styles.selectedTitle}>Selected Location:</Text>
              <View style={styles.selectedCard}>
                <View style={styles.selectedHeader}>
                  <Icon name="location" size={24} color={COLORS.primary} />
                  <Text style={styles.selectedLabel}>Lachit Nagar</Text>
                </View>
                
                {selectedLocation.address && (
                  <Text style={styles.selectedAddress}>{selectedLocation.address}</Text>
                )}
                
                <View style={styles.coordsContainer}>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Latitude:</Text>
                    <Text style={styles.coordValue}>{selectedLocation.latitude.toFixed(6)}</Text>
                  </View>
                  <View style={styles.coordItem}>
                    <Text style={styles.coordLabel}>Longitude:</Text>
                    <Text style={styles.coordValue}>{selectedLocation.longitude.toFixed(6)}</Text>
                  </View>
                </View>

                {/* Visual Map Placeholder */}
                <View style={styles.mapPlaceholder}>
                  <Icon name="map" size={40} color="#999" />
                  <Text style={styles.mapPlaceholderText}>
                    📍 Location: {selectedLocation.address || 'Selected'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Instructions */}
          <View style={styles.instructions}>
            <Icon name="information-circle-outline" size={20} color="#92400E" />
            <Text style={styles.instructionText}>
              Search for your business location or use current location
            </Text>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (!selectedLocation.latitude || !selectedLocation.longitude) && styles.confirmButtonDisabled
            ]}
            onPress={confirmLocation}
            disabled={!selectedLocation.latitude || !selectedLocation.longitude}
          >
            <Text style={styles.confirmButtonText}>
              {selectedLocation.latitude ? 'Confirm Location' : 'Select a location first'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB'
  },
  closeButton: {
    padding: 4
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  content: {
    flex: 1,
    padding: 16
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 16
  },
  searchIcon: {
    marginRight: 8
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333'
  },
  searchButton: {
    padding: 8
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EBF5FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24
  },
  currentLocationText: {
    marginLeft: 12,
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600'
  },
  resultsContainer: {
    marginBottom: 24
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    marginBottom: 8
  },
  resultTextContainer: {
    flex: 1,
    marginLeft: 12
  },
  resultAddress: {
    fontSize: 14,
    color: '#333',
    marginBottom: 4
  },
  resultCoords: {
    fontSize: 12,
    color: '#666'
  },
  selectedContainer: {
    marginBottom: 24
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12
  },
  selectedCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: COLORS.primary
  },
  selectedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  selectedLabel: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  selectedAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  coordsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16
  },
  coordItem: {
    flex: 1
  },
  coordLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4
  },
  coordValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  mapPlaceholder: {
    backgroundColor: '#E0F2FE',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  mapPlaceholderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center'
  },
  instructions: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 12,
    borderRadius: 12
  },
  instructionText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 12,
    color: '#92400E'
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmButtonDisabled: {
    backgroundColor: '#D1D5DB'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

