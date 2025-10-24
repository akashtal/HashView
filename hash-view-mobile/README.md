# Hash View Mobile App

A production-ready React Native mobile application built with Expo bare workflow, featuring real-time chat, business discovery, and comprehensive user management.

## 🚀 Features

### Authentication & User Management
- **Secure JWT Authentication** with refresh tokens
- **Role-based access control** (User, Business, Admin)
- **Email verification** and password reset flows
- **Profile management** with avatar upload
- **Push notification** token registration

### Business Discovery
- **Location-based search** with radius filtering
- **Category filtering** and text search
- **Business ratings and reviews**
- **Business gallery** with image uploads
- **Real-time business status** updates

### Real-time Chat
- **1:1 messaging** with Socket.IO
- **Message persistence** in MongoDB
- **Typing indicators** and read receipts
- **Image and file sharing**
- **Offline message queuing**

### Push Notifications
- **Expo push notifications** for Android
- **Real-time message alerts**
- **Business updates** and announcements
- **Custom notification handling**

### UI/UX Features
- **Dark/Light theme** support
- **Responsive design** for all screen sizes
- **Accessible components** with proper contrast
- **Smooth animations** and transitions
- **Offline support** with Redux Persist

## 🛠 Tech Stack

- **React Native** (Expo bare workflow)
- **Redux Toolkit** + Redux Persist
- **React Navigation v6**
- **React Native Paper** (Material Design)
- **Socket.IO Client**
- **Expo Notifications**
- **Axios** for API calls
- **AsyncStorage** for local storage

## 📱 Android 15+ Support

This app is configured to support Android 15+ with 16KB memory page sizes as required by Google Play Store.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Android Studio (for Android development)
- Expo CLI
- MongoDB Atlas account
- Cloudinary account (for image uploads)
- SendGrid account (for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hash-view-mobile
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   API_BASE_URL=http://localhost:5000/api
   SOCKET_URL=http://localhost:5000
   ```

4. **Start the development server**
   ```bash
   npm run android
   ```

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
API_BASE_URL=http://localhost:5000/api
SOCKET_URL=http://localhost:5000

# Development
NODE_ENV=development
```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── constants/          # App constants and theme
├── hooks/              # Custom React hooks
├── navigation/         # Navigation configuration
├── screens/            # Screen components
│   ├── auth/          # Authentication screens
│   ├── main/          # Main app screens
│   ├── business/      # Business-related screens
│   ├── chat/          # Chat screens
│   └── admin/         # Admin screens
├── services/           # API and external services
├── slices/            # Redux Toolkit slices
├── store/             # Redux store configuration
└── utils/             # Utility functions
```

## 🔧 Available Scripts

- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS device/simulator
- `npm run web` - Run in web browser
- `npm run build:android` - Build Android APK
- `npm run build:ios` - Build iOS app
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 📦 Building for Production

### Android

1. **Generate signed APK**
   ```bash
   npm run build:android
   ```

2. **Upload to Google Play Store**
   - Follow Google Play Console guidelines
   - Ensure 16KB memory page size support

### iOS

1. **Build for iOS**
   ```bash
   npm run build:ios
   ```

2. **Upload to App Store**
   - Use Xcode or Expo Application Services (EAS)

## 🔐 Security Features

- **JWT token rotation** with refresh tokens
- **Secure token storage** with AsyncStorage
- **Input validation** on all forms
- **Rate limiting** on API calls
- **Secure image uploads** with Cloudinary
- **HTTPS-only** API communication

## 🌐 API Integration

The app integrates with the Hash View backend API:

- **Authentication endpoints** (`/api/auth/*`)
- **User management** (`/api/users/*`)
- **Business operations** (`/api/businesses/*`)
- **Real-time chat** (Socket.IO)
- **File uploads** (`/api/upload/*`)
- **Push notifications** (`/api/notifications/*`)

## 📱 Device Requirements

- **Android**: 6.0+ (API level 23+)
- **iOS**: 12.0+
- **RAM**: 2GB minimum
- **Storage**: 100MB available space

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npx react-native start --reset-cache
   ```

2. **Android build failures**
   ```bash
   cd android && ./gradlew clean
   ```

3. **iOS build issues**
   ```bash
   cd ios && pod install
   ```

### Debug Mode

Enable debug mode in development:
```bash
npm run android -- --variant=debug
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔄 Updates

- **v1.0.0** - Initial release with core features
- **v1.1.0** - Added push notifications
- **v1.2.0** - Enhanced UI/UX
- **v1.3.0** - Android 15+ support

---

**Note**: This app requires the Hash View backend API to be running. See the backend README for setup instructions.
