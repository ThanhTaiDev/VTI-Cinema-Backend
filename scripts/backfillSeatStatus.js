const prisma = require('../src/prismaClient');

/**
 * Backfill SeatStatus from existing Seat.status data
 */
async function backfillSeatStatus() {
  console.log('[Backfill] Starting SeatStatus backfill...');

  try {
    // Get all seats with status
    const seats = await prisma.seat.findMany({
      where: {
        status: {
          in: ['HELD', 'SOLD'],
        },
      },
    });

    console.log(`[Backfill] Found ${seats.length} seats with HELD or SOLD status`);

    if (seats.length === 0) {
      console.log('[Backfill] No seats to backfill');
      return;
    }

    // Group by screeningId
    const seatsByScreening = {};
    seats.forEach(seat => {
      if (!seatsByScreening[seat.screeningId]) {
        seatsByScreening[seat.screeningId] = [];
      }
      seatsByScreening[seat.screeningId].push(seat);
    });

    let createdCount = 0;
    let updatedCount = 0;

    // Process each screening
    for (const [screeningId, screeningSeats] of Object.entries(seatsByScreening)) {
      for (const seat of screeningSeats) {
        try {
          // Check if SeatStatus already exists
          const existingStatus = await prisma.seatStatus.findUnique({
            where: {
              screeningId_seatId: {
                screeningId,
                seatId: seat.id,
              },
            },
          });

          if (existingStatus) {
            // Update existing status
            await prisma.seatStatus.update({
              where: { id: existingStatus.id },
              data: {
                status: seat.status,
                holdToken: seat.holdToken,
                holdUserId: seat.holdUserId,
                holdUntil: seat.holdExpiresAt,
                orderId: seat.orderId,
              },
            });
            updatedCount++;
          } else {
            // Create new SeatStatus
            await prisma.seatStatus.create({
              data: {
                screeningId,
                seatId: seat.id,
                status: seat.status,
                holdToken: seat.holdToken,
                holdUserId: seat.holdUserId,
                holdUntil: seat.holdExpiresAt,
                orderId: seat.orderId,
              },
            });
            createdCount++;
          }
        } catch (error) {
          console.error(`[Backfill] Error processing seat ${seat.id}:`, error.message);
        }
      }
    }

    console.log(`[Backfill] Created ${createdCount} SeatStatus records`);
    console.log(`[Backfill] Updated ${updatedCount} SeatStatus records`);
    console.log('[Backfill] Backfill completed successfully!');
  } catch (error) {
    console.error('[Backfill] Error during backfill:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  backfillSeatStatus()
    .then(() => {
      console.log('[Backfill] Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Backfill] Script failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillSeatStatus };

