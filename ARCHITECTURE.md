# Architecture Documentation

## System Overview

The Library Book Allotment System is a full-stack application with clear separation between frontend and backend, using RESTful API communication.

## Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Client-side routing
- **React Hook Form** - Form management
- **TanStack Query** - Data fetching (optional, for future use)

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **bcryptjs** - Password hashing
- **bcryptjs** - Password hashing
- **express-validator** - Input validation

## Data Flow

### Authentication Flow
```
1. User submits login form
   ↓
2. Frontend sends POST /api/auth/login
   ↓
3. Backend validates credentials
   ↓
4. Backend returns user data
   ↓
5. Frontend stores email/password in localStorage
   ↓
6. Frontend includes email/password in request headers for all requests
   ↓
7. Backend middleware validates credentials on protected routes
```

### Book Allotment Flow
```
1. Users submit preferences via POST /api/preferences
   ↓
2. Preferences stored with submission timestamp
   ↓
3. Admin triggers allotment via POST /api/allotment/run
   ↓
4. Backend:
   a. Creates AllotmentEvent
   b. Gets all preferences sorted by submission time
   c. For each user, tries to allocate from their preferences
   d. Decrements available copies
   e. Creates Allotment records
   ↓
5. Results returned to admin
   ↓
6. Users can view their allocation via GET /api/allotment/my-allocation
```

## Security Architecture

### Authentication
- Email/password authentication
- Credentials stored in localStorage
- Credential validation on every protected route

### Authorization
- Role-based access control (RBAC)
- Admin routes protected with `requireAdmin` middleware
- User routes protected with `authenticate` middleware

### Data Validation
- Input validation on all API endpoints using express-validator
- Unique constraints on email and registration number
- Password hashing with bcrypt (10 rounds)

## API Design

### RESTful Principles
- GET for retrieval
- POST for creation
- PUT for updates
- DELETE for removal
- Consistent error responses
- Proper HTTP status codes

### Error Handling
```json
{
  "error": "Error message",
  "errors": [] // For validation errors
}
```

## Database Design

### Relationships
- User → Preference (1:1)
- User → Allotment (1:many)
- Book → Preference (many:many via rankedBookIds)
- Book → Allotment (1:many)
- AllotmentEvent → Allotment (1:many)

### Indexes
- User: email (unique), registrationNumber (unique)
- Book: isbnOrBookId (unique)
- Preference: userId (unique)
- Allotment: eventId, userId, bookId (indexed for queries)

## Frontend Architecture

### Component Structure
```
App
├── AuthProvider (Context)
├── Router
    ├── Login (Public)
    ├── AdminDashboard (Protected, Admin)
    │   ├── AddBookForm
    │   ├── AddUserForm
    │   │   └── UserCredentialsPrint
    │   └── AllotmentSection
    └── UserBookSelection (Protected)
```

### State Management
- **AuthContext**: Global authentication state
- **Local State**: Component-specific state with useState
- **API Calls**: Direct fetch calls with error handling

### Routing
- Public routes: `/login`
- Protected routes: `/admin`, `/user`
- Default redirect: `/` → `/login`
- 404 handling: `*` → NotFound

## Backend Architecture

### Middleware Stack
```
Request
  ↓
CORS
  ↓
JSON Parser
  ↓
Route Handler
  ↓
Authentication Middleware (if protected)
  ↓
Authorization Middleware (if admin)
  ↓
Validation Middleware
  ↓
Controller Logic
  ↓
Response
```

### Error Handling
- Try-catch blocks in all async routes
- Consistent error response format
- Error logging to console (add proper logging in production)

## Scalability Considerations

### Current Limitations
- Single server instance
- No caching layer
- No rate limiting
- Synchronous allotment processing

### Future Improvements
- Redis for session management
- Rate limiting middleware
- Background job queue for allotment
- Database connection pooling
- API response caching
- Horizontal scaling with load balancer

## Deployment Architecture

### Recommended Setup
```
Frontend (Vercel/Netlify)
  ↓
Backend API (Railway/Render/Heroku)
  ↓
MongoDB Atlas (Cloud)
```

### Environment Variables
- Frontend: `VITE_API_URL`
- Backend: `MONGODB_URI`, `PORT`

## Testing Strategy (Future)

### Unit Tests
- API route handlers
- Utility functions
- Validation logic

### Integration Tests
- Authentication flow
- Book creation flow
- Allotment process

### E2E Tests
- Complete user journeys
- Admin workflows
- Error scenarios

