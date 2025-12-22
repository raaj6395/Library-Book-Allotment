# Library Book Allotment System

A full-stack web application for managing library book allotments with role-based access control. Built with React, Node.js, Express, and MongoDB.

## 🏗️ Architecture Summary

### Frontend
- **Framework**: React 18 with TypeScript
- **UI Library**: shadcn/ui components with Tailwind CSS
- **State Management**: React Context API for authentication
- **Routing**: React Router v6 with protected routes
- **HTTP Client**: Fetch API with custom API utilities

### Backend
- **Runtime**: Node.js with Express
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Email/password authentication with bcrypt for password hashing
- **Validation**: express-validator

### Key Features
- Role-based authentication (Admin/User)
- Admin dashboard with 3 main sections:
  - Add/Manage Books
  - Add/Manage Users with printable credentials
  - Run Allotment Events
- User book preference selection (up to 5 books)
- First-come-first-serve allotment algorithm
- Waitlist management for oversubscribed books

## 📁 Project Structure

```
Library-Book-Allotment/
├── server/                 # Backend API
│   ├── models/            # MongoDB models
│   │   ├── User.js
│   │   ├── Book.js
│   │   ├── Preference.js
│   │   ├── Allotment.js
│   │   └── AllotmentEvent.js
│   ├── routes/            # API routes
│   │   ├── auth.js
│   │   ├── books.js
│   │   ├── users.js
│   │   ├── preferences.js
│   │   └── allotment.js
│   ├── middleware/        # Auth middleware
│   │   └── auth.js
│   ├── scripts/           # Utility scripts
│   │   └── seed.js
│   └── server.js          # Express server
├── src/                   # Frontend React app
│   ├── components/
│   │   ├── admin/         # Admin-specific components
│   │   │   ├── AddBookForm.tsx
│   │   │   ├── AddUserForm.tsx
│   │   │   ├── AllotmentSection.tsx
│   │   │   └── UserCredentialsPrint.tsx
│   │   ├── ui/            # shadcn/ui components
│   │   └── ProtectedRoute.tsx
│   ├── contexts/
│   │   └── AuthContext.tsx
│   ├── lib/
│   │   └── api.ts         # API client utilities
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── AdminDashboard.tsx
│   │   └── UserBookSelection.tsx
│   └── App.tsx
└── package.json
```

## 🗄️ Database Schema

### User Model
```javascript
{
  name: String (required),
  email: String (required, unique),
  registrationNumber: String (required, unique),
  password: String (hashed),
  role: 'admin' | 'user',
  course: String,
  batch: String,
  specialization: String,
  createdAt: Date
}
```

### Book Model
```javascript
{
  title: String (required),
  author: String (required),
  isbnOrBookId: String (required, unique),
  category: String,
  totalCopies: Number (required, min: 1),
  availableCopies: Number (required, min: 0),
  description: String,
  createdAt: Date
}
```

### Preference Model
```javascript
{
  userId: ObjectId (ref: User, required, unique),
  rankedBookIds: [ObjectId] (ref: Book, 1-5 items),
  submittedAt: Date
}
```

### Allotment Model
```javascript
{
  eventId: ObjectId (ref: AllotmentEvent, required),
  userId: ObjectId (ref: User, required),
  bookId: ObjectId (ref: Book, required),
  status: 'allotted' | 'waitlisted',
  createdAt: Date
}
```

### AllotmentEvent Model
```javascript
{
  runAt: Date,
  runByAdminId: ObjectId (ref: User, required)
}
```

## 🛣️ API Routes

### Authentication
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Books (Protected)
- `GET /api/books` - Get all books
- `GET /api/books/:id` - Get single book
- `POST /api/books` - Create book (Admin only)
- `PUT /api/books/:id` - Update book (Admin only)
- `DELETE /api/books/:id` - Delete book (Admin only)

### Users (Admin only)
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get single user
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user

### Preferences
- `GET /api/preferences/me` - Get current user's preferences
- `POST /api/preferences` - Submit/update preferences
- `GET /api/preferences/all` - Get all preferences (Admin only)

### Allotment
- `POST /api/allotment/run` - Run allotment event (Admin only)
- `GET /api/allotment/results/:eventId` - Get allotment results (Admin only)
- `GET /api/allotment/events` - Get all allotment events (Admin only)
- `GET /api/allotment/my-allocation` - Get user's allocation

## 🚀 Setup & Installation

### Prerequisites
- Node.js 18+ and npm
- MongoDB (local or MongoDB Atlas connection string)

### Backend Setup

1. Navigate to server directory:
```bash
cd server
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env` with your MongoDB connection:
```env
MONGODB_URI=mongodb://localhost:27017/library-book-allotment
PORT=3001
```

5. Seed the database (optional):
```bash
npm run seed
```

6. Start the server:
```bash
npm run dev
```

The server will run on `http://localhost:3001`

### Frontend Setup

1. Navigate to project root:
```bash
cd ..
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file:
```bash
cp .env.example .env
```

4. Update `.env`:
```env
VITE_API_URL=http://localhost:3001/api
```

5. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:8080`

## 👤 Default Credentials

After running the seed script, you can login with:

**Admin:**
- Email: `admin@library.com`
- Password: `admin123`

**User 1:**
- Email: `john.doe@student.com`
- Password: `user123`

**User 2:**
- Email: `jane.smith@student.com`
- Password: `user123`

## 📱 UI Screens

### 1. Login Page (`/login`)
- Email/registration and password fields
- Demo credentials displayed
- Redirects to `/admin` or `/user` based on role

### 2. Admin Dashboard (`/admin`)
Three tabs:

**A) Add Book Tab**
- Form fields: Title, Author, ISBN/Book ID, Category, Total Copies, Description
- Validation for required fields and unique ISBN
- Success/error toast notifications

**B) Add User Tab**
- Form fields: Name, Email, Registration Number, Course, Batch, Specialization
- Auto-generates random password
- Shows printable credentials form after creation
- Print button for user credentials sheet

**C) Run Allotment Tab**
- Button to trigger allotment process
- Shows previous allotment events
- Displays results table with:
  - User name and registration
  - Allocated book and author
  - Status (allotted/waitlisted)

### 3. User Book Selection (`/user`)
- Table of all available books
- Checkbox selection (up to 5 books)
- Priority display for selected books
- Shows submitted preferences
- Displays allocation result if available
- Submit preferences button

## 🔐 Authentication Flow

1. User submits login form
2. Backend validates credentials and returns user data
3. Email/password stored in localStorage
4. Email/password included in request headers for all API requests
5. Protected routes check authentication via middleware
6. Admin routes additionally check for admin role

## 📊 Allotment Algorithm

1. Get all user preferences sorted by submission time (first-come-first-serve)
2. For each user, iterate through their ranked book preferences
3. If book has available copies:
   - Allocate book to user
   - Decrement available copies
   - Mark as "allotted"
4. If no book available, waitlist user's first preference
5. Store results in Allotment collection linked to AllotmentEvent

## 🧪 Example API Requests

### Login
```bash
POST http://localhost:3001/api/auth/login
Content-Type: application/json

{
  "email": "admin@library.com",
  "password": "admin123"
}

Response:
{
  "user": {
    "id": "...",
    "name": "Admin User",
    "email": "admin@library.com",
    "role": "admin"
  }
}
```

### Create Book (Admin)
```bash
POST http://localhost:3001/api/books
x-user-email: user@example.com
x-user-password: password123
Content-Type: application/json

{
  "title": "Introduction to Algorithms",
  "author": "Thomas H. Cormen",
  "isbnOrBookId": "B001",
  "category": "Computer Science",
  "totalCopies": 5,
  "description": "Comprehensive guide to algorithms"
}
```

### Create User (Admin)
```bash
POST http://localhost:3001/api/users
x-user-email: user@example.com
x-user-password: password123
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@student.com",
  "registrationNumber": "STU001",
  "course": "Computer Science",
  "batch": "2024",
  "specialization": "Software Engineering"
}

Response includes tempPassword for printing
```

### Submit Preferences (User)
```bash
POST http://localhost:3001/api/preferences
x-user-email: user@example.com
x-user-password: password123
Content-Type: application/json

{
  "rankedBookIds": ["book_id_1", "book_id_2", "book_id_3"]
}
```

### Run Allotment (Admin)
```bash
POST http://localhost:3001/api/allotment/run
x-user-email: user@example.com
x-user-password: password123

Response:
{
  "eventId": "...",
  "runAt": "2024-01-01T00:00:00.000Z",
  "totalAllocations": 10,
  "totalWaitlists": 2,
  "results": [...]
}
```

## 🛡️ Security Features

- Password hashing with bcrypt (10 rounds)
- Email/password-based authentication
- Role-based access control (RBAC)
- Input validation with express-validator
- Unique constraints on email and registration number
- Protected API routes with middleware

## 🎨 UI/UX Features

- Responsive design (mobile-friendly)
- Modern, clean interface with Tailwind CSS
- Toast notifications for user feedback
- Loading states for async operations
- Form validation with error messages
- Printable user credentials sheet
- Clear navigation and role-based UI

## 📝 Notes

- The allotment algorithm uses first-come-first-serve based on preference submission time
- Users can update their preferences before an allotment is run
- Books' available copies are automatically decremented on allocation
- Waitlisted users are assigned to their first preference book
- Admin can view all previous allotment events and their results

## 🔧 Troubleshooting

**MongoDB Connection Error:**
- Ensure MongoDB is running locally or check your connection string
- For MongoDB Atlas, ensure your IP is whitelisted

**CORS Errors:**
- Ensure backend CORS is configured correctly
- Check that frontend API URL matches backend port

**Authentication Issues:**
- Clear localStorage and login again
- Verify email/password are being sent in request headers

## 📄 License

This project is open source and available for educational purposes.
