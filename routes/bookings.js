const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Booking = require('../models/Booking');
const Seat = require('../models/Seat');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

// Function to find cluster placement for seats
function findClusterPlacement(m, n, occupiedCells, k) {
  const grid = Array.from({ length: m }, () => Array(n).fill(0));
  occupiedCells.forEach(([x, y]) => {
      grid[x][y] = 1;
  });

  // Priority 1: Horizontal consecutive seats in the same row
  for (let r = 0; r < m; r++) {
      for (let c = 0; c <= n - k; c++) {
          let consecutive = true;
          for (let i = 0; i < k; i++) {
              if (grid[r][c + i] === 1) {
                  consecutive = false;
                  break;
              }
          }
          if (consecutive) {
              return Array.from({ length: k }, (_, i) => [r, c + i]);
          }
      }
  }

  // Priority 2: Clustered arrangement across adjacent rows
  for (let r = 0; r < m - 1; r++) {
      for (let c = 0; c <= n - k; c++) {
          let cluster = [];
          for (let i = 0; i < k; i++) {
              if (grid[r][c + i] === 0) cluster.push([r, c + i]);
              if (grid[r + 1][c + i] === 0) cluster.push([r + 1, c + i]);
          }
          if (cluster.length >= k) {
              return cluster.slice(0, k);
          }
      }
  }

  // Fallback: Any available seats
  const availableSeats = [];
  for (let i = 0; i < m; i++) {
      for (let j = 0; j < n; j++) {
          if (grid[i][j] === 0) {
              availableSeats.push([i, j]);
          }
      }
  }

  if (availableSeats.length >= k) {
      return availableSeats.slice(0, k);
  }

  return null; // No suitable placement found
}

// API route for booking seats
router.post('/', auth, async (req, res) => {
  // const t = await sequelize.transaction();
  const transaction = await Seat.sequelize.transaction();
  try {
      const { numberOfSeats } = req.body;

      if (!numberOfSeats || numberOfSeats < 1 || numberOfSeats > 7) {
          return res.status(400).json({
              message: 'Please select between 1 and 7 seats'
          });
      }

      // Check user's existing active bookings
      const userBookedSeats = await Booking.findAll({
          where: {
              userId: req.user.userId,
              status: 'active'
          },
          include: [{ model: Seat }],
          transaction: t
      });

      
      const totalBookedSeats = userBookedSeats.reduce((total, booking) =>
          total + booking.Seats.length, 0
      );

      if (totalBookedSeats + numberOfSeats > 7) {
          await t.rollback();
          return res.status(400).json({
              message: 'You can only book a maximum of 7 seats',
              currentlyBooked: totalBookedSeats,
              remainingAllowed: 7 - totalBookedSeats
          });
      }

      const sameRowSeats = await Seat.findAll({
        where: {
          isBooked: false,
        },
        attributes: ["rowNumber", [sequelize.fn("COUNT", sequelize.col("seatId")), "availableSeats"]],
        group: ["rowNumber"],
        having: sequelize.literal(`COUNT(*) >= ${requestedSeats}`),
        order: [["rowNumber", "ASC"]],
        transaction,
      });

      let selectedSeats = [];
    if (sameRowSeats.length > 0) {
      // Pick the first eligible row
      const targetRowNumber = sameRowSeats[0].rowNumber;
      selectedSeats = await Seat.findAll({
        where: {
          rowNumber: targetRowNumber,
          isBooked: false,
        },
        order: [["seatNumber", "ASC"]],
        limit: requestedSeats,
        transaction,
      });
    } else {
      // Step 2: Find nearby available seats
      selectedSeats = await Seat.findAll({
        where: {
          isBooked: false,
        },
        order: [["rowNumber", "ASC"], ["seatNumber", "ASC"]],
        limit: requestedSeats,
        transaction,
      });
    }

    if (selectedSeats.length === requestedSeats) {
      const selectedSeatIds = selectedSeats.map((seat) => seat.seatId);
      await Seat.update(
        { isBooked: true, status: "booked", updatedAt: new Date() },
        { where: { seatId: { [Op.in]: selectedSeatIds } }, transaction }
      );
      await transaction.commit(); // Commit the transaction

      console.log(`Seats booked successfully: ${selectedSeatIds}`);
      return selectedSeatIds;
    } else {
      throw new Error("Not enough seats available to fulfill the request.");
    }
      
      // // Get all seats and their status
      // const allSeats = await Seat.findAll({
      //     attributes: ['seatId', 'rowNumber', 'seatNumber', 'status'],
      //     order: [['rowNumber', 'ASC'], ['seatNumber', 'ASC']],
      //     transaction: t
      // });

      // // Create occupied cells array
      // const occupiedCells = allSeats
      //     .filter(seat => seat.status !== 'available')
      //     .map(seat => [seat.rowNumber - 1, seat.seatNumber - 1]);

      // // Find best cluster of seats
      // const seatCluster = findClusterPlacement(12, 7, occupiedCells, numberOfSeats);

      // if (!seatCluster) {
      //     await t.rollback();
      //     return res.status(400).json({
      //         message: 'Could not find suitable seats together'
      //     });
      // }

      // // Map cluster coordinates back to actual seats
      // const seatsToBook = seatCluster.map(([row, col]) => {
      //     return allSeats.find(seat =>
      //         seat.rowNumber === row + 1 &&
      //         seat.seatNumber === col + 1
      //     );
      // }).filter(seat => seat && seat.status === 'available');

      // if (seatsToBook.length < numberOfSeats) {
      //     await t.rollback();
      //     return res.status(400).json({
      //         message: 'Not enough seats available in the desired arrangement'
      //     });
      // }

      // // Create booking
      // const booking = await Booking.create({
      //     userId: req.user.userId
      // }, { transaction: t });

      // // Update seats status
      // await Seat.update(
      //     { status: 'booked', isBooked: true },
      //     {
      //         where: { seatId: { [Op.in]: seatsToBook.map(seat => seat.seatId) } },
      //         transaction: t
      //     }
      // );

      // await booking.addSeats(seatsToBook, { transaction: t });
      // await t.commit();

      // // Format seat information for response
      // const bookedSeats = seatsToBook.map(seat => ({
      //     seatId: seat.seatId,
      //     position: {
      //         row: seat.rowNumber,
      //         seatNumber: seat.seatNumber
      //     }
      // }));

        res.status(201).json({
          message: 'Booking successful',
          bookingId: booking.bookingId,
          seats: bookedSeats,
          totalSeatsBooked: bookedSeats.length
      });
  } catch (error) {
      await t.rollback();
      res.status(500).json({ message: 'Error creating booking', error: error.message });
  }
});


// Get user's bookings
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.findAll({
      where: { userId: req.user.userId },
      include: [{ model: Seat }]
    });
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bookings', error: error.message });
  }
});


router.delete('/cancel-all', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    // Find all active bookings for the user
    const userBookings = await Booking.findAll({
      where: {
        userId: req.user.userId,
        status: 'active'
      },
      include: [{ model: Seat }],
      transaction: t
    });

    if (userBookings.length === 0) {
      await t.rollback();
      return res.status(404).json({ message: 'No active bookings found' });
    }

    // Get all seat IDs from all bookings
    const seatIds = userBookings.flatMap(booking => 
      booking.Seats.map(seat => seat.seatId)
    );

    // Update all seats to available
    await Seat.update(
      { status: 'available', isBooked: false },
      { 
        where: { seatId: { [Op.in]: seatIds } },
        transaction: t 
      }
    );

    // Update all bookings to cancelled
    await Booking.update(
      { status: 'cancelled' },
      {
        where: {
          userId: req.user.userId,
          status: 'active'
        },
        transaction: t
      }
    );

    await t.commit();

    res.json({ 
      message: 'All bookings cancelled successfully',
      cancelledBookings: userBookings.length,
      seatsReleased: seatIds.length
    });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Error cancelling bookings', error: error.message });
  }
});

module.exports = router; 