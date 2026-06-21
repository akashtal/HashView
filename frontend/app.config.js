export default {
  expo: {
    name: 'HashView',
    slug: 'hashview',
    scheme: 'hashview',
    version: '1.1.16',
    orientation: 'portrait',
    icon: './assets/HashViewlogo-01.png',
    userInterfaceStyle: 'automatic',
    assetBundlePatterns: ['**/*'],

    // ─── OTA Updates (EAS Update) ─────────────────────────────────────────────
    updates: {
      url: 'https://u.expo.dev/d4838e65-984b-45e4-b2d8-a03d28a6fb43',
      enabled: true,
      checkAutomatically: 'ON_LOAD',
      fallbackToCacheTimeout: 0,
    },
    runtimeVersion: {
      policy: 'appVersion',
    },

    splash: {
      image: './assets/HashViewSplash.png',
      resizeMode: 'contain',
      backgroundColor: '#210059',
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.hashview.app',
      googleServicesFile: './GoogleService-Info.plist',
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
        NSLocationWhenInUseUsageDescription:
          'HashView needs your location to verify you are physically present at a business when posting a review (Geofencing) and to find nearby businesses.',
        NSLocationAlwaysUsageDescription:
          'HashView needs your location to notify you of nearby business offers even when the app is closed.',
        NSCameraUsageDescription:
          'HashView needs camera access to capture and upload photos of businesses, products, or reviews, and to scan QR codes.',
        NSPhotoLibraryUsageDescription:
          'HashView needs access to your photo library to let you select and upload photos for business listings, products, or user reviews.',
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true,
        },
      },
      buildNumber: '27',
      config: {
        googleMapsApiKey:
          process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
          process.env.GOOGLE_MAPS_API_KEY ||
          'AIzaSyCgafT4Tw62CuxxN5DwbkqWIK9pVflKEXI',
      },
      associatedDomains: ['applinks:hashview-backend.onrender.com', 'applinks:hashview.app'],
    },

    android: {
      package: 'com.hashview.apps',
      googleServicesFile: './google-services.json',
      versionCode: 36,
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: './assets/HashViewlogo-01.png',
        backgroundColor: '#FFFFFF',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'CAMERA',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'POST_NOTIFICATIONS',
        'RECEIVE_BOOT_COMPLETED',
        'VIBRATE',
        'WAKE_LOCK',
      ],
      config: {
        googleMaps: {
          apiKey:
            process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
            process.env.GOOGLE_MAPS_API_KEY ||
            'AIzaSyCgafT4Tw62CuxxN5DwbkqWIK9pVflKEXI',
        },
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'hashview-backend.onrender.com',
              pathPrefix: '/business',
            },
            {
              scheme: 'https',
              host: 'hashview.app',
              pathPrefix: '/business',
            },
          ],
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
    },

    web: {
      bundler: 'metro',
    },

    plugins: [
      'expo-dev-client',
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
          android: {
            minSdkVersion: 24,
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: '35.0.0',
            extraGradleProps: {
              ndkVersion: '27.1.12297006',
            },
          },
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission:
            'Allow HashView to use your location to find nearby businesses and verify reviews.',
        },
      ],
      [
        'expo-notifications',
        {
          icon: './assets/HashViewlogo-01.png',
          color: '#210059',
          sounds: [],
          iosDisplayInForeground: true,
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'Allow HashView to access your photos to select images for business listings or reviews.',
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission:
            'Allow HashView to access your camera to capture photos for listings and scan QR codes.',
        },
      ],
      'expo-font',
      'expo-asset',
      'expo-localization',
      'expo-secure-store',
      [
        'expo-splash-screen',
        {
          image: './assets/HashViewSplash.png',
          resizeMode: 'contain',
          backgroundColor: '#210059',
        },
      ],
      'expo-updates',
      '@react-native-firebase/app',
      '@react-native-firebase/crashlytics',
      'expo-apple-authentication',
      [
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          project: 'react-native',
          organization: 'hashview-qr',
        },
      ],
    ],

    extra: {
      eas: {
        projectId: 'd4838e65-984b-45e4-b2d8-a03d28a6fb43',
      },
    },
    owner: 'hashview',
  },
};
