import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  SafeAreaView,
  Keyboard,
  FlatList
} from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons as Icon } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import COLORS from '../config/colors';

const { width, height } = Dimensions.get('window');
const UK_DEFAULT_COORDS = { latitude: 54.5, longitude: -3.3, latitudeDelta: 0.2, longitudeDelta: 0.2 };

export default function AdvancedLocationPicker({
  visible,
  onClose,
  onSelectLocation,
  initialLocation,
  googleApiKey
}) {
  const mapRef = useRef(null);
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude ?? UK_DEFAULT_COORDS.latitude,
    longitude: initialLocation?.longitude ?? UK_DEFAULT_COORDS.longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });

  const [address, setAddress] = useState(initialLocation?.address || 'Move map to select location');
  const [addressComponents, setAddressComponents] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Helper to extract address components from Google API response
  const extractGoogleAddressComponents = (components) => {
    const result = {
      buildingNumber: '',
      street: '',
      city: '',
      county: '',
      postcode: '',
      country: '',
    };

    components.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) {
        result.buildingNumber = component.long_name;
      }
      if (types.includes('route')) {
        result.street = component.long_name;
      }
      if (types.includes('postal_town') || types.includes('locality')) {
        result.city = component.long_name;
      }
      if (types.includes('administrative_area_level_2')) {
        result.county = component.long_name;
      }
      if (types.includes('postal_code')) {
        result.postcode = component.long_name;
      }
      if (types.includes('country')) {
        result.country = component.long_name;
      }
    });

    return result;
  };

  // Helper to extract address components from Expo Location response
  const extractExpoAddressComponents = (addr) => {
    return {
      buildingNumber: addr.name || addr.streetNumber || '',
      street: addr.street || '',
      city: addr.city || addr.subregion || '',
      county: addr.region || addr.subregion || '',
      postcode: addr.postalCode || '',
      country: addr.country || '',
    };
  };

  // Debounce helper
  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func(...args);
      }, delay);
    };
  };

  // Reverse Geocode (Get address from coordinates)
  const reverseGeocode = async (latitude, longitude) => {
    try {
      if (googleApiKey) {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleApiKey}`
        );
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          setAddress(result.formatted_address);
          setAddressComponents(extractGoogleAddressComponents(result.address_components));
          return;
        }
      }

      // Fallback to Expo Location
      const addressResults = await Location.reverseGeocodeAsync({ latitude, longitude });
      const addr = addressResults[0];
      if (addr) {
        const fullAddress = [
          addr.name,
          addr.street,
          addr.city,
          addr.postalCode,
          addr.country
        ].filter(Boolean).join(', ');
        setAddress(fullAddress);
        setAddressComponents(extractExpoAddressComponents(addr));
      } else {
        setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        setAddressComponents(null);
      }
    } catch (error) {
      console.log('Reverse geocoding error:', error);
      setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      setAddressComponents(null);
    }
  };

  const debouncedReverseGeocode = useCallback(debounce(reverseGeocode, 800), []);

  const onRegionChange = () => {
    setIsDragging(true);
    Keyboard.dismiss();
  };

  const onRegionChangeComplete = (newRegion) => {
    setIsDragging(false);
    setRegion(newRegion);
    debouncedReverseGeocode(newRegion.latitude, newRegion.longitude);
  };

  const getCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Allow location access to find your position.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      const newRegion = {
        latitude,
        longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      };

      mapRef.current?.animateToRegion(newRegion, 1000);
      setRegion(newRegion);
    } catch (error) {
      Alert.alert('Error', 'Could not get current location');
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleConfirm = () => {
    onSelectLocation({
      latitude: region.latitude,
      longitude: region.longitude,
      address: address,
      addressComponents: addressComponents // Pass structured data back
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>

        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
            initialRegion={region}
            onRegionChange={onRegionChange}
            onRegionChangeComplete={onRegionChangeComplete}
            showsUserLocation={true}
            showsMyLocationButton={false}
          />

          {/* Fixed Center Marker */}
          <View style={styles.centerMarkerContainer} pointerEvents="none">
            <View style={styles.markerWrapper}>
              <Icon name="location-sharp" size={48} color={COLORS.primary} style={styles.markerIcon} />
              <View style={styles.markerShadow} />
            </View>
          </View>

          {/* Google Places Autocomplete */}
          <View style={styles.autocompleteContainer}>
            <View style={styles.headerRow}>
              <TouchableOpacity onPress={onClose} style={styles.backButton}>
                <Icon name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <GooglePlacesAutocomplete
                  placeholder='Search for a place'
                  onPress={(data, details = null) => {
                    if (details) {
                      const { lat, lng } = details.geometry.location;
                      const newRegion = {
                        latitude: lat,
                        longitude: lng,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      };
                      mapRef.current?.animateToRegion(newRegion, 1000);
                      setRegion(newRegion);
                      setAddress(data.description);

                      // Extract components from Google details directly
                      if (details.address_components) {
                        setAddressComponents(extractGoogleAddressComponents(details.address_components));
                      }
                    }
                  }}
                  query={{
                    key: googleApiKey,
                    language: 'en',
                    components: 'country:gb', // Limit to UK
                  }}
                  fetchDetails={true}
                  styles={{
                    textInputContainer: {
                      backgroundColor: 'transparent',
                      borderTopWidth: 0,
                      borderBottomWidth: 0,
                    },
                    textInput: {
                      height: 44,
                      color: '#333',
                      fontSize: 16,
                      backgroundColor: '#fff',
                      borderRadius: 8,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 3,
                    },
                    listView: {
                      backgroundColor: '#fff',
                      borderRadius: 8,
                      marginTop: 8,
                      elevation: 3,
                    },
                  }}
                  enablePoweredByContainer={false}
                  debounce={400}
                />
              </View>
            </View>
          </View>

          {/* Current Location Button */}
          <TouchableOpacity
            style={styles.myLocationButton}
            onPress={getCurrentLocation}
            disabled={loadingLocation}
          >
            {loadingLocation ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <Icon name="locate" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>

          {/* Bottom Address Card */}
          <View style={styles.bottomContainer}>
            <View style={styles.addressCard}>
              <Text style={styles.label}>Selected Location</Text>
              <View style={styles.addressRow}>
                <Icon name="location" size={24} color={COLORS.primary} style={{ marginTop: 2 }} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  {isDragging ? (
                    <Text style={styles.loadingText}>Locating...</Text>
                  ) : (
                    <Text style={styles.addressText}>{address}</Text>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={styles.confirmButtonText}>Confirm Location</Text>
              </TouchableOpacity>
            </View>
          </View>

        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  centerMarkerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 48,
  },
  markerIcon: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  markerShadow: {
    width: 8,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    marginTop: -2,
  },
  autocompleteContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 10 : 40,
    left: 10,
    right: 10,
    zIndex: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  backButton: {
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  myLocationButton: {
    position: 'absolute',
    bottom: 200,
    right: 16,
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 15,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    zIndex: 20,
  },
  addressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  label: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  addressText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    lineHeight: 22,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    fontStyle: 'italic',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
