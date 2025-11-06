const prisma = require('../prismaClient');
const crypto = require('crypto');

/**
 * Create order from hold token
 */
exports.createOrder = async (data, userId) => {
  const {
    holdToken,
    seatIds,
    combos = [],
    voucherCode,
    idempotencyKey,
  } = data;

  if (!holdToken || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('Hold token and seat IDs are required');
  }

  // Idempotency key is now required
  if (!idempotencyKey) {
    throw new Error('Idempotency key is required');
  }

  // Check idempotency - see if order with this idempotencyKey already exists
  const existingOrder = await prisma.order.findUnique({
    where: { idempotencyKey },
  });
  
  if (existingOrder) {
    return {
      ...existingOrder,
      pricingBreakdown: JSON.parse(existingOrder.pricingBreakdown || '{}'),
      seatIds: JSON.parse(existingOrder.seatIds || '[]'),
    };
  }

  // Use transaction
  return await prisma.$transaction(async (tx) => {
    // Get screening to verify
    const seatIdsArray = Array.isArray(seatIds) ? seatIds : JSON.parse(seatIds);
    const firstSeat = await tx.seat.findUnique({
      where: { id: seatIdsArray[0] },
      include: { screening: true },
    });

    if (!firstSeat) {
      throw new Error('Seats not found');
    }

    const screening = firstSeat.screening;
    const screeningId = screening.id;

    // Verify seat statuses are still held by this user and token
    // Get latest seat statuses for each seat
    const seatStatuses = await Promise.all(
      seatIdsArray.map(async (seatId) => {
        const latestStatus = await tx.seatStatus.findFirst({
          where: {
            seatId,
            screeningId,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            seat: true,
          },
        });
        
        // Verify it's HELD by this user and token
        if (!latestStatus || 
            latestStatus.status !== 'HELD' || 
            latestStatus.holdToken !== holdToken ||
            latestStatus.holdUserId !== userId) {
          return null;
        }
        
        return latestStatus;
      })
    );

    // Filter out null values
    const validSeatStatuses = seatStatuses.filter(Boolean);

    if (validSeatStatuses.length !== seatIdsArray.length) {
      throw new Error('Some seats are not held or hold has expired');
    }

    // Check if hold has expired
    const now = new Date();
    const expiredSeatStatuses = validSeatStatuses.filter(ss => 
      ss.holdUntil && new Date(ss.holdUntil) < now
    );

    if (expiredSeatStatuses.length > 0) {
      throw new Error('Hold has expired');
    }

    // Calculate pricing
    const basePrice = screening.price * validSeatStatuses.length;
    let discount = 0;
    let voucherDiscount = 0;

    // TODO: Apply voucher validation and discount
    // if (voucherCode) {
    //   const voucher = await validateVoucher(voucherCode, userId, screening);
    //   if (voucher) {
    //     voucherDiscount = calculateVoucherDiscount(voucher, basePrice);
    //   }
    // }

    // Calculate combo prices
    let comboTotal = 0;
    // TODO: Calculate combo prices from combos array

    const subtotal = basePrice + comboTotal;
    const totalAmount = subtotal - discount - voucherDiscount;

    const pricingBreakdown = {
      basePrice,
      comboTotal,
      discount,
      voucherDiscount,
      subtotal,
      total: totalAmount,
    };

    // Create order
    const expiresAt = validSeatStatuses[0].holdUntil || new Date(Date.now() + 600 * 1000);
    
    const order = await tx.order.create({
      data: {
        userId,
        screeningId,
        holdToken,
        status: 'PENDING',
        seatIds: JSON.stringify(seatIdsArray),
        pricingBreakdown: JSON.stringify(pricingBreakdown),
        totalAmount,
        voucherCode,
        idempotencyKey,
        expiresAt,
      },
    });

    // Link seat statuses to order (update existing SeatStatus records)
    await Promise.all(
      validSeatStatuses.map(ss =>
        tx.seatStatus.update({
          where: { id: ss.id },
          data: {
            orderId: order.id,
          },
        })
      )
    );

    // Create tickets immediately with PENDING status
    const ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    const tickets = await Promise.all(
      validSeatStatuses.map(async (seatStatus, index) => {
        const seat = seatStatus.seat;
        const individualTicketCode = `${ticketCode}-${index + 1}`;
        const qrCode = `TICKET-${order.id}-${seat.id}-${individualTicketCode}`;
        const pricePerTicket = Math.round(totalAmount / validSeatStatuses.length);
        
        return await tx.ticket.create({
          data: {
            orderId: order.id,
            screeningId: order.screeningId,
            seatId: seat.id,
            seatRow: seat.row,
            seatCol: seat.col,
            userId: order.userId,
            status: 'PENDING',
            price: pricePerTicket,
            code: individualTicketCode,
            qrCode,
          },
        });
      })
    );

    // Idempotency is handled by unique constraint on order.idempotencyKey

    return {
      ...order,
      pricingBreakdown: JSON.parse(order.pricingBreakdown),
      seatIds: JSON.parse(order.seatIds),
      tickets,
    };
  }, {
    timeout: 10000,
  });
};

/**
 * Get order by ID
 */
exports.getOrderById = async (orderId, userId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      screening: true,
      seatStatuses: {
        include: {
          seat: {
            select: {
              id: true,
              row: true,
              col: true,
            },
          },
        },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Verify user owns this order
  if (order.userId !== userId) {
    throw new Error('Unauthorized');
  }

  // Fetch movie and cinema separately (no relation defined in schema)
  if (order.screening) {
    const [movie, cinema] = await Promise.all([
      prisma.movie.findUnique({ where: { id: order.screening.movieId } }),
      prisma.cinema.findUnique({ where: { id: order.screening.cinemaId } }),
    ]);

    order.screening.movie = movie;
    order.screening.cinema = cinema;
  }

  // Map seatStatuses to seats for backward compatibility
  order.seats = order.seatStatuses.map(ss => ({
    ...ss.seat,
    status: ss.status,
  }));

  return {
    ...order,
    pricingBreakdown: JSON.parse(order.pricingBreakdown || '{}'),
    seatIds: JSON.parse(order.seatIds || '[]'),
  };
};

/**
 * Get user orders
 */
exports.getUserOrders = async (userId, status = null) => {
  const where = { userId };
  if (status) {
    where.status = status;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      screening: true,
      seatStatuses: {
        include: {
          seat: {
            select: {
              id: true,
              row: true,
              col: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch movie and cinema for each order's screening
  const movieIds = [...new Set(orders.map(o => o.screening?.movieId).filter(Boolean))];
  const cinemaIds = [...new Set(orders.map(o => o.screening?.cinemaId).filter(Boolean))];

  const [movies, cinemas] = await Promise.all([
    prisma.movie.findMany({ where: { id: { in: movieIds } } }),
    prisma.cinema.findMany({ where: { id: { in: cinemaIds } } }),
  ]);

  // Map movies and cinemas to orders
  return orders.map(order => {
    if (order.screening) {
      order.screening.movie = movies.find(m => m.id === order.screening.movieId);
      order.screening.cinema = cinemas.find(c => c.id === order.screening.cinemaId);
    }
    // Map seatStatuses to seats for backward compatibility
    order.seats = order.seatStatuses.map(ss => ss.seat);
    return {
      ...order,
      pricingBreakdown: JSON.parse(order.pricingBreakdown || '{}'),
      seatIds: JSON.parse(order.seatIds || '[]'),
    };
  });
};

/**
 * Update order status after payment
 */
exports.updateOrderStatus = async (orderId, status) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        seatStatuses: {
          include: {
            seat: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status },
    });

    // If payment successful, create new SeatStatus records with SOLD status and update tickets
    if (status === 'PAID') {
      // Create new SeatStatus records with SOLD status (don't update Seat directly)
      const soldStatuses = await Promise.all(
        order.seatStatuses.map((seatStatus) =>
          tx.seatStatus.create({
            data: {
              seatId: seatStatus.seatId,
              screeningId: order.screeningId,
              status: 'SOLD',
              orderId: order.id,
            },
            include: {
              seat: true,
            },
          })
        )
      );

      // Update existing tickets from PENDING to ISSUED
      const existingTickets = await tx.ticket.findMany({
        where: {
          orderId: order.id,
          status: 'PENDING',
        },
      });

      let tickets = [];
      if (existingTickets.length > 0) {
        // Update existing tickets to ISSUED
        tickets = await Promise.all(
          existingTickets.map(ticket =>
            tx.ticket.update({
              where: { id: ticket.id },
              data: { status: 'ISSUED' },
            })
          )
        );
      } else {
        // Fallback: Create tickets if they don't exist (shouldn't happen with new flow)
        tickets = await Promise.all(
          soldStatuses.map(async (seatStatus) => {
            const seat = seatStatus.seat;
            const ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
            const qrCode = `TICKET-${order.id}-${seat.id}-${ticketCode}`;
            
            return await tx.ticket.create({
              data: {
                orderId: order.id,
                screeningId: order.screeningId,
                seatId: seat.id,
                seatRow: seat.row,
                seatCol: seat.col,
                userId: order.userId,
                status: 'ISSUED',
                price: Math.round(order.totalAmount / soldStatuses.length),
                code: ticketCode,
                qrCode,
              },
            });
          })
        );
      }

      return {
        ...updatedOrder,
        tickets,
      };
    }

    return updatedOrder;
  }, {
    timeout: 10000,
  });
};

