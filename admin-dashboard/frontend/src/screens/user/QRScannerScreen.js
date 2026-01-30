import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  StatusBar
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons as Icon } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../../config/api.config';
import COLORS from '../../config/colors';

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Request camera permission on mount
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // Reset scanner state when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setScanned(false);
      setLoading(false);
    }, [])
  );

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return; // Prevent multiple scans

    setScanned(true);
    setLoading(true);

    try {
      console.log('📱 QR Code scanned:', data);

      // Parse QR code data - support both URL and JSON formats
      let businessId = null;

      // Check if it's a URL format (new smart QR codes)
      // Format: https://hashview.app/business/{id}
      if (data.startsWith('http')) {
        const urlMatch = data.match(/\/business\/([a-f0-9]+)/i);
        if (urlMatch && urlMatch[1]) {
          businessId = urlMatch[1];
          console.log('✅ Extracted business ID from URL:', businessId);
        } else {
          Alert.alert(
            'Invalid QR Code',
            'This QR code is not a valid HashView business QR code.',
            [{ text: 'OK', onPress: () => { setScanned(false); setLoading(false); } }]
          );
          return;
        }
      } else {
        // Try parsing as JSON (old format - backward compatibility)
        try {
          const qrData = JSON.parse(data);
          if (qrData.type === 'business' && qrData.id) {
            businessId = qrData.id;
            console.log('✅ Extracted business ID from JSON:', businessId);
          } else {
            Alert.alert(
              'Invalid QR Code',
              'This QR code is not a valid business QR code.',
              [{ text: 'OK', onPress: () => { setScanned(false); setLoading(false); } }]
            );
            return;
          }
        } catch (e) {
          Alert.alert(
            'Invalid QR Code',
            'This QR code is not a valid HashView business QR code.',
            [{ text: 'OK', onPress: () => { setScanned(false); setLoading(false); } }]
          );
          return;
        }
      }

      if (!businessId) {
        Alert.alert(
          'Invalid QR Code',
          'Could not extract business information from QR code.',
          [{ text: 'OK', onPress: () => { setScanned(false); setLoading(false); } }]
        );
        return;
      }

      // Fetch business details using business ID
      const response = await axios.get(
        `${API_CONFIG.BASE_URL}/business/${businessId}`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.success && response.data.business) {
        // Navigate to business detail screen
        setLoading(false);
        navigation.navigate('BusinessDetail', {
          business: response.data.business,
          businessId: response.data.business._id,
          fromQR: true
        });
      } else {
        Alert.alert(
          'Error',
          response.data.message || 'Failed to load business details',
          [{ text: 'OK', onPress: () => { setScanned(false); setLoading(false); } }]
        );
      }
    } catch (error) {
      console.error('❌ QR Scan Error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.message || error.message || 'Failed to process QR code',
        [
          {
            text: 'OK',
            onPress: () => {
              setScanned(false);
              setLoading(false);
            }
          }
        ]
      );
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.text}>Checking permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <LinearGradient
        colors={[COLORS.primary, COLORS.secondary]}
        style={styles.container}
      >
        <StatusBar barStyle="light-content" />
        <View style={styles.permissionContainer}>
          <Icon name="camera-outline" size={80} color="#fff" />
          <Text style={styles.permissionTitle}>Camera Permission Required</Text>
          <Text style={styles.permissionText}>
            We need access to your camera to scan QR codes
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={styles.camera}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.overlay}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="close" size={28} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan QR Code</Text>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.scanArea}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.scanInstruction}>
              Position the QR code within the frame
            </Text>
          </View>

          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#fff" />
              <Text style={styles.loadingText}>Processing QR code...</Text>
            </View>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Scan a business QR code to view details and leave a review
            </Text>
          </View>
        </LinearGradient>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
    opacity: 0.9,
  },
  permissionButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  backButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    width: 40,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: COLORS.primary,
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanInstruction: {
    color: '#fff',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
  footer: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  footerText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.8,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    marginTop: 10,
  },
});

