# Quick Setup Guide

## Step-by-Step Installation

### 1. Backend Setup

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
MONGODB_URI=mongodb://localhost:27017/library-book-allotment
PORT=3001
EOF

# Seed database (optional - creates admin and sample users)
npm run seed

# Start server
npm run dev
```

The backend will run on `http://localhost:3001`

### 2. Frontend Setup

```bash
# From project root
cd ..

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:3001/api
EOF

# Start development server
npm run dev
```

The frontend will run on `http://localhost:8080`

### 3. Access the Application

1. Open browser to `http://localhost:8080`
2. You'll be redirected to the login page
3. Use default credentials:
   - **Admin**: `admin@library.com` / `admin123`
   - **User**: `john.doe@student.com` / `user123`

## MongoDB Setup Options

### Option 1: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Use connection string: `mongodb://localhost:27017/library-book-allotment`

### Option 2: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string
4. Update `.env` with your Atlas connection string:
   ```
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/library-book-allotment
   ```

## Troubleshooting

### Port Already in Use
- Backend: Change `PORT` in `server/.env`
- Frontend: Change port in `vite.config.ts`

### MongoDB Connection Failed
- Ensure MongoDB is running
- Check connection string in `.env`
- For Atlas: Whitelist your IP address

### CORS Errors
- Ensure backend is running before frontend
- Check `VITE_API_URL` matches backend URL

### Authentication Issues
- Clear browser localStorage
- Re-run seed script to reset passwords

## Production Build

### Backend
```bash
cd server
npm start
```

### Frontend
```bash
npm run build
npm run preview
```

## Next Steps

1. **Customize**: Update seed data in `server/scripts/seed.js`
2. **Secure**: Ensure strong passwords are used for all users
3. **Deploy**: Follow deployment guides for your hosting platform
4. **Monitor**: Add logging and error tracking as needed

