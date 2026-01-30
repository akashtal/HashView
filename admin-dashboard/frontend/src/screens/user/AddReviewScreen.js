import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, StatusBar, Platform, AppState, Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons as Icon } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { Accelerometer } from 'expo-sensors';
import Constants from 'expo-constants';
import { createReview, clearSuccessMessage } from '../../store/slices/reviewSlice';
import ApiService from '../../services/api.service';
import COLORS from '../../config/colors';

export default function AddReviewScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { business } = route.params;
  const { loading, successMessage, error } = useSelector((state) => state.review);

  // Form state
  const [formData, setFormData] = useState({
    rating: 0,
    comment: '',
    emotion: null, // Add emotion field
  });

  // Media state
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadedPhotos, setUploadedPhotos] = useState([]);
  const [uploadedVideos, setUploadedVideos] = useState([]);

  // 🔒 COMPREHENSIVE GEOFENCING STATE
  const [location, setLocation] = useState(null);
  const [checkingLocation, setCheckingLocation] = useState(true);
  const [showGeofenceInfo, setShowGeofenceInfo] = useState(true);

  // Security & Monitoring State
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [currentDistance, setCurrentDistance] = useState(null);
  const [verificationTimer, setVerificationTimer] = useState(30);
  const [verificationComplete, setVerificationComplete] = useState(false);
  const [motionDetected, setMotionDetected] = useState(false);
  const [locationHistory, setLocationHistory] = useState([]);
  const [isMockLocation, setIsMockLocation] = useState(false);
  const [suspiciousActivities, setSuspiciousActivities] = useState([]);
  const [gpsSignalLost, setGpsSignalLost] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [deviceFingerprint, setDeviceFingerprint] = useState(null);
  const [accuracyStatus, setAccuracyStatus] = useState('Checking GPS...');

  // Refs for subscriptions & cleanup
  const locationSubscription = useRef(null);
  const timerInterval = useRef(null);
  const accelerometerSubscription = useRef(null);
  const appState = useRef(AppState.currentState);

  // Configuration
  const MAX_ALLOWED_RADIUS = business.radius || 50;
  const MAX_GPS_ACCURACY = 50; // meters
  const VERIFICATION_TIME = 30; // seconds
  const MAX_RETRY_ATTEMPTS = 3;
  const RETRY_DELAYS = [2000, 5000, 10000]; // Exponential backoff
  const TELEPORTATION_THRESHOLD = 100; // meters (sudden jump detection)
  const LOCATION_UPDATE_INTERVAL = 2000; // ms

  // ==================== CLEANUP ====================
  useEffect(() => {
    return () => {
      // Clean up all subscriptions
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
      if (accelerometerSubscription.current) {
        accelerometerSubscription.current.remove();
      }
    };
  }, []);

  // ==================== SUCCESS/ERROR HANDLING ====================
  useEffect(() => {
    if (successMessage) {
      Alert.alert('Success!', successMessage + '\n\nYou\'ve earned a coupon!', [
        {
          text: 'View Coupon',
          onPress: () => {
            dispatch(clearSuccessMessage());
            navigation.navigate('Coupons');
          }
        },
        {
          text: 'OK',
          onPress: () => {
            dispatch(clearSuccessMessage());
            navigation.goBack();
          }
        }
      ]);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  // 🔄 CRITICAL: Reset location when business changes (prevents cache bug!)
  useEffect(() => {
    setLocation(null);
    setCheckingLocation(true);
    setShowGeofenceInfo(true);
    setVerificationComplete(false);
    setLocationHistory([]);
    setCurrentDistance(null);

    // Clean up subscriptions
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
    if (timerInterval.current) {
      clearInterval(timerInterval.current);
      timerInterval.current = null;
    }
    if (accelerometerSubscription.current) {
      accelerometerSubscription.current.remove();
      accelerometerSubscription.current = null;
    }

    console.log('🔄 Business changed — forcing fresh GPS verification for:', business.name);
  }, [business._id]);

  // ==================== DEVICE FINGERPRINTING ====================
  useEffect(() => {
    createDeviceFingerprint();
  }, []);

  const createDeviceFingerprint = async () => {
    try {
      const fingerprint = {
        deviceId: Constants.sessionId || 'unknown',
        deviceName: Constants.deviceName || 'unknown',
        manufacturer: Platform.OS === 'android' ? 'Android' : 'Apple',
        modelName: Constants.platform?.ios?.model || Constants.platform?.android?.model || 'unknown',
        osName: Platform.OS,
        osVersion: Platform.Version.toString(),
        platform: Platform.OS,
        platformVersion: Platform.Version,
        isDevice: !Constants.isDevice ? false : true,
        appVersion: Constants.expoConfig?.version || '1.0.0',
        timestamp: Date.now()
      };

      setDeviceFingerprint(fingerprint);
      console.log('🔐 Device fingerprint created:', fingerprint);
    } catch (error) {
      console.error('❌ Error creating device fingerprint:', error);
      // Fallback fingerprint if error
      setDeviceFingerprint({
        platform: Platform.OS,
        platformVersion: Platform.Version,
        timestamp: Date.now()
      });
    }
  };

  // ==================== GET TRULY FRESH GPS (ChatGPT's Solution) ====================
  const getFreshLocation = async () => {
    return new Promise(async (resolve, reject) => {
      let gotFresh = false;
      let subscription = null;
      let bestReading = null;
      let bestAccuracy = 999;

      try {

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Highest,
            distanceInterval: 1, // Update on small movements
            timeInterval: 1000,  // Check every second
          },
          (loc) => {
            const accuracy = loc.coords.accuracy ?? 999;

            // Store best reading
            if (accuracy < bestAccuracy) {
              bestAccuracy = accuracy;
              bestReading = loc.coords;
            }

            // Accept readings ≤ 35m
            if (accuracy <= 35 && !gotFresh) {
              gotFresh = true;
              if (subscription) subscription.remove();
              resolve(loc.coords);
            }
          }
        );

        // Timeout after 10 seconds - use best available reading
        setTimeout(() => {
          if (!gotFresh) {
            console.log(`⏱️ GPS timeout after 10s - using best reading (${bestAccuracy.toFixed(1)}m)`);
            if (subscription) subscription.remove();

            // Accept best reading if it's reasonable (≤ 50m)
            if (bestReading && bestAccuracy <= 50) {
              console.log('✅ Accepting best available GPS reading');
              resolve(bestReading);
            } else {
              reject(new Error('GPS accuracy too low. Please try again outdoors with clear sky view.'));
            }
          }
        }, 10000);

      } catch (error) {
        if (subscription) subscription.remove();
        reject(error);
      }
    });
  };

  // ==================== HAVERSINE DISTANCE CALCULATION ====================
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  // ==================== TELEPORTATION DETECTION ====================
  const detectTeleportation = (newLocation) => {
    if (locationHistory.length === 0) return false;

    const lastLocation = locationHistory[locationHistory.length - 1];
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      newLocation.latitude,
      newLocation.longitude
    );

    // Time elapsed since last location
    const timeElapsed = (Date.now() - lastLocation.timestamp) / 1000; // seconds

    // Check if movement is too fast (teleportation)
    // Average human walking speed: 1.4 m/s, running: 5 m/s, car: 14 m/s
    const maxSpeed = 15; // m/s (considering car movement)
    const expectedMaxDistance = maxSpeed * timeElapsed;

    if (distance > expectedMaxDistance && distance > TELEPORTATION_THRESHOLD) {
      console.log(`🚨 TELEPORTATION DETECTED: Moved ${distance.toFixed(1)}m in ${timeElapsed.toFixed(1)}s`);
      logSuspiciousActivity('TELEPORTATION', {
        distance: distance,
        timeElapsed: timeElapsed,
        speed: distance / timeElapsed
      });
      return true;
    }

    return false;
  };

  // ==================== MOCK LOCATION DETECTION ====================
  const detectMockLocation = (locationData) => {
    // Check if location provider is suspicious
    const provider = locationData.mocked; // Android provides this

    if (provider === true || locationData.isMocked === true) {
      console.log('🚨 MOCK LOCATION DETECTED!');
      logSuspiciousActivity('MOCK_LOCATION', { provider: 'mock/fake' });
      setIsMockLocation(true);
      return true;
    }

    // Additional checks for iOS (location accuracy too perfect)
    if (Platform.OS === 'ios') {
      if (locationData.accuracy && locationData.accuracy < 5) {
        // Too perfect accuracy can indicate mock location
        const perfectAccuracyCount = locationHistory.filter(
          loc => loc.accuracy < 5
        ).length;

        if (perfectAccuracyCount > 5) {
          console.log('🚨 SUSPICIOUS: Too perfect GPS accuracy');
          logSuspiciousActivity('PERFECT_ACCURACY', { count: perfectAccuracyCount });
        }
      }
    }

    return false;
  };

  // ==================== SUSPICIOUS ACTIVITY LOGGING ====================
  const logSuspiciousActivity = (activityType, metadata) => {
    const activity = {
      type: activityType,
      timestamp: Date.now(),
      metadata: metadata
    };

    setSuspiciousActivities(prev => [...prev, activity]);
    console.log(`⚠️ Suspicious activity logged: ${activityType}`, metadata);
  };

  // ==================== GPS SIGNAL LOSS HANDLING ====================
  const handleGPSSignalLoss = async () => {
    console.log('📡 GPS signal lost, attempting recovery...');
    setGpsSignalLost(true);

    if (retryCount < MAX_RETRY_ATTEMPTS) {
      const delay = RETRY_DELAYS[retryCount] || 10000;
      console.log(`⏳ Retrying in ${delay / 1000} seconds...`);

      setTimeout(async () => {
        setRetryCount(prev => prev + 1);
        await retryLocationCheck();
      }, delay);
    } else {
      showDetailedError(
        'GPS Signal Lost',
        'We\'ve lost your GPS signal after multiple attempts.\n\nPossible reasons:\n• You moved indoors\n• GPS is disabled\n• Poor signal area\n\nPlease move to an area with better GPS signal and try again.',
        'GPS_LOST',
        true // Show report issue button
      );
    }
  };

  const retryLocationCheck = async () => {
    try {
      console.log(`🔄 Retry attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS}`);

      const newLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
        timeout: 10000,
      });

      setGpsSignalLost(false);
      setRetryCount(0);
      await processLocationUpdate(newLocation);

      console.log('✅ GPS signal recovered!');
    } catch (error) {
      console.error(`❌ Retry ${retryCount + 1} failed:`, error);
      await handleGPSSignalLoss();
    }
  };

  // ==================== CONTINUOUS LOCATION MONITORING ====================
  const startContinuousLocationMonitoring = async () => {
    console.log('📍 Starting continuous location monitoring...');

    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: LOCATION_UPDATE_INTERVAL,
          distanceInterval: 5, // Update every 5 meters
        },
        async (newLocation) => {
          await processLocationUpdate(newLocation);
        }
      );

      console.log('✅ Location monitoring started');
    } catch (error) {
      console.error('❌ Failed to start location monitoring:', error);
      await handleGPSSignalLoss();
    }
  };

  // ==================== PROCESS LOCATION UPDATES ====================
  const processLocationUpdate = async (newLocation) => {
    const coords = newLocation.coords;

    // Check GPS accuracy
    if (coords.accuracy > MAX_GPS_ACCURACY) {
      console.log(`⚠️ GPS accuracy too low: ${coords.accuracy.toFixed(1)}m`);
      logSuspiciousActivity('POOR_GPS_ACCURACY', { accuracy: coords.accuracy });
      setGpsAccuracy(coords.accuracy);
      setAccuracyStatus(`Weak GPS (${Math.round(coords.accuracy)}m). Please move to an open area.`);
      return;
    }

    setGpsAccuracy(coords.accuracy);
    setAccuracyStatus('Strong GPS Signal');

    // Check for mock location
    if (detectMockLocation(newLocation)) {
      showDetailedError(
        'Mock Location Detected',
        'We detected that you\'re using a fake/mock GPS location.\n\nTo ensure review authenticity, please:\n• Disable any mock location apps\n• Use your real GPS location\n• Restart the app',
        'MOCK_LOCATION',
        false
      );
      return;
    }

    // Check for teleportation
    if (detectTeleportation({ ...coords, timestamp: Date.now() })) {
      showDetailedError(
        'Suspicious Location Jump',
        'Your location jumped suddenly by a large distance.\n\nThis could indicate:\n• GPS signal interference\n• Device location spoofing\n\nPlease ensure you\'re using real GPS and try again.',
        'TELEPORTATION',
        true
      );
      return;
    }

    // Calculate distance to business
    const businessLat = business.location.coordinates[1];
    const businessLon = business.location.coordinates[0];
    const distance = calculateDistance(
      coords.latitude,
      coords.longitude,
      businessLat,
      businessLon
    );

    setCurrentDistance(distance);
    setLocation(newLocation);

    // Add to location history
    setLocationHistory(prev => [
      ...prev,
      {
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        timestamp: Date.now()
      }
    ].slice(-20)); // Keep last 20 locations

    // Check if still within geofence
    if (distance > MAX_ALLOWED_RADIUS) {
      console.log(`❌ User moved outside radius: ${distance.toFixed(1)}m`);
      showDetailedError(
        'Moved Outside Radius',
        `You've moved outside the business radius.\n\nCurrent distance: ${Math.round(distance)}m\nRequired: Within ${MAX_ALLOWED_RADIUS}m\n\nPlease return to the business location.`,
        'MOVED_AWAY',
        false
      );

      // Stop monitoring and verification
      if (locationSubscription.current) {
        locationSubscription.current.remove();
        locationSubscription.current = null;
      }
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
        timerInterval.current = null;
      }

      setVerificationComplete(false);
      navigation.goBack();
    }

    console.log(`📏 Distance: ${distance.toFixed(1)}m | Accuracy: ${coords.accuracy.toFixed(1)}m | Timer: ${verificationTimer}s`);
  };

  // ==================== MOTION SENSOR VERIFICATION ====================
  const startMotionSensorMonitoring = () => {
    console.log('📱 Starting motion sensor monitoring...');

    Accelerometer.setUpdateInterval(1000);

    accelerometerSubscription.current = Accelerometer.addListener(accelerometerData => {
      const { x, y, z } = accelerometerData;
      const magnitude = Math.sqrt(x * x + y * y + z * z);

      // Detect if user is moving (magnitude > 1.2 indicates movement)
      if (magnitude > 1.2) {
        setMotionDetected(true);
        console.log('🚶 Motion detected');
      }
    });
  };

  // ==================== 30-SECOND TIMER VERIFICATION ====================
  const start30SecondTimer = () => {
    console.log('⏱️ Starting 30-second verification timer...');

    timerInterval.current = setInterval(() => {
      setVerificationTimer(prev => {
        const newTime = prev - 1;

        if (newTime <= 0) {
          clearInterval(timerInterval.current);
          setVerificationComplete(true);
          console.log('✅ 30-second verification complete!');
          Alert.alert(
            'Verification Complete! ✅',
            'You\'ve stayed within the business location for 30 seconds. You can now submit your review!',
            [{ text: 'Great!', style: 'default' }]
          );
        }

        return newTime;
      });
    }, 1000);
  };

  // ==================== INITIALIZE COMPREHENSIVE VERIFICATION ====================
  const initializeLocationVerification = async () => {
    try {
      console.log('\n🔒 ========== COMPREHENSIVE GEOFENCING STARTED ==========');

      // Step 1: Request permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showDetailedError(
          'Permission Required',
          'We need your location permission to verify you\'re at the business.\n\nThis ensures review authenticity and prevents fake reviews.',
          'PERMISSION_DENIED',
          false
        );
        return;
      }

      // Step 2: Check if location services enabled
      const locationEnabled = await Location.hasServicesEnabledAsync();
      if (!locationEnabled) {
        showDetailedError(
          'Enable Location Services',
          'Please turn on GPS/Location in your device settings to continue.\n\nSteps:\n1. Open Settings\n2. Go to Location\n3. Turn ON',
          'LOCATION_DISABLED',
          false
        );
        return;
      }

      // Step 3: Get TRULY FRESH GPS (use the updated getFreshLocation function)
      console.log('📍 Getting fresh GPS location...');

      const coords = await getFreshLocation();
      const initialLocation = { coords };

      // Step 4: Check GPS accuracy
      if (initialLocation.coords.accuracy > MAX_GPS_ACCURACY) {
        showDetailedError(
          'Poor GPS Signal',
          `Your GPS accuracy is ${Math.round(initialLocation.coords.accuracy)}m, but we need ${MAX_GPS_ACCURACY}m or better.\n\nTips to improve:\n• Move outdoors\n• Move away from tall buildings\n• Wait a few moments for GPS to stabilize\n• Ensure Location mode is set to "High Accuracy"`,
          'POOR_ACCURACY',
          true
        );
        return;
      }

      console.log(`✅ GPS accuracy: ${initialLocation.coords.accuracy.toFixed(1)}m`);

      // Step 5: Calculate initial distance
      const businessLat = business.location.coordinates[1];
      const businessLon = business.location.coordinates[0];
      const distance = calculateDistance(
        initialLocation.coords.latitude,
        initialLocation.coords.longitude,
        businessLat,
        businessLon
      );

      console.log(`📏 Initial distance: ${distance.toFixed(1)}m (limit: ${MAX_ALLOWED_RADIUS}m)`);

      // Step 6: Check if within radius
      if (distance > MAX_ALLOWED_RADIUS) {
        showDetailedError(
          'Outside Business Radius',
          `You are ${Math.round(distance)}m away from ${business.name}.\n\nYou must be within ${MAX_ALLOWED_RADIUS}m to leave a review.\n\nPlease visit the business location.`,
          'OUT_OF_RANGE',
          false
        );
        return;
      }

      // Step 7: Store initial location
      setLocation(initialLocation);
      setCurrentDistance(distance);
      setGpsAccuracy(initialLocation.coords.accuracy);
      setLocationHistory([{
        latitude: initialLocation.coords.latitude,
        longitude: initialLocation.coords.longitude,
        accuracy: initialLocation.coords.accuracy,
        timestamp: Date.now()
      }]);

      // Step 8: Start continuous monitoring
      await startContinuousLocationMonitoring();

      // Step 9: Start motion sensor monitoring
      startMotionSensorMonitoring();

      // Step 10: Start 30-second verification timer
      start30SecondTimer();

      // Step 11: Ready to write review
      setCheckingLocation(false);

      console.log('✅ Comprehensive verification initialized!');
      console.log('========================================================\n');

    } catch (error) {
      console.error('❌ Location verification error:', error);

      if (error.code === 'E_LOCATION_TIMEOUT') {
        showDetailedError(
          'GPS Timeout',
          'Could not get your location within 10 seconds.\n\nPlease ensure:\n• GPS is enabled\n• You\'re outdoors or near a window\n• Location mode is "High Accuracy"\n• Wait a moment and try again',
          'TIMEOUT',
          true
        );
      } else if (error.code === 'E_LOCATION_UNAVAILABLE') {
        showDetailedError(
          'Location Unavailable',
          'Your device location is temporarily unavailable.\n\nPlease:\n• Check GPS settings\n• Restart location services\n• Try again in a moment',
          'UNAVAILABLE',
          true
        );
      } else {
        showDetailedError(
          'Location Error',
          'Unable to access your location.\n\nPlease check that:\n• Location Services are enabled\n• App has location permission\n• GPS is working properly',
          'UNKNOWN_ERROR',
          true
        );
      }
    }
  };

  // ==================== DETAILED ERROR WITH REPORT ISSUE ====================
  const showDetailedError = (title, message, errorCode, showReportButton) => {
    const buttons = [];

    // Report Issue button
    if (showReportButton) {
      buttons.push({
        text: 'Report Issue',
        onPress: () => {
          Alert.alert(
            'Report Location Issue',
            `We'll flag this for manual review by our team.\n\nYour issue: ${errorCode}\n\nYou'll be notified if your review is approved manually.`,
            [
              {
                text: 'Submit Report',
                onPress: () => {
                  // Send to backend for manual review
                  console.log(`🚩 Issue reported: ${errorCode}`, {
                    business: business._id,
                    location: location?.coords,
                    suspiciousActivities: suspiciousActivities,
                    deviceFingerprint: deviceFingerprint
                  });

                  Alert.alert('Report Submitted', 'Our team will review your case. Thank you!');
                  navigation.goBack();
                }
              },
              { text: 'Cancel', style: 'cancel' }
            ]
          );
        }
      });
    }

    // Retry button (for certain errors)
    if (['GPS_LOST', 'TIMEOUT', 'UNAVAILABLE', 'POOR_ACCURACY'].includes(errorCode)) {
      buttons.push({
        text: 'Retry',
        onPress: () => {
          setShowGeofenceInfo(true);
          setCheckingLocation(true);
          setRetryCount(0);
        }
      });
    }

    // Cancel/OK button
    buttons.push({
      text: errorCode === 'OUT_OF_RANGE' || errorCode === 'MOCK_LOCATION' ? 'OK' : 'Cancel',
      onPress: () => navigation.goBack(),
      style: 'cancel'
    });

    Alert.alert(title, message, buttons, { cancelable: false });
  };

  // ==================== MEDIA HANDLING ====================
  const pickPhotos = async () => {
    try {
      // Show options: Camera or Gallery
      Alert.alert(
        'Add Photos',
        'Choose an option',
        [
          {
            text: 'Take Photo',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to use camera');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
              });

              if (!result.canceled && result.assets) {
                setSelectedPhotos([...selectedPhotos, result.assets[0]]);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access photos');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 0.8,
                selectionLimit: 5 - selectedPhotos.length, // Max 5 photos total
              });

              if (!result.canceled && result.assets) {
                const newPhotos = result.assets.slice(0, 5 - selectedPhotos.length);
                setSelectedPhotos([...selectedPhotos, ...newPhotos]);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error picking photos:', error);
      Alert.alert('Error', 'Failed to pick photos');
    }
  };

  const pickVideos = async () => {
    try {
      // Show options: Record Video or Choose from Gallery
      Alert.alert(
        'Add Videos',
        'Choose an option',
        [
          {
            text: 'Record Video',
            onPress: async () => {
              const { status } = await ImagePicker.requestCameraPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to use camera');
                return;
              }

              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                videoMaxDuration: 30, // Max 30 seconds
                quality: 0.8,
              });

              if (!result.canceled && result.assets) {
                setSelectedVideos([...selectedVideos, result.assets[0]]);
              }
            }
          },
          {
            text: 'Choose from Gallery',
            onPress: async () => {
              const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
              if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please grant permission to access videos');
                return;
              }

              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Videos,
                allowsMultipleSelection: true,
                quality: 0.8,
                videoMaxDuration: 30, // Max 30 seconds per video
                selectionLimit: 2 - selectedVideos.length, // Max 2 videos total
              });

              if (!result.canceled && result.assets) {
                const newVideos = result.assets.slice(0, 2 - selectedVideos.length);
                setSelectedVideos([...selectedVideos, ...newVideos]);
              }
            }
          },
          {
            text: 'Cancel',
            style: 'cancel'
          }
        ]
      );
    } catch (error) {
      console.error('Error picking videos:', error);
      Alert.alert('Error', 'Failed to pick videos');
    }
  };

  const removePhoto = (index) => {
    setSelectedPhotos(selectedPhotos.filter((_, i) => i !== index));
  };

  const removeVideo = (index) => {
    setSelectedVideos(selectedVideos.filter((_, i) => i !== index));
  };

  const uploadMediaToCloudinary = async () => {
    try {
      const photos = [];
      const videos = [];

      // Upload photos if selected
      if (selectedPhotos.length > 0) {
        setUploadingMedia(true);
        const photoFormData = new FormData();

        selectedPhotos.forEach((photo, index) => {
          const filename = photo.uri.split('/').pop() || `photo_${Date.now()}_${index}.jpg`;
          const match = /\.(\w+)$/.exec(filename);
          const extension = match ? match[1].toLowerCase() : 'jpg';
          const mimeType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

          photoFormData.append('photos', {
            uri: photo.uri,
            name: filename,
            type: mimeType
          });
        });

        const photoResponse = await ApiService.uploadReviewPhotos(photoFormData);
        if (photoResponse.success && photoResponse.photos) {
          photos.push(...photoResponse.photos);
          setUploadedPhotos(photoResponse.photos);
          console.log(`✅ Uploaded ${photoResponse.photos.length} photos`);
        }
      }

      // Upload videos if selected
      if (selectedVideos.length > 0) {
        setUploadingMedia(true);
        const videoFormData = new FormData();

        selectedVideos.forEach((video, index) => {
          const filename = video.uri.split('/').pop() || `video_${Date.now()}_${index}.mp4`;
          const match = /\.(\w+)$/.exec(filename);
          const extension = match ? match[1].toLowerCase() : 'mp4';
          const mimeType = `video/${extension}`;

          videoFormData.append('videos', {
            uri: video.uri,
            name: filename,
            type: mimeType
          });
        });

        const videoResponse = await ApiService.uploadReviewVideos(videoFormData);
        if (videoResponse.success && videoResponse.videos) {
          videos.push(...videoResponse.videos);
          setUploadedVideos(videoResponse.videos);
          console.log(`✅ Uploaded ${videoResponse.videos.length} videos`);
        }
      }

      setUploadingMedia(false);
      return { photos, videos };
    } catch (error) {
      setUploadingMedia(false);
      console.error('Error uploading media:', error);
      throw error;
    }
  };

  // ==================== SUBMIT REVIEW ====================
  const handleSubmit = async () => {
    // Validation 1: Rating
    if (formData.rating === 0) {
      Alert.alert('Missing Rating', 'Please select a star rating for your experience.');
      return;
    }

    // Validation 2: Comment length
    if (formData.comment.length < 10) {
      Alert.alert('Review Too Short', 'Please write at least 10 characters to share your experience.');
      return;
    }

    // Validation 3: Location
    if (!location) {
      Alert.alert('Location Error', 'Location data is not available. Please try again.');
      return;
    }

    // Validation 4: 30-second verification
    if (!verificationComplete) {
      Alert.alert(
        'Verification Incomplete',
        `Please wait ${verificationTimer} more seconds while we verify your location.\n\nThis ensures review authenticity.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Validation 5: Motion detection (removed - not required)
    // Motion sensor still runs for metadata, but doesn't block submission

    // Get fresh location one more time before submit
    console.log('🔄 Getting final fresh location before submit...');
    try {
      const finalLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 0,
        timeout: 5000,
      });

      const finalDistance = calculateDistance(
        finalLocation.coords.latitude,
        finalLocation.coords.longitude,
        business.location.coordinates[1],
        business.location.coordinates[0]
      );

      if (finalDistance > MAX_ALLOWED_RADIUS) {
        Alert.alert(
          'Moved Away',
          `You've moved away from the business (${Math.round(finalDistance)}m away).\n\nPlease return to submit your review.`
        );
        return;
      }

      // Upload media to Cloudinary first (if any)
      let uploadedMedia = { photos: [], videos: [] };
      if (selectedPhotos.length > 0 || selectedVideos.length > 0) {
        try {
          console.log('📸 Uploading media to Cloudinary...');
          uploadedMedia = await uploadMediaToCloudinary();
          console.log('✅ Media uploaded successfully:', {
            photos: uploadedMedia.photos.length,
            videos: uploadedMedia.videos.length
          });
        } catch (error) {
          Alert.alert(
            'Upload Failed',
            'Failed to upload photos/videos. Continue without media?',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Continue',
                onPress: () => {
                  // Continue without media
                  uploadedMedia = { photos: [], videos: [] };
                }
              }
            ]
          );
          return;
        }
      }

      // Submit to backend with ALL security metadata + media
      dispatch(createReview({
        business: business._id,
        rating: formData.rating,
        comment: formData.comment,
        emotion: formData.emotion, // Add emotion field
        latitude: finalLocation.coords.latitude,
        longitude: finalLocation.coords.longitude,
        images: uploadedMedia.photos, // Cloudinary URLs
        videos: uploadedMedia.videos, // Cloudinary URLs
        // Security metadata
        locationAccuracy: finalLocation.coords.accuracy,
        verificationTime: VERIFICATION_TIME,
        motionDetected: motionDetected,
        isMockLocation: isMockLocation,
        locationHistoryCount: locationHistory.length,
        suspiciousActivities: suspiciousActivities,
        deviceFingerprint: deviceFingerprint,
        devicePlatform: Platform.OS,
      }));

      console.log('✅ Review submitted with full security metadata + media!');

    } catch (error) {
      console.error('❌ Failed to get final location:', error);
      Alert.alert('Location Error', 'Could not verify your final location. Please try again.');
    }
  };

  // ==================== RENDER: GEOFENCE INFO ====================
  if (showGeofenceInfo) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-6">
        <View className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
          <View className="items-center mb-4">
            <Icon name="shield-checkmark" size={56} color={COLORS.secondary} />
          </View>

          <Text className="text-2xl font-bold text-gray-900 text-center mb-3">
            Comprehensive Location Verification
          </Text>

          <Text className="text-gray-600 text-center mb-4 leading-6">
            To ensure authentic reviews, we'll verify:
          </Text>

          <View className="mb-4">
            <View className="flex-row items-center mb-2">
              <Icon name="location" size={20} color={COLORS.secondary} />
              <Text className="text-gray-700 ml-2">You're within {MAX_ALLOWED_RADIUS}m radius</Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Icon name="checkmark-circle" size={20} color={COLORS.secondary} />
              <Text className="text-gray-700 ml-2">GPS accuracy better than {MAX_GPS_ACCURACY}m</Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Icon name="time" size={20} color={COLORS.secondary} />
              <Text className="text-gray-700 ml-2">30-second location stability</Text>
            </View>
            <View className="flex-row items-center">
              <Icon name="phone-portrait" size={20} color={COLORS.secondary} />
              <Text className="text-gray-700 ml-2">Real device & GPS detection</Text>
            </View>
          </View>

          <View className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-200">
            <Text className="text-sm text-gray-700 text-center">
              This comprehensive verification prevents fake reviews and ensures all reviews are from real visitors.
            </Text>
          </View>

          <TouchableOpacity
            onPress={() => {
              setShowGeofenceInfo(false);
              initializeLocationVerification();
            }}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[COLORS.secondary, COLORS.secondaryDark]}
              className="rounded-xl py-4 items-center"
            >
              <Text className="text-white font-bold text-lg">Start Verification</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="mt-3 py-3 items-center"
          >
            <Text className="text-gray-500 font-semibold">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ==================== RENDER: LOCATION CHECKING ====================
  if (checkingLocation) {
    return (
      <View className="flex-1 justify-center items-center bg-white px-8">
        <ActivityIndicator size="large" color={COLORS.secondary} />
        <Text className="text-gray-700 font-bold mt-6 text-center text-lg">
          Verifying Your Location...
        </Text>
        <Text className="text-gray-500 text-sm mt-2 text-center">
          {gpsSignalLost
            ? `Recovering GPS signal... (Attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`
            : 'This may take 5-10 seconds'}
        </Text>

        {gpsSignalLost && (
          <View className="mt-4 bg-yellow-50 rounded-xl p-4 border border-yellow-200">
            <Text className="text-gray-700 text-center text-sm">
              GPS signal lost. Please ensure you're outdoors or near a window.
            </Text>
          </View>
        )}
      </View>
    );
  }

  // ==================== RENDER: REVIEW FORM ====================
  return (
    <ScrollView className="flex-1 bg-white">
      {/* Status Bar */}
      <StatusBar barStyle="dark-content" />

      {/* Verification Status Banner */}
      <View className={`px-6 py-4 ${verificationComplete ? 'bg-green-50' : 'bg-yellow-50'}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <View className="flex-row items-center mb-1">
              <Icon
                name={verificationComplete ? "checkmark-circle" : "time"}
                size={20}
                color={verificationComplete ? "#10B981" : "#F59E0B"}
              />
              <Text className={`ml-2 font-bold ${verificationComplete ? 'text-green-700' : 'text-yellow-700'}`}>
                {verificationComplete ? 'Verified ✓' : `Verifying... ${verificationTimer}s`}
              </Text>
            </View>

            <View className="flex-row items-center space-x-2">
              <Text className="text-xs text-gray-600">
                📏 {currentDistance?.toFixed(0) || '?'}m away
              </Text>
              <Text className="text-xs text-gray-600">•</Text>
              <Text className="text-xs text-gray-600">
                🎯 ±{gpsAccuracy?.toFixed(0) || '?'}m accuracy
              </Text>
              {motionDetected && (
                <>
                  <Text className="text-xs text-gray-600">•</Text>
                  <Text className="text-xs text-green-600">
                    🚶 Motion ✓
                  </Text>
                </>
              )}
            </View>
            <Text className={`text-[10px] mt-1 font-semibold ${gpsAccuracy > MAX_GPS_ACCURACY ? 'text-red-500' : 'text-green-600'}`}>
              📡 {accuracyStatus}
            </Text>
          </View>
        </View>
      </View>

      <View className="px-6 py-6">
        {/* Business Info */}
        <View className="bg-gray-50 rounded-xl p-4 mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-2">{business.name}</Text>
          <View className="flex-row items-center">
            <Icon name="location" size={16} color={COLORS.secondary} />
            <Text className="text-sm text-gray-600 ml-1">
              {business.address?.city || 'Unknown location'}
            </Text>
          </View>
        </View>

        {/* Rating */}
        <Text className="text-xl font-bold text-gray-900 mb-4">Rate Your Experience</Text>

        <View className="flex-row justify-center items-center mb-6 py-4">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setFormData({ ...formData, rating: star })}
              className="mx-1"
            >
              <Icon
                name={formData.rating >= star ? 'star' : 'star-outline'}
                size={48}
                color={formData.rating >= star ? COLORS.secondary : '#E5E7EB'}
              />
            </TouchableOpacity>
          ))}
        </View>

        {formData.rating > 0 && (
          <Text className="text-center text-lg font-semibold mb-4" style={{ color: COLORS.secondary }}>
            {formData.rating === 5 ? 'Excellent!' :
              formData.rating === 4 ? 'Great!' :
                formData.rating === 3 ? 'Good' :
                  formData.rating === 2 ? 'Could be better' : 'Poor'}
          </Text>
        )}

        {/* Emotion Selector - Facebook Style */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">How are you feeling?</Text>
          <View className="flex-row justify-center items-center flex-wrap px-2">
            {[
              { emoji: '😊', label: 'happy', value: 'happy' },
              { emoji: '😇', label: 'blessed', value: 'blessed' },
              { emoji: '😍', label: 'loved', value: 'loved' },
              { emoji: '😢', label: 'sad', value: 'sad' },
              { emoji: '🥰', label: 'lovely', value: 'lovely' },
              { emoji: '😃', label: 'thankful', value: 'thankful' },
              { emoji: '⭐😁', label: 'excited', value: 'excited' },
              { emoji: '😘', label: 'in love', value: 'in_love' },
              { emoji: '😂', label: 'crazy', value: 'crazy' },
              { emoji: '😅', label: 'grateful', value: 'grateful' },
              { emoji: '😊', label: 'blissful', value: 'blissful' },
              { emoji: '😂', label: 'fantastic', value: 'fantastic' },
              { emoji: '😛', label: 'silly', value: 'silly' },
              { emoji: '🎉', label: 'festive', value: 'festive' },
              { emoji: '😊', label: 'wonderful', value: 'wonderful' },
              { emoji: '😎', label: 'cool', value: 'cool' },
              { emoji: '😊', label: 'amused', value: 'amused' },
              { emoji: '😌', label: 'relaxed', value: 'relaxed' },
              { emoji: '😊', label: 'positive', value: 'positive' },
              { emoji: '😌', label: 'chill', value: 'chill' },
            ].map((emotion) => (
              <TouchableOpacity
                key={emotion.value}
                onPress={() => setFormData({ ...formData, emotion: emotion.value })}
                className={`m-1.5 items-center justify-center rounded-xl py-2 px-3 ${formData.emotion === emotion.value ? 'bg-blue-50 border-2' : 'bg-white border'
                  }`}
                style={{
                  borderColor: formData.emotion === emotion.value ? '#3B82F6' : '#E5E7EB',
                  minWidth: 75,
                  shadowColor: formData.emotion === emotion.value ? '#3B82F6' : '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: formData.emotion === emotion.value ? 0.2 : 0.05,
                  shadowRadius: 2,
                  elevation: formData.emotion === emotion.value ? 2 : 1,
                }}
              >
                <Text className="text-2xl mb-0.5">{emotion.emoji}</Text>
                <Text
                  className={`text-xs font-medium ${formData.emotion === emotion.value ? 'text-blue-700' : 'text-gray-600'
                    }`}
                >
                  {emotion.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Comment */}
        <Text className="text-lg font-bold text-gray-900 mb-3">Write Your Review</Text>

        <TextInput
          className="bg-gray-50 rounded-xl p-4 text-gray-900 mb-2"
          placeholder="Share your experience..."
          value={formData.comment}
          onChangeText={(text) => setFormData({ ...formData, comment: text })}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={500}
        />

        <Text className="text-xs text-gray-500 mb-2 text-right">
          {formData.comment.length}/500 characters
        </Text>

        {/* Add Photos & Videos Section */}
        <View className="mb-6">
          <Text className="text-lg font-bold text-gray-900 mb-3">Add Photos & Videos (Optional)</Text>

          {/* Photo & Video Buttons */}
          <View className="flex-row gap-3 mb-4">
            <TouchableOpacity
              onPress={pickPhotos}
              disabled={selectedPhotos.length >= 5}
              className={`flex-1 bg-blue-50 rounded-xl py-4 items-center border-2 ${selectedPhotos.length >= 5 ? 'opacity-50' : ''}`}
              style={{ borderColor: '#3B82F6', borderStyle: 'dashed' }}
              activeOpacity={0.7}
            >
              <Icon name="image" size={28} color="#3B82F6" />
              <Text className="text-blue-600 font-semibold mt-2">Add Photos</Text>
              <Text className="text-xs text-gray-500 mt-1">{selectedPhotos.length}/5</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={pickVideos}
              disabled={selectedVideos.length >= 2}
              className={`flex-1 bg-purple-50 rounded-xl py-4 items-center border-2 ${selectedVideos.length >= 2 ? 'opacity-50' : ''}`}
              style={{ borderColor: '#9333EA', borderStyle: 'dashed' }}
              activeOpacity={0.7}
            >
              <Icon name="videocam" size={28} color="#9333EA" />
              <Text className="text-purple-600 font-semibold mt-2">Add Videos</Text>
              <Text className="text-xs text-gray-500 mt-1">{selectedVideos.length}/2</Text>
            </TouchableOpacity>
          </View>

          {/* Selected Photos Preview */}
          {selectedPhotos.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Selected Photos ({selectedPhotos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {selectedPhotos.map((photo, index) => (
                  <View key={index} className="mr-3 relative">
                    <Image
                      source={{ uri: photo.uri }}
                      className="w-24 h-24 rounded-lg"
                      resizeMode="cover"
                    />
                    <TouchableOpacity
                      onPress={() => removePhoto(index)}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }}
                    >
                      <Icon name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Selected Videos Preview */}
          {selectedVideos.length > 0 && (
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-700 mb-2">Selected Videos ({selectedVideos.length})</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                {selectedVideos.map((video, index) => (
                  <View key={index} className="mr-3 relative">
                    <View className="w-24 h-24 rounded-lg bg-gray-800 items-center justify-center">
                      <Icon name="play-circle" size={40} color="#FFF" />
                      <Text className="text-white text-xs mt-1">
                        {video.duration ? `${Math.floor(video.duration / 1000)}s` : 'Video'}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => removeVideo(index)}
                      className="absolute -top-2 -right-2 bg-red-500 rounded-full w-6 h-6 items-center justify-center"
                      style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }}
                    >
                      <Icon name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Media Upload Info */}
          {(selectedPhotos.length > 0 || selectedVideos.length > 0) && (
            <View className="bg-blue-50 rounded-xl p-3 border border-blue-200">
              <View className="flex-row items-center">
                <Icon name="information-circle" size={18} color="#3B82F6" />
                <Text className="text-xs text-blue-700 ml-2 flex-1">
                  Photos and videos will be uploaded when you submit your review
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Verification Warning */}
        {!verificationComplete && (
          <View className="bg-yellow-50 rounded-xl p-4 mb-6 border border-yellow-200">
            <View className="flex-row items-start">
              <Icon name="alert-circle" size={20} color="#F59E0B" />
              <Text className="text-sm text-gray-700 ml-2 flex-1">
                Please wait {verificationTimer} more seconds for location verification to complete before submitting.
              </Text>
            </View>
          </View>
        )}

        {/* Coupon Reward */}
        <View className="bg-green-50 rounded-xl p-4 mb-6">
          <View className="flex-row items-center mb-2">
            <Icon name="gift" size={20} color={COLORS.secondary} />
            <Text className="text-sm font-bold text-green-700 ml-2">Earn a Coupon!</Text>
          </View>
          <Text className="text-xs text-green-600">
            Complete verification and post your review to receive a special discount coupon valid for 2 hours!
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || uploadingMedia || !verificationComplete}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={
              loading || uploadingMedia || !verificationComplete
                ? ['#9CA3AF', '#6B7280']
                : [COLORS.secondary, COLORS.secondaryDark]
            }
            className="rounded-xl py-4 items-center shadow-lg"
          >
            {(loading || uploadingMedia) ? (
              <View className="flex-row items-center">
                <ActivityIndicator color="#fff" size="small" />
                <Text className="text-white font-semibold text-base ml-3">
                  {uploadingMedia ? 'Uploading media...' : 'Submitting review...'}
                </Text>
              </View>
            ) : (
              <Text className="text-white font-bold text-lg">
                {verificationComplete ? 'Submit Review' : `Wait ${verificationTimer}s`}
              </Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

