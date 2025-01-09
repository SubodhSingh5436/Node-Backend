const User = require('./Users');
const Booking = require('./Booking');
const Seat = require('./Seat');

// User <-> Booking
Booking.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Booking, { foreignKey: 'userId' });

// Booking <-> Seat
Booking.belongsToMany(Seat, { 
  through: 'BookingSeats',
  foreignKey: 'bookingId',
  otherKey: 'seatId',
  timestamps: true
});

Seat.belongsToMany(Booking, { 
  through: 'BookingSeats',
  foreignKey: 'seatId',
  otherKey: 'bookingId',
  timestamps: true
});

module.exports = {
  User,
  Booking,
  Seat
}; 