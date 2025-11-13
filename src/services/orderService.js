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
    
    // First, get screeningId from SeatStatus (since Seat.screening might be null in new schema)
    const firstSeatStatus = await tx.seatStatus.findFirst({
      where: {
        seatId: seatIdsArray[0],
        holdToken: holdToken,
        holdUserId: userId,
        status: 'HELD',
      },
      include: {
        screening: true,
      },
    });

    if (!firstSeatStatus) {
      throw new Error('Seats not held or hold token invalid');
    }

    const screening = firstSeatStatus.screening;
    if (!screening) {
      throw new Error('Screening not found');
    }

    const screeningId = screening.id;

    // Check if screening has already started
    const now = new Date();
    if (new Date(screening.startTime) < now) {
      throw new Error('Screening has already started');
    }

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

    // Check if hold has expired (now is already defined above)
    const expiredSeatStatuses = validSeatStatuses.filter(ss => 
      ss.holdUntil && new Date(ss.holdUntil) < now
    );

    if (expiredSeatStatuses.length > 0) {
      throw new Error('Hold has expired');
    }

    // Calculate pricing - use basePrice and seatType.priceFactor if available
    let basePrice = 0;
    
    // Get seat details with seatType to calculate individual prices
    const seatsWithTypes = await Promise.all(
      validSeatStatuses.map(async (ss) => {
        const seat = await tx.seat.findUnique({
          where: { id: ss.seatId },
          include: {
            seatType: {
              select: {
                priceFactor: true,
              },
            },
          },
        });
        return { seatStatus: ss, seat };
      })
    );

    // Calculate price for each seat
    const seatPrices = seatsWithTypes.map(({ seatStatus, seat }) => {
      if (screening.basePrice && seat?.seatType?.priceFactor) {
        // New pricing: basePrice * priceFactor
        return Math.round(screening.basePrice * seat.seatType.priceFactor);
      } else {
        // Legacy pricing: use screening.price
        return screening.price || 0;
      }
    });

    basePrice = seatPrices.reduce((sum, price) => sum + price, 0);
    
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

    // Generate a single QR code for the entire order
    const orderQrCode = `ORDER-${order.id}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    
    // Update order with QR code
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { qrCode: orderQrCode },
    });

    // Create tickets immediately with PENDING status (no individual QR codes)
    const ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    const tickets = await Promise.all(
      validSeatStatuses.map(async (seatStatus, index) => {
        // Get seat details to ensure we have row and col
        const seat = await tx.seat.findUnique({
          where: { id: seatStatus.seatId },
          select: {
            id: true,
            row: true,
            col: true,
          },
        });

        if (!seat) {
          throw new Error(`Seat ${seatStatus.seatId} not found`);
        }

        const individualTicketCode = `${ticketCode}-${index + 1}`;
        const pricePerTicket = Math.round(totalAmount / validSeatStatuses.length);
        
        return await tx.ticket.create({
          data: {
            orderId: order.id,
            screeningId: order.screeningId,
            seatId: seat.id,
            seatRow: seat.row || null, // Ensure it's String or null
            seatCol: seat.col,
            userId: order.userId,
            status: 'PENDING',
            price: pricePerTicket,
            code: individualTicketCode,
            // No qrCode for individual tickets - use order's QR code
            qrCode: null,
          },
        });
      })
    );

    // Idempotency is handled by unique constraint on order.idempotencyKey

    return {
      ...updatedOrder,
      pricingBreakdown: JSON.parse(updatedOrder.pricingBreakdown),
      seatIds: JSON.parse(updatedOrder.seatIds),
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
      console.log(`[OrderService] Updating order ${orderId} to PAID, creating SOLD seat statuses`);
      
      // Get seat IDs from order
      let seatIds = [];
      if (order.seatIds) {
        try {
          seatIds = typeof order.seatIds === 'string' ? JSON.parse(order.seatIds) : order.seatIds;
          console.log(`[OrderService] Found ${seatIds.length} seat IDs from order.seatIds`);
        } catch (e) {
          console.error('[OrderService] Error parsing seatIds:', e);
        }
      }
      
      // If no seatIds from order, try to get from seatStatuses
      if (seatIds.length === 0 && order.seatStatuses && order.seatStatuses.length > 0) {
        seatIds = order.seatStatuses.map(ss => ss.seatId);
        console.log(`[OrderService] Found ${seatIds.length} seat IDs from order.seatStatuses`);
      }
      
      // If still no seatIds, try to get from tickets
      if (seatIds.length === 0) {
        const tickets = await tx.ticket.findMany({
          where: { orderId: order.id },
          select: { seatId: true },
        });
        seatIds = tickets.map(t => t.seatId).filter(Boolean);
        console.log(`[OrderService] Found ${seatIds.length} seat IDs from tickets`);
      }
      
      if (seatIds.length === 0) {
        console.error(`[OrderService] ERROR: No seat IDs found for order ${orderId}. Order data:`, {
          orderId: order.id,
          seatIds: order.seatIds,
          seatStatusesCount: order.seatStatuses?.length || 0,
          screeningId: order.screeningId,
        });
      } else {
        console.log(`[OrderService] Creating ${seatIds.length} SOLD seat statuses for order ${orderId}`);
        // Create new SeatStatus records with SOLD status (don't update Seat directly)
        const soldStatuses = await Promise.all(
          seatIds.map((seatId) =>
            tx.seatStatus.create({
              data: {
                seatId: seatId,
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
        console.log(`[OrderService] Successfully created ${soldStatuses.length} SOLD seat statuses`);

        // Update existing tickets from PENDING to ISSUED
        // First, try to find ALL tickets for this order (not just PENDING)
        const allTickets = await tx.ticket.findMany({
          where: {
            orderId: order.id,
          },
        });
        
        console.log(`[OrderService] Found ${allTickets.length} tickets for order ${orderId}`);
        
        // Filter for PENDING tickets
        const existingTickets = allTickets.filter(t => t.status === 'PENDING');
        console.log(`[OrderService] Found ${existingTickets.length} PENDING tickets to update`);

        let tickets = [];
        if (existingTickets.length > 0) {
          // Update existing tickets to ISSUED
          console.log(`[OrderService] Updating ${existingTickets.length} tickets from PENDING to ISSUED`);
          tickets = await Promise.all(
            existingTickets.map(ticket => {
              console.log(`[OrderService] Updating ticket ${ticket.id} (code: ${ticket.code}) to ISSUED`);
              return tx.ticket.update({
                where: { id: ticket.id },
                data: { status: 'ISSUED' },
              });
            })
          );
          console.log(`[OrderService] Successfully updated ${tickets.length} tickets to ISSUED`);
        } else if (allTickets.length > 0) {
          // Tickets exist but are not PENDING - log warning
          console.warn(`[OrderService] Order ${orderId} has ${allTickets.length} tickets but none are PENDING. Current statuses:`, allTickets.map(t => ({ id: t.id, status: t.status })));
          tickets = allTickets; // Return existing tickets
        } else {
          // No tickets found - create them
          console.log(`[OrderService] No tickets found for order ${orderId}, creating new tickets`);
          const ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
          tickets = await Promise.all(
            soldStatuses.map(async (seatStatus, index) => {
              const seat = seatStatus.seat;
              const individualTicketCode = `${ticketCode}-${index + 1}`;
              
              console.log(`[OrderService] Creating ticket ${individualTicketCode} for seat ${seat.row}${seat.col}`);
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
                  code: individualTicketCode,
                  // No qrCode for individual tickets - use order's QR code
                  qrCode: null,
                },
              });
            })
          );
          console.log(`[OrderService] Successfully created ${tickets.length} new tickets with ISSUED status`);
        }

        return {
          ...updatedOrder,
          tickets,
        };
      }
    }

    return updatedOrder;
  }, {
    timeout: 10000,
  });
};

/**
 * Get order by QR code (for check-in)
 */
exports.getOrderByQrCode = async (qrCode) => {
  if (!qrCode) {
    throw new Error('QR code is required');
  }

  const order = await prisma.order.findUnique({
    where: { qrCode },
    include: {
      screening: true,
      tickets: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  // Fetch movie and cinema separately
  const [movie, cinema] = await Promise.all([
    prisma.movie.findUnique({
      where: { id: order.screening?.movieId },
    }),
    prisma.cinema.findUnique({
      where: { id: order.screening?.cinemaId },
    }),
  ]);

  return {
    ...order,
    screening: {
      ...order.screening,
      movie: movie || null,
      cinema: cinema || null,
    },
  };
};

