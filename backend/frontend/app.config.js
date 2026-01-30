export default {
  expo: {
    name: "HashView",
    slug: "hashview",
    scheme: "hashview",
    version: "1.1.0",
    orientation: "portrait",
    icon: "./assets/HashViewlogo-01.png",
    userInterfaceStyle: "automatic",
    assetBundlePatterns: ["**/*"],

    splash: {
      image: "./assets/HashViewSplash.png",
      resizeMode: "contain",
      backgroundColor: "#210059"
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.hashview.app",
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "HashView needs your location to verify you are physically present at a business when posting a review (Geofencing) and to find nearby businesses.",
        NSLocationAlwaysUsageDescription:
          "HashView needs your location to notify you of nearby business offers even when the app is closed.",
        NSCameraUsageDescription:
          "HashView needs camera access to capture and upload photos of businesses, products, or reviews, and to scan QR codes.",
        NSPhotoLibraryUsageDescription:
          "HashView needs access to your photo library to let you select and upload photos for business listings, products, or user reviews.",
        ITSAppUsesNonExemptEncryption: false,
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: true
        }
      },
      buildNumber: "13",
      config: {
        googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "AIzaSyCgafT4Tw62CuxxN5DwbkqWIK9pVflKEXI"
      }
    },

    android: {
      package: "com.hashview.apps",
      versionCode: 21,
      usesCleartextTraffic: true,
      adaptiveIcon: {
        foregroundImage: "./assets/HashViewlogo-01.png",
        backgroundColor: "#FFFFFF"
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "NOTIFICATIONS"
      ],
      config: {
        googleMaps: {
          apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "AIzaSyCgafT4Tw62CuxxN5DwbkqWIK9pVflKEXI"
        }
      }
    },

    web: {
      bundler: "metro"
    },

    plugins: [
      "expo-dev-client",
      [
        "expo-build-properties",
        {
          "android": {
            "minSdkVersion": 24,
            "compileSdkVersion": 35,
            "targetSdkVersion": 35,
            "buildToolsVersion": "35.0.0",
            "extraGradleProps": {
              "ndkVersion": "28.0.12674087"
            }
          }
        }
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: "Allow HashView to use your location to find nearby businesses and verify reviews."
        }
      ],
      "expo-notifications",
      [
        "expo-image-picker",
        {
          photosPermission: "Allow HashView to access your photos to select images for business listings or reviews."
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow HashView to access your camera to capture photos for listings and scan QR codes."
        }
      ],
      [
        "expo-font",
        {
          "fonts": [
            "./assets/fonts/Ionicons.ttf",
            "./assets/fonts/MaterialIcons.ttf",
            "./assets/fonts/MaterialCommunityIcons.ttf",
            "./assets/fonts/FontAwesome.ttf",
            "./assets/fonts/Feather.ttf"
          ]
        }
      ],
      "expo-asset",
      "expo-secure-store",
      [
        "expo-splash-screen",
        {
          image: "./assets/HashViewSplash.png",
          resizeMode: "contain",
          backgroundColor: "#210059"
        }
      ]
    ],

    extra: {
      eas: {
        projectId: "d4838e65-984b-45e4-b2d8-a03d28a6fb43"
      }
    },
    owner: "hashview"
  }
};
