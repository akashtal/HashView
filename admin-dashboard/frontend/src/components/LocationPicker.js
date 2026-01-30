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
  Platform
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons as Icon } from '@expo/vector-icons';
import COLORS from '../config/colors';

export default function LocationPicker({ visible, onClose, onSelectLocation, initialLocation }) {
  const [region, setRegion] = useState({
    latitude: initialLocation?.latitude || 26.1445,
    longitude: initialLocation?.longitude || 91.7362,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  });

  const [markerCoordinate, setMarkerCoordinate] = useState({
    latitude: initialLocation?.latitude || 26.1445,
    longitude: initialLocation?.longitude || 91.7362
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState('');

  const handleMapPress = (e) => {
    const coordinate = e.nativeEvent.coordinate;
    setMarkerCoordinate(coordinate);
    getAddressFromCoordinates(coordinate);
  };

  const getAddressFromCoordinates = async (coordinate) => {
    try {
      const result = await Location.reverseGeocodeAsync(coordinate);
      if (result[0]) {
        const addr = `${result[0].street || ''}, ${result[0].city || ''}, ${result[0].region || ''}, ${result[0].country || ''}`;
        setAddress(addr.trim());
      }
    } catch (error) {
      console.error('Error getting address:', error);
    }
  };

  const searchLocation = async () => {
    if (!searchQuery.trim()) {
      Alert.alert('Error', 'Please enter a location to search');
      return;
    }

    try {
      setLoading(true);
      const result = await Location.geocodeAsync(searchQuery);

      if (result && result.length > 0) {
        const { latitude, longitude } = result[0];
        const newRegion = {
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        };

        setRegion(newRegion);
        setMarkerCoordinate({ latitude, longitude });
        getAddressFromCoordinates({ latitude, longitude });
      } else {
        Alert.alert('Not Found', 'Location not found. Please try a different search.');
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

      const newRegion = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01
      };

      setRegion(newRegion);
      setMarkerCoordinate({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });
      getAddressFromCoordinates({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude
      });
    } catch (error) {
      console.error('Error getting current location:', error);
      Alert.alert('Error', 'Failed to get current location');
    } finally {
      setLoading(false);
    }
  };

  const confirmLocation = () => {
    onSelectLocation({
      latitude: markerCoordinate.latitude,
      longitude: markerCoordinate.longitude,
      address: address || searchQuery
    });
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

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Icon name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for location..."
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

        {/* Map */}
        <MapView
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
        >
          <Marker
            coordinate={markerCoordinate}
            draggable
            onDragEnd={(e) => {
              setMarkerCoordinate(e.nativeEvent.coordinate);
              getAddressFromCoordinates(e.nativeEvent.coordinate);
            }}
          >
            <View style={styles.markerContainer}>
              <Icon name="location" size={40} color={COLORS.primary} />
            </View>
          </Marker>
        </MapView>

        {/* Address Display */}
        {address ? (
          <View style={styles.addressContainer}>
            <Icon name="location-outline" size={20} color={COLORS.primary} />
            <Text style={styles.addressText}>{address}</Text>
          </View>
        ) : null}

        {/* Current Location Button */}
        <TouchableOpacity
          style={styles.currentLocationButton}
          onPress={getCurrentLocation}
        >
          <Icon name="locate" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Confirm Button */}
        <View style={styles.footer}>
          <View style={styles.coordinateInfo}>
            <Text style={styles.coordinateText}>
              📍 Lat: {markerCoordinate.latitude.toFixed(6)}
            </Text>
            <Text style={styles.coordinateText}>
              📍 Lng: {markerCoordinate.longitude.toFixed(6)}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.confirmButton}
            onPress={confirmLocation}
          >
            <Text style={styles.confirmButtonText}>Confirm Location</Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            💡 Tap on map or drag pin to select exact location
          </Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12
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
  map: {
    flex: 1
  },
  markerContainer: {
    alignItems: 'center'
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  addressText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#333'
  },
  currentLocationButton: {
    position: 'absolute',
    right: 16,
    bottom: 180,
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84
  },
  footer: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB'
  },
  coordinateInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12
  },
  coordinateText: {
    fontSize: 12,
    color: '#666'
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center'
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  },
  instructions: {
    backgroundColor: '#FEF3C7',
    padding: 12,
    alignItems: 'center'
  },
  instructionText: {
    fontSize: 12,
    color: '#92400E'
  }
});

