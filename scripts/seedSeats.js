const Seat = require('../models/Seat');
const sequelize = require('../config/database');

async function seedSeats() {
  try {
    await sequelize.sync({ force: true });

    let totalSeats = 0;
    // Create 11 rows: first 11 rows with 7 seats each, last row with 3 seats
    for (let row = 1; row <= 12; row++) {
      const seatsInRow = row === 12 ? 3 : 7;
      for (let seatNum = 1; seatNum <= seatsInRow; seatNum++) {
        await Seat.create({
          rowNumber: row,
          seatNumber: seatNum,
          status: 'available',
          isBooked: false
        });
        totalSeats++;
      }
    }

    console.log(`Seats seeded successfully. Total seats created: ${totalSeats}`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding seats:', error);
    process.exit(1);
  }
}

seedSeats(); 