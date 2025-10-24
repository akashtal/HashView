# Hash View - Complete Mobile App & Backend

A production-ready mobile application ecosystem built with React Native (Expo bare workflow) and Node.js + Express, featuring real-time chat, business discovery, and comprehensive user management.

## 🏗️ Project Structure

```
hash-view/
├── hash-view-mobile/     # React Native mobile app
├── hash-view-backend/    # Node.js + Express API
└── README.md            # This file
```

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Android Studio** (for Android development)
- **Expo CLI**
- **MongoDB Atlas** account
- **Cloudinary** account (for image uploads)
- **SendGrid** account (for emails)
- **Redis** instance (optional)

### 1. Backend Setup

```bash
cd hash-view-backend
npm install
cp .env.example .env
# Configure your .env file with MongoDB, Cloudinary, SendGrid credentials
npm run dev
```

The backend will start on `http://localhost:5000`

### 2. Mobile App Setup

```bash
cd hash-view-mobile
npm install
cp .env.example .env
# Configure your .env file with API URLs
npm run android
```

## 📱 Features

### Mobile App (React Native)
- **Authentication** with JWT + refresh tokens
- **Role-based navigation** (User, Business, Admin)
- **Real-time chat** with Socket.IO
- **Business discovery** with location-based search
- **Push notifications** with Expo
- **Dark/Light theme** support
- **Offline support** with Redux Persist

### Backend API (Node.js + Express)
- **RESTful API** with comprehensive endpoints
- **Real-time messaging** with Socket.IO
- **File uploads** with Cloudinary
- **Email services** with SendGrid
- **MongoDB** with Mongoose ODM
- **Security middleware** (Helmet, CORS, Rate limiting)
- **JWT authentication** with token rotation

## 🛠️ Tech Stack

### Mobile App
- **React Native** (Expo bare workflow)
- **Redux Toolkit** + Redux Persist
- **React Navigation v6**
- **React Native Paper** (Material Design)
- **Socket.IO Client**
- **Expo Notifications**
- **Axios** for API calls

### Backend API
- **Node.js** + **Express.js**
- **MongoDB** with **Mongoose**
- **Socket.IO** for real-time communication
- **JWT** for authentication
- **Cloudinary** for image storage
- **SendGrid** for email services
- **Redis** for caching (optional)

## 🔧 Development

### Backend Development

```bash
cd hash-view-backend
npm run dev          # Start development server
npm test            # Run tests
npm run lint        # Run ESLint
npm run format      # Format code
```

### Mobile Development

```bash
cd hash-view-mobile
npm run android     # Run on Android
npm run ios         # Run on iOS
npm run web         # Run on web
npm test           # Run tests
npm run lint       # Run ESLint
```

## 📚 API Documentation

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Password reset
- `GET /api/auth/verify-email` - Email verification

### Users
- `GET /api/users/profile` - Get profile
- `PATCH /api/users/profile` - Update profile
- `POST /api/users/register-push-token` - Register push token

### Businesses
- `GET /api/businesses` - List businesses
- `GET /api/businesses/:id` - Get business details
- `POST /api/businesses` - Create business
- `PATCH /api/businesses/:id` - Update business

### Chat
- `GET /api/conversations` - Get conversations
- `POST /api/conversations` - Create conversation
- `GET /api/messages` - Get messages
- `POST /api/messages` - Send message

### Uploads
- `POST /api/upload/image` - Upload image
- `POST /api/upload/avatar` - Upload avatar
- `POST /api/upload/business-gallery` - Upload business gallery

## 🧪 Testing

### Backend Tests
```bash
cd hash-view-backend
npm test
```

### Mobile Tests
```bash
cd hash-view-mobile
npm test
```

## 🚀 Deployment

### Backend Deployment

#### Heroku
```bash
cd hash-view-backend
heroku create hash-view-api
heroku config:set MONGODB_URI=your-mongodb-uri
git push heroku main
```

#### Railway
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Mobile Deployment

#### Android (Google Play Store)
```bash
cd hash-view-mobile
npm run build:android
# Upload APK to Google Play Console
```

#### iOS (App Store)
```bash
cd hash-view-mobile
npm run build:ios
# Upload to App Store Connect
```

## 🔐 Security Features

- **JWT token rotation** with refresh tokens
- **Password hashing** with bcrypt
- **Rate limiting** to prevent abuse
- **Input validation** with Joi
- **CORS** configuration
- **Helmet.js** security headers
- **Secure file uploads** with Cloudinary
- **HTTPS-only** communication

## 📱 Android 15+ Support

The mobile app is configured to support Android 15+ with 16KB memory page sizes as required by Google Play Store.

## 🐳 Docker Support

### Backend with Docker
```bash
cd hash-view-backend
docker build -t hash-view-backend .
docker run -p 5000:5000 hash-view-backend
```

### Docker Compose
```bash
docker-compose up -d
```

## 📊 Monitoring & Logging

- **Morgan** for HTTP request logging
- **Custom error handling** middleware
- **Health check** endpoints
- **Structured logging** with timestamps

## 🔄 Database Schema

### Users
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (user|business|admin),
  avatar: String,
  verified: Boolean,
  expoPushTokens: [String],
  createdAt: Date
}
```

### Businesses
```javascript
{
  _id: ObjectId,
  ownerId: ObjectId (ref: User),
  name: String,
  description: String,
  address: Object,
  location: { type: "Point", coordinates: [Number] },
  categories: [String],
  rating: { average: Number, count: Number },
  status: String (pending|approved|rejected)
}
```

### Messages
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId (ref: Conversation),
  sender: ObjectId (ref: User),
  text: String,
  type: String (text|image|file),
  mediaUrl: String,
  deliveredAt: Date,
  readAt: Date
}
```

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

3. **MongoDB connection issues**
   - Check connection string
   - Verify network access
   - Check authentication credentials

4. **JWT token issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format

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

**Note**: This project requires external services (MongoDB Atlas, Cloudinary, SendGrid) to be configured. See individual README files for detailed setup instructions.
