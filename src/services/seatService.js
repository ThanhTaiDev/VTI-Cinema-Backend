const prisma = require('../prismaClient');
const crypto = require('crypto');
const { redlock } = require('../infra/redisClient');

const HOLD_DURATION_SECONDS = 600; // 10 minutes

/**
 * Get seat map for a screening
 */
exports.getSeatMap = async (screeningId) => {
  const screening = await prisma.screening.findUnique({
    where: { id: screeningId },
  });

  if (!screening) {
    throw new Error('Screening not found');
  }

  // Fetch related movie and cinema separately (no relation defined in schema)
  const [movie, cinema] = await Promise.all([
    prisma.movie.findUnique({ where: { id: screening.movieId } }),
    prisma.cinema.findUnique({ where: { id: screening.cinemaId } }),
  ]);

  // Add movie and cinema to screening object
  screening.movie = movie;
  screening.cinema = cinema;

  // Check if Seat model exists in Prisma Client
  if (!prisma.seat) {
    console.error('Prisma Seat model not available. Please run: npx prisma generate');
    // Return empty seat map so frontend can still display screening info
    return {
      screening,
      seats: {},
      serverTime: new Date().toISOString(),
      holdDurationSecs: HOLD_DURATION_SECONDS,
    };
  }

  // Get all seats for this screening (static seat map)
  let seats = [];
  try {
    seats = await prisma.seat.findMany({
      where: { screeningId },
      orderBy: [{ row: 'asc' }, { col: 'asc' }],
      include: {
        statuses: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get latest status
        },
      },
    });
  } catch (error) {
    // If table doesn't exist, return empty seat map
    if (error.message && error.message.includes('no such table')) {
      console.warn('Seat table does not exist. Please run migration: npx prisma migrate dev');
      return {
        screening,
        seats: {},
        serverTime: new Date().toISOString(),
        holdDurationSecs: HOLD_DURATION_SECONDS,
      };
    }
    throw error;
  }

  // If no seats exist, create default seat layout (8 rows x 10 columns)
  if (seats.length === 0) {
    console.warn(`No seats found for screening ${screeningId}. Creating default seat layout...`);
    
    try {
      const ROWS = 8;
      const COLS = 10;
      const newSeats = [];
      
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const row = r + 1;
          const col = c + 1;
          const code = String.fromCharCode(65 + r) + col; // A1, A2, ..., H10
          
          const seat = await prisma.seat.create({
            data: {
              screeningId,
              row,
              col,
              code,
              statuses: {
                create: {
                  screeningId,
                  status: 'AVAILABLE',
                },
              },
            },
            include: {
              statuses: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          });
          newSeats.push(seat);
        }
      }
      
      seats = newSeats;
      console.log(`Created ${newSeats.length} seats for screening ${screeningId}`);
    } catch (error) {
      console.error('Error creating seats:', error);
      // Return empty map if creation fails
      return {
        screening,
        seats: {},
        serverTime: new Date().toISOString(),
        holdDurationSecs: HOLD_DURATION_SECONDS,
      };
    }
  }

  // Create seat map structure using latest SeatStatus
  const seatMap = {};
  seats.forEach(seat => {
    const latestStatus = seat.statuses && seat.statuses.length > 0 ? seat.statuses[0] : null;
    // Generate code if not exists: A1, B2, etc.
    const code = seat.code || `${String.fromCharCode(64 + seat.row)}${seat.col}`;
    const key = code;
    
    seatMap[key] = {
      id: seat.id,
      seatId: seat.id,
      row: seat.row,
      col: seat.col,
      code: code, // Always include code for display
      status: latestStatus ? latestStatus.status : 'AVAILABLE',
      holdExpiresAt: latestStatus?.holdUntil || null,
    };
  });

  return {
    screening,
    seats: seatMap,
    serverTime: new Date().toISOString(),
    holdDurationSecs: HOLD_DURATION_SECONDS,
  };
};

/**
 * Hold seats for a user
 * Uses database transaction to ensure atomicity
 */
exports.holdSeats = async (screeningId, seatIds, userId) => {
  if (!seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('Seat IDs are required');
  }

  // Generate hold token
  const holdToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + HOLD_DURATION_SECONDS * 1000);

  // Create lock key for these specific seats
  const lockKey = `lock:showtime:${screeningId}:seat:${seatIds.sort().join(',')}`;
  let lock = null;

  try {
    // Try to acquire distributed lock if Redis is available
    if (redlock) {
      try {
        lock = await redlock.acquire([lockKey], 5000);
      } catch (lockError) {
        console.warn('[Redis] Failed to acquire lock, using DB transaction only:', lockError.message);
        // Continue without lock - DB transaction will handle concurrency
      }
    }
    
    // Use transaction to ensure atomicity
    return await prisma.$transaction(async (tx) => {
    // Check if screening exists
    const screening = await tx.screening.findUnique({
      where: { id: screeningId },
    });

    if (!screening) {
      throw new Error('Screening not found');
    }

    // Check if screening is in the past
    if (new Date(screening.startTime) < new Date()) {
      throw new Error('Screening has already started');
    }

    // Verify all seats exist
    const seats = await tx.seat.findMany({
      where: {
        id: { in: seatIds },
        screeningId,
      },
    });

    if (seats.length !== seatIds.length) {
      throw new Error('Some seats not found');
    }

    // Get latest seat statuses to check for conflicts
    const seatStatuses = await Promise.all(
      seats.map(async (seat) => {
        const latestStatus = await tx.seatStatus.findFirst({
          where: {
            seatId: seat.id,
            screeningId,
          },
          orderBy: { createdAt: 'desc' },
        });
        return { seat, latestStatus };
      })
    );

    // Check for conflicts - seats that are HELD or SOLD
    const conflictedSeats = seatStatuses.filter(({ latestStatus }) => 
      latestStatus && (latestStatus.status === 'HELD' || latestStatus.status === 'SOLD')
    );

    if (conflictedSeats.length > 0) {
      const error = new Error('Some seats are already taken');
      error.status = 409; // Conflict
      error.conflictedSeats = conflictedSeats.map(({ seat }) => seat.code || `${String.fromCharCode(64 + seat.row)}${seat.col}`);
      throw error;
    }

    // Create new SeatStatus records with HELD status (allows multiple statuses over time)
    await Promise.all(
      seatStatuses.map(({ seat }) =>
        tx.seatStatus.create({
          data: {
            seatId: seat.id,
            screeningId,
            status: 'HELD',
            holdToken,
            holdUserId: userId,
            holdUntil: expiresAt,
          },
        })
      )
    );

    // Calculate pricing breakdown
    const basePrice = screening.price * seats.length;
    const pricingBreakdown = {
      basePrice,
      discount: 0,
      voucherDiscount: 0,
      total: basePrice,
    };

      return {
        holdToken,
        expiresAt: expiresAt.toISOString(),
        pricingBreakdown,
      };
    }, {
      timeout: 10000, // 10 second timeout
    });
  } catch (error) {
    // Re-throw error to be handled by caller
    throw error;
  } finally {
    // Release lock after transaction completes
    if (lock && redlock) {
      try {
        await lock.release();
      } catch (releaseError) {
        console.error('[Redis] Error releasing lock:', releaseError.message);
      }
    }
  }
};

/**
 * Release expired holds
 * Called by cleanup job
 */
exports.releaseExpiredHolds = async () => {
  if (!prisma || !prisma.seatStatus) {
    // Return silently - warning will be logged by cleanup job
    return { released: 0 };
  }

  const now = new Date();
  
  // Find expired seat statuses
  const expiredSeatStatuses = await prisma.seatStatus.findMany({
    where: {
      status: 'HELD',
      holdUntil: {
        lte: now,
      },
    },
    include: {
      seat: true,
    },
  });

  if (expiredSeatStatuses.length === 0) {
    return { released: 0 };
  }

  // Get unique order IDs
  const orderIds = [...new Set(expiredSeatStatuses.map(ss => ss.orderId).filter(Boolean))];

  // Update expired orders
  if (orderIds.length > 0) {
    await prisma.order.updateMany({
      where: {
        id: { in: orderIds },
        status: 'PENDING',
      },
      data: {
        status: 'EXPIRED',
      },
    });
  }

  // Create new SeatStatus records with AVAILABLE status to release holds
  await Promise.all(
    expiredSeatStatuses.map(ss =>
      prisma.seatStatus.create({
        data: {
          seatId: ss.seatId,
          screeningId: ss.screeningId,
          status: 'AVAILABLE',
        },
      })
    )
  );

  return {
    released: expiredSeatStatuses.length,
    seatStatusIds: expiredSeatStatuses.map(ss => ss.id),
  };
};

/**
 * Get seat status for real-time updates
 */
exports.getSeatStatuses = async (screeningId) => {
  const seats = await prisma.seat.findMany({
    where: { screeningId },
    orderBy: [{ row: 'asc' }, { col: 'asc' }],
    include: {
      statuses: {
        orderBy: { createdAt: 'desc' },
        take: 1, // Get latest status
      },
    },
  });

  return seats.map(seat => {
    const latestStatus = seat.statuses && seat.statuses.length > 0 ? seat.statuses[0] : null;
    return {
      id: seat.id,
      key: seat.code || `${String.fromCharCode(64 + seat.row)}${seat.col}`,
      status: latestStatus ? latestStatus.status : 'AVAILABLE',
      holdUntil: latestStatus?.holdUntil || null,
      seatId: seat.id,
    };
  });
};

