# Developer Onboarding
Welcome to the HashView engineering team!

## Prerequisites
- Node.js v20+
- MongoDB instance (local or Atlas)
- Redis server (local or ElastiCache)
- Cloudinary Account
- Expo Account (for push notifications)

## Running Locally
1. Clone the repository.
2. Run `npm install` in both `/backend` and `/frontend`.
3. Copy `.env.example` to `.env` and fill in your keys.
4. Start Redis: `redis-server`
5. Start Backend: `cd backend && npm run dev`
6. Start Frontend: `cd frontend && npm start`

## Architecture
- We use an Express.js Monolith, heavily layered with Services and Controllers.
- We use Socket.IO with a Redis Adapter for multi-instance scaling.
- Read the `FUTURE_ARCHITECTURE.md` file to understand where the system is headed.
