const prisma = require('../prismaClient');
const crypto = require('crypto');

exports.getAll = async (params = {}) => {
  const where = {};
  
  if (params.status) {
    where.status = params.status;
  }
  if (params.userId) {
    where.userId = params.userId;
  }

  return await prisma.ticket.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      screening: {
        include: {
          movie: true,
          cinema: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

exports.getById = async (id) => {
  return await prisma.ticket.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      screening: {
        include: {
          movie: true,
          cinema: true,
        },
      },
    },
  });
};

exports.create = async (data, userId) => {
  const { screeningId, seats, price } = data;
  
  if (!screeningId || !seats || !Array.isArray(seats) || seats.length === 0) {
    throw new Error('Screening ID and seats are required');
  }

  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Verify screening exists
    const screening = await tx.screening.findUnique({
      where: { id: screeningId },
    });

    if (!screening) {
      throw new Error('Screening not found');
    }

    // Find or create Seat records for each seat
    const seatRecords = await Promise.all(
      seats.map(async (seat) => {
        // Try to find existing seat
        let seatRecord = await tx.seat.findUnique({
          where: {
            screeningId_row_col: {
              screeningId,
              row: seat.row,
              col: seat.col.toString(),
            },
          },
        });

        // If seat doesn't exist, create it
        if (!seatRecord) {
          seatRecord = await tx.seat.create({
            data: {
              screeningId,
              row: seat.row,
              col: seat.col.toString(),
              status: 'AVAILABLE',
            },
          });
        }

        return seatRecord;
      })
    );

    // Calculate total price
    const totalPrice = price || (screening.price * seats.length);
    const pricePerTicket = totalPrice / seats.length;

    // Generate hold token for order
    const holdToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 600000); // 10 minutes

    // Check if seats are already taken
    const conflictedSeats = seatRecords.filter(seat => 
      seat.status === 'HELD' || seat.status === 'SOLD'
    );

    if (conflictedSeats.length > 0) {
      const error = new Error('Some seats are already taken');
      error.status = 409; // Conflict
      error.conflictedSeats = conflictedSeats.map(s => `${s.row}${s.col}`);
      throw error;
    }

    // Create Order
    const order = await tx.order.create({
      data: {
        userId,
        screeningId,
        holdToken,
        status: 'PENDING',
        seatIds: JSON.stringify(seatRecords.map(s => s.id)),
        totalAmount: totalPrice,
        expiresAt,
        idempotencyKey: crypto.randomBytes(16).toString('hex'),
      },
    });

    // Update Seat records to HELD status
    await Promise.all(
      seatRecords.map(seat =>
        tx.seat.update({
          where: { id: seat.id },
          data: {
            status: 'HELD',
            holdToken,
            holdUserId: userId,
            holdExpiresAt: expiresAt,
            orderId: order.id,
          },
        })
      )
    );

    // Create tickets for each seat
    const tickets = await Promise.all(
      seatRecords.map(async (seat, index) => {
        const ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
        const qrCode = `TICKET-${order.id}-${seat.id}-${ticketCode}`;
        
        return await tx.ticket.create({
          data: {
            orderId: order.id,
            screeningId,
            seatId: seat.id,
            seatRow: seat.row,
            seatCol: seat.col,
            userId,
            price: Math.round(pricePerTicket),
            status: 'PENDING',
            code: ticketCode,
            qrCode,
          },
          include: {
            screening: {
              include: {
                movie: true,
                cinema: true,
              },
            },
          },
        });
      })
    );

    // Return first ticket for compatibility with frontend
    // Frontend expects a single ticket object, not an array
    return tickets[0];
  }, {
    timeout: 10000,
  });
};

exports.cancel = async (id) => {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    throw new Error('Ticket not found');
  }
  if (ticket.status !== 'PENDING') {
    throw new Error('Only pending tickets can be cancelled');
  }

  return await prisma.ticket.update({
    where: { id },
    data: { status: 'CANCELED' },
  });
};

exports.lock = async (id) => {
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    throw new Error('Ticket not found');
  }

  return await prisma.ticket.update({
    where: { id },
    data: { status: 'LOCKED' },
  });
};

