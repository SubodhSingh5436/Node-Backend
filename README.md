# Theater Seat Booking API

A robust Node.js backend API for managing theater seat bookings with user authentication and admin controls.

## Features

- User Authentication (Signup/Login)
- Seat Management
- Booking System with Smart Seat Selection
- Admin Controls
- Real-time Seat Status Updates

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- Sequelize ORM
- JWT Authentication
- bcrypt for Password Hashing

## Database Schema

### Users
- UUID primary key
- Name
- Phone Number
- Email (unique)
- Password (hashed)
- Admin status

### Seats
- Seat ID
- Row Number
- Seat Number
- Booking Status
- Availability Status

### Bookings
- UUID primary key
- User ID (foreign key)
- Status (active/cancelled)
- Timestamps

## API Endpoints

### Authentication
- POST `/api/auth/signup` - Register new user
- POST `/api/auth/login` - User login
- GET `/api/auth/users` - Get all users (admin only)

### Seats
- GET `/api/seats` - Get all seats
- GET `/api/seats/available` - Get available seats
- GET `/api/seats/count` - Get seat statistics
- POST `/api/seats/reset` - Reset all seats (admin only)
- GET `/api/seats/my-bookings` - Get user's booked seats
- GET `/api/seats/user-bookings` - Get all users' bookings (admin only)

### Bookings
- POST `/api/bookings` - Create new booking
- GET `/api/bookings` - Get user's bookings
- DELETE `/api/bookings/cancel-all` - Cancel all user's bookings

## Installation

1. Clone the repository
2. Install dependencies:

bash
npm install

3. Create a `.env` file with the following variables:
env
DB_NAME=your_database_name
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_HOST=localhost
DB_PORT=5432
JWT_SECRET=your_jwt_secret


4. Initialize the database:
bash
node scripts/seedSeats.js


5. Start the server:
bash
npm start


## Seat Layout

- Total Rows: 12
- Seats per Row: 7 (Rows 1-11)
- Last Row: 3 seats
- Total Seats: 80

## Business Rules

- Maximum 7 seats per user
- Smart seat allocation prioritizing:
  1. Consecutive seats in the same row
  2. Clustered seats in adjacent rows
  3. Any available seats as fallback
- Admin can reset all bookings and seat status

## Error Handling

- Comprehensive error handling for:
  - Authentication failures
  - Booking conflicts
  - Database operations
  - Invalid requests
  - Server errors

## Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Protected admin routes
- Transaction-based booking operations

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License

