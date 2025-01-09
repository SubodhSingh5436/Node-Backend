const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Seat = require('../models/Seat');
const { Op } = require('sequelize');
const Booking = require('../models/Booking');
const User = require('../models/Users');
const sequelize = require('../config/database');

// Get all seats
router.get('/', auth, async (req, res) => {
  try {
    const { available, row } = req.query;
    let whereClause = {};
    
    if (available === 'true') {
      whereClause.status = 'available';
    }
    if (row) {
      whereClause.rowNumber = row;
    }

    const seats = await Seat.findAll({ where: whereClause });
    res.json(seats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching seats', error: error.message });
  }
});

// Reset all seats (admin only)
router.post('/reset', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    if (!req.user.is_admin) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Update all active bookings to cancelled
    await Booking.update(
      { status: 'cancelled' },
      { 
        where: { status: 'active' },
        transaction: t 
      }
    );

    // Reset all seats to available
    await Seat.update(
      { status: 'available', isBooked: false },
      { 
        where: {},
        transaction: t 
      }
    );

    await t.commit();
    res.json({ 
      message: 'All seats and bookings reset successfully'
    });
  } catch (error) {
    await t.rollback();
    console.error('Reset error:', error);
    res.status(500).json({ 
      message: 'Error resetting seats and bookings', 
      error: error.message 
    });
  }
});

// Add this new route
router.get('/count', auth, async (req, res) => {
  try {
    const availableCount = await Seat.count({
      where: { status: 'available' }
    });
    const totalCount = await Seat.count();
    
    res.json({
      available: availableCount,
      total: totalCount
    });
  } catch (error) {
    res.status(500).json({ message: 'Error counting seats', error: error.message });
  }
});

// Get available seats with positions
router.get('/available', auth, async (req, res) => {
  try {
    const availableSeats = await Seat.findAll({
      where: { status: 'available' },
      attributes: ['seatId', 'rowNumber', 'seatNumber'],
      order: [['rowNumber', 'ASC'], ['seatNumber', 'ASC']]
    });

    const formattedSeats = availableSeats.map(seat => ({
      seatId: seat.seatId,
      position: {
        row: seat.rowNumber,
        seatNumber: seat.seatNumber
      }
    }));

    res.json(formattedSeats);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching available seats', error: error.message });
  }
});

// Get user's booked seats
router.get('/my-bookings', auth, async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { 
        userId: req.user.userId,
        status: 'active'
      },
      include: [{
        model: Seat,
        attributes: ['seatId', 'rowNumber', 'seatNumber']
      }]
    });

    const bookedSeats = bookings.flatMap(booking => 
      booking.Seats.map(seat => ({
        bookingId: booking.bookingId,
        seatId: seat.seatId,
        position: {
          row: seat.rowNumber,
          seatNumber: seat.seatNumber
        }
      }))
    );

    res.json({
      seats: bookedSeats,
      totalBookedSeats: bookedSeats.length,
      remainingAllowed: 7 - bookedSeats.length
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching booked seats', error: error.message });
  }
});

// Get all users with their booked seats
router.get('/user-bookings', auth, async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['userId', 'name', 'email', 'phoneNumber'],
      include: [{
        model: Booking,
        where: { status: 'active' },
        required: false,
        include: [{
          model: Seat,
          attributes: ['seatId', 'rowNumber', 'seatNumber']
        }]
      }]
    });

    const formattedUsers = users.map(user => ({
      userId: user.userId,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      bookings: user.Bookings.map(booking => ({
        bookingId: booking.bookingId,
        seats: booking.Seats.map(seat => ({
          seatId: seat.seatId,
          position: {
            row: seat.rowNumber,
            seatNumber: seat.seatNumber
          }
        }))
      })),
      totalBookedSeats: user.Bookings.reduce((total, booking) => 
        total + booking.Seats.length, 0
      )
    }));

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ 
      message: 'Error fetching user bookings', 
      error: error.message 
    });
  }
});

module.exports = router; 