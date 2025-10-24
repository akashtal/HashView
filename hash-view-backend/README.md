# Hash View Backend API

A production-ready Node.js + Express backend API for the Hash View mobile application, featuring real-time chat, business management, and comprehensive user authentication.

## 🚀 Features

### Authentication & Authorization
- **JWT-based authentication** with access and refresh tokens
- **Role-based access control** (User, Business, Admin)
- **Password hashing** with bcrypt
- **Email verification** and password reset flows
- **Token blacklisting** for secure logout
- **Rate limiting** and security middleware

### Business Management
- **CRUD operations** for businesses
- **Location-based search** with MongoDB geospatial queries
- **Category filtering** and text search
- **Image uploads** with Cloudinary integration
- **Business ratings and reviews**
- **Status management** (pending, approved, rejected)

### Real-time Chat
- **Socket.IO integration** for real-time messaging
- **Message persistence** in MongoDB
- **Typing indicators** and read receipts
- **Conversation management**
- **Push notifications** for offline users

### File Management
- **Image uploads** to Cloudinary
- **Signed URL generation** for direct uploads
- **File validation** and size limits
- **Automatic image optimization**

### Push Notifications
- **Expo push notifications** for mobile devices
- **Bulk notification sending**
- **Notification templates**
- **Delivery tracking**

## 🛠 Tech Stack

- **Node.js** 18+
- **Express.js** - Web framework
- **MongoDB** with Mongoose ODM
- **Socket.IO** - Real-time communication
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **Cloudinary** - Image storage
- **SendGrid** - Email service
- **Redis** - Caching and session storage
- **Joi** - Input validation
- **Helmet** - Security middleware

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account
- Redis instance (optional)
- Cloudinary account
- SendGrid account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hash-view-backend
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
   # Server Configuration
   PORT=5000
   NODE_ENV=development
   
   # Database
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hashview
   
   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
   
   # Email Configuration
   SENDGRID_API_KEY=your-sendgrid-api-key
   FROM_EMAIL=noreply@hashview.com
   
   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

## 📁 Project Structure

```
src/
├── config/             # Database and Redis configuration
├── controllers/        # Route controllers
├── middleware/         # Custom middleware
├── models/            # Mongoose models
├── routes/            # API routes
├── services/          # Business logic services
├── utils/             # Utility functions
└── __tests__/         # Test files
```

## 🔧 Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run test suite
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## 📚 API Documentation

### Authentication Endpoints

- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Send password reset email
- `POST /api/auth/reset-password` - Reset password with token
- `GET /api/auth/verify-email` - Verify email address

### User Endpoints

- `GET /api/users/profile` - Get user profile
- `PATCH /api/users/profile` - Update user profile
- `POST /api/users/register-push-token` - Register push token
- `GET /api/users/:id` - Get user by ID

### Business Endpoints

- `GET /api/businesses` - Get businesses with filters
- `GET /api/businesses/:id` - Get business by ID
- `POST /api/businesses` - Create business
- `PATCH /api/businesses/:id` - Update business
- `GET /api/businesses/categories` - Get business categories

### Chat Endpoints

- `GET /api/conversations` - Get user conversations
- `POST /api/conversations` - Create conversation
- `GET /api/conversations/:id` - Get conversation by ID
- `GET /api/messages` - Get messages for conversation
- `POST /api/messages` - Send message

### Upload Endpoints

- `POST /api/upload/image` - Upload image
- `POST /api/upload/avatar` - Upload user avatar
- `POST /api/upload/business-gallery` - Upload business gallery image
- `DELETE /api/upload/:publicId` - Delete uploaded file

### Notification Endpoints

- `POST /api/notifications/send` - Send push notification
- `POST /api/notifications/send-to-all` - Send notification to all users

## 🧪 Testing

Run the test suite:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## 🐳 Docker Support

### Using Docker Compose

1. **Start services**
   ```bash
   docker-compose up -d
   ```

2. **Stop services**
   ```bash
   docker-compose down
   ```

### Dockerfile

The project includes a Dockerfile for containerized deployment:

```bash
docker build -t hash-view-backend .
docker run -p 5000:5000 hash-view-backend
```

## 🚀 Deployment

### Heroku

1. **Install Heroku CLI**
2. **Login to Heroku**
   ```bash
   heroku login
   ```

3. **Create Heroku app**
   ```bash
   heroku create hash-view-api
   ```

4. **Set environment variables**
   ```bash
   heroku config:set MONGODB_URI=your-mongodb-uri
   heroku config:set JWT_SECRET=your-jwt-secret
   # ... other variables
   ```

5. **Deploy**
   ```bash
   git push heroku main
   ```

### Railway

1. **Connect GitHub repository**
2. **Set environment variables**
3. **Deploy automatically**

### Vercel

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

## 🔐 Security Features

- **Helmet.js** for security headers
- **CORS** configuration
- **Rate limiting** to prevent abuse
- **Input validation** with Joi
- **Password hashing** with bcrypt
- **JWT token rotation**
- **SQL injection** protection
- **XSS protection**

## 📊 Monitoring & Logging

- **Morgan** for HTTP request logging
- **Custom error handling** middleware
- **Structured logging** with timestamps
- **Health check** endpoint (`/health`)

## 🔄 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  role: String (user|business|admin),
  avatar: String,
  phone: String,
  verified: Boolean,
  expoPushTokens: [String],
  lastSeen: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Businesses Collection
```javascript
{
  _id: ObjectId,
  ownerId: ObjectId (ref: User),
  name: String,
  description: String,
  address: Object,
  location: { type: "Point", coordinates: [Number] },
  categories: [String],
  gallery: [Object],
  rating: { average: Number, count: Number },
  status: String (pending|approved|rejected),
  createdAt: Date,
  updatedAt: Date
}
```

### Messages Collection
```javascript
{
  _id: ObjectId,
  conversationId: ObjectId (ref: Conversation),
  sender: ObjectId (ref: User),
  text: String,
  type: String (text|image|file),
  mediaUrl: String,
  deliveredAt: Date,
  readAt: Date,
  createdAt: Date
}
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB connection issues**
   - Check connection string
   - Verify network access
   - Check authentication credentials

2. **JWT token issues**
   - Verify JWT_SECRET is set
   - Check token expiration
   - Ensure proper token format

3. **Cloudinary upload failures**
   - Verify API credentials
   - Check file size limits
   - Ensure proper file format

### Debug Mode

Enable debug mode:
```bash
DEBUG=* npm run dev
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
- Check the API documentation

---

**Note**: This API requires MongoDB Atlas and other external services to be configured. See the environment variables section for required services.
