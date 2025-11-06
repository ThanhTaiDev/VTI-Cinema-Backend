const prisma = require('../src/prismaClient');

/**
 * Backfill seats for existing screenings that don't have seats
 */
async function backfillSeats() {
  console.log('[Backfill] Starting seats backfill...');

  try {
    const screenings = await prisma.screening.findMany({
      select: { id: true },
    });

    console.log(`[Backfill] Found ${screenings.length} screenings`);

    let totalSeatsCreated = 0;

    for (const sc of screenings) {
      const count = await prisma.seat.count({
        where: { screeningId: sc.id },
      });

      if (count > 0) {
        console.log(`[Backfill] Screening ${sc.id} already has ${count} seats, skipping`);
        continue;
      }

      const ROWS = 8;
      const COLS = 10;
      const tasks = [];

      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const row = r + 1;
          const col = c + 1;
          const code = String.fromCharCode(65 + r) + col; // A1, A2, ..., H10

          tasks.push(
            prisma.seat.create({
              data: {
                screeningId: sc.id,
                row,
                col,
                code,
                statuses: {
                  create: {
                    screeningId: sc.id,
                    status: 'AVAILABLE',
                  },
                },
              },
            })
          );
        }
      }

      await Promise.all(tasks);
      totalSeatsCreated += ROWS * COLS;
      console.log(`[Backfill] Seeded ${ROWS * COLS} seats for screening ${sc.id}`);
    }

    console.log(`[Backfill] Total seats created: ${totalSeatsCreated}`);
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
  backfillSeats()
    .then(() => {
      console.log('[Backfill] Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[Backfill] Script failed:', error);
      process.exit(1);
    });
}

module.exports = { backfillSeats };

