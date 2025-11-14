const prisma = require('../prismaClient');
const crypto = require('crypto');
const seatHoldService = require('./seatHoldService');

/**
 * Create order from holdIds (NEW FLOW)
 * @param {Object} data - { holdIds, combos, voucherCode, idempotencyKey }
 * @param {string} userId
 */
exports.createOrder = async (data, userId) => {
  const {
    holdIds, // NEW: Use holdIds instead of holdToken
    holdToken, // DEPRECATED: Keep for backward compatibility
    seatIds, // DEPRECATED: Keep for backward compatibility
    combos = [],
    voucherCode,
    idempotencyKey,
  } = data;

  // NEW FLOW: Use holdIds
  if (holdIds && Array.isArray(holdIds) && holdIds.length > 0) {
    return await createOrderFromHolds(holdIds, { combos, voucherCode, idempotencyKey }, userId);
  }

  // LEGACY FLOW: Use holdToken (backward compatibility)
  if (holdToken && seatIds) {
    return await createOrderFromToken(holdToken, seatIds, { combos, voucherCode, idempotencyKey }, userId);
  }

  throw new Error('Either holdIds (new) or holdToken+seatIds (legacy) is required');
};

/**
 * NEW FLOW: Create order from holdIds
 */
async function createOrderFromHolds(holdIds, options, userId) {
  const { combos = [], voucherCode, idempotencyKey } = options;

  if (!idempotencyKey) {
    throw new Error('Idempotency key is required');
  }

  // Check idempotency
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

  // Use transaction - ALL operations must be atomic
  return await prisma.$transaction(async (tx) => {
    const now = new Date();

    // Verify all holds are valid and belong to this user
    const holds = await tx.seatHold.findMany({
      where: {
        id: { in: holdIds },
        userId,
        status: 'HOLD',
        expiresAt: { gt: now },
      },
      include: {
        seat: {
          include: {
            seatType: {
              select: {
                priceFactor: true,
              },
            },
          },
        },
        screening: true,
      },
    });

    if (holds.length !== holdIds.length) {
      throw new Error('Some holds are invalid, expired, or do not belong to you');
    }

    // All holds must be for the same screening
    const screeningIds = [...new Set(holds.map(h => h.screeningId))];
    if (screeningIds.length !== 1) {
      throw new Error('All holds must be for the same screening');
    }

    const screening = holds[0].screening;
    if (!screening) {
      throw new Error('Screening not found');
    }

    const screeningId = screening.id;

    // Check if screening has already started
    if (new Date(screening.startTime) < now) {
      throw new Error('Screening has already started');
    }

    // Calculate pricing
    const seatPrices = holds.map(hold => {
      if (screening.basePrice && hold.seat?.seatType?.priceFactor) {
        return Math.round(screening.basePrice * hold.seat.seatType.priceFactor);
      } else {
        return screening.price || 0;
      }
    });

    const basePrice = seatPrices.reduce((sum, price) => sum + price, 0);
    let discount = 0;
    let voucherDiscount = 0;
    let voucherId = null;

    // Apply voucher validation and discount
    if (voucherCode) {
      try {
        const rewardService = require('./rewardService');
        const voucher = await rewardService.validateVoucher(voucherCode, userId);
        if (voucher && voucher.value) {
          // Voucher discount is fixed amount (value in VND)
          voucherDiscount = Math.min(voucher.value, basePrice); // Can't discount more than order total
          voucherId = voucher.id;
          console.log(`[OrderService] Applied voucher ${voucherCode}: discount ${voucherDiscount} VND`);
        }
      } catch (err) {
        console.error('[OrderService] Error validating voucher:', err);
        throw new Error(err.message || 'Mã voucher không hợp lệ');
      }
    }

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

    // Generate holdToken for backward compatibility (DEPRECATED)
    const holdToken = crypto.randomBytes(32).toString('hex');
    const seatIdsArray = holds.map(h => h.seatId);
    const expiresAt = holds[0].expiresAt;

    // Create order
    const order = await tx.order.create({
      data: {
        userId,
        screeningId,
        holdToken, // DEPRECATED: Keep for backward compatibility
        status: 'PENDING',
        seatIds: JSON.stringify(seatIdsArray),
        pricingBreakdown: JSON.stringify(pricingBreakdown),
        totalAmount,
        voucherCode,
        idempotencyKey,
        expiresAt,
      },
    });

    // Store voucherId in pricingBreakdown metadata for later use
    if (voucherId) {
      const updatedBreakdown = {
        ...pricingBreakdown,
        voucherId, // Store voucher ID to mark as used later
      };
      await tx.order.update({
        where: { id: order.id },
        data: {
          pricingBreakdown: JSON.stringify(updatedBreakdown),
        },
      });
    }

    // Claim holds to order (link holds to order and update status)
    // Pass tx to avoid nested transaction
    await seatHoldService.claimHoldsToOrder(holdIds, order.id, tx);

    // Generate QR code
    const orderQrCode = `ORDER-${order.id}-${crypto.randomBytes(16).toString('hex').toUpperCase()}`;
    
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { qrCode: orderQrCode },
    });

    // Create tickets immediately with PENDING status
    const ticketCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    const tickets = await Promise.all(
      holds.map(async (hold, index) => {
        const seat = hold.seat;
        if (!seat) {
          throw new Error(`Seat ${hold.seatId} not found`);
        }

        const individualTicketCode = `${ticketCode}-${index + 1}`;
        const pricePerTicket = Math.round(totalAmount / holds.length);
        
        return await tx.ticket.create({
          data: {
            orderId: order.id,
            screeningId,
            seatId: seat.id,
            seatRow: seat.row || null,
            seatCol: seat.col,
            userId,
            status: 'PENDING',
            price: pricePerTicket,
            code: individualTicketCode,
            qrCode: null,
          },
        });
      })
    );

    return {
      ...updatedOrder,
      pricingBreakdown: JSON.parse(updatedOrder.pricingBreakdown),
      seatIds: JSON.parse(updatedOrder.seatIds),
      tickets,
    };
  }, {
    timeout: 10000,
  });
}

/**
 * LEGACY FLOW: Create order from holdToken (backward compatibility)
 */
async function createOrderFromToken(holdToken, seatIds, options, userId) {
  const { combos = [], voucherCode, idempotencyKey } = options;

  if (!idempotencyKey) {
    throw new Error('Idempotency key is required');
  }

  // Check idempotency
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
    const seatIdsArray = Array.isArray(seatIds) ? seatIds : JSON.parse(seatIds);
    
    // Get screeningId from SeatStatus (legacy flow)
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
    const now = new Date();
    
    if (new Date(screening.startTime) < now) {
      throw new Error('Screening has already started');
    }

    // Verify seat statuses (legacy)
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
        
        if (!latestStatus || 
            latestStatus.status !== 'HELD' || 
            latestStatus.holdToken !== holdToken ||
            latestStatus.holdUserId !== userId) {
          return null;
        }
        
        return latestStatus;
      })
    );

    const validSeatStatuses = seatStatuses.filter(Boolean);

    if (validSeatStatuses.length !== seatIdsArray.length) {
      throw new Error('Some seats are not held or hold has expired');
    }

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
      screening: {
        include: {
          movie: true,
          cinema: true,
          roomRef: true,
        },
      },
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
      tickets: {
        select: {
          id: true,
          seatRow: true,
          seatCol: true,
          price: true,
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
 * Cancel order and release holds
 */
exports.cancelOrder = async (orderId) => {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new Error('Order not found');
    }

    // Only allow canceling PENDING orders
    if (order.status !== 'PENDING') {
      throw new Error(`Cannot cancel order with status: ${order.status}`);
    }

    // Update order status
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    // Release holds for this order - do it directly in transaction to avoid nested transaction
    // Find all holds for this order
    const holds = await tx.seatHold.findMany({
      where: {
        orderId,
        status: { in: ['HOLD', 'CLAIMED'] },
      },
    });

    if (holds.length > 0) {
      // Update holds to RELEASED
      await tx.seatHold.updateMany({
        where: {
          id: { in: holds.map(h => h.id) },
        },
        data: {
          status: 'RELEASED',
          orderId: null,
        },
      });

      // Get all seat statuses that need to be updated (batch query)
      const seatStatusPairs = holds.map(h => ({ screeningId: h.screeningId, seatId: h.seatId }));
      const screeningIds = [...new Set(seatStatusPairs.map(p => p.screeningId))];
      const seatIds = [...new Set(seatStatusPairs.map(p => p.seatId))];

      // Find all relevant seat statuses in one query
      const seatStatuses = await tx.seatStatus.findMany({
        where: {
          screeningId: { in: screeningIds },
          seatId: { in: seatIds },
          status: 'HELD',
        },
      });

      // Filter to only those that match our holds
      const statusesToUpdate = seatStatuses.filter(ss => 
        seatStatusPairs.some(p => p.screeningId === ss.screeningId && p.seatId === ss.seatId)
      );

      if (statusesToUpdate.length > 0) {
        // Batch update all seat statuses
        await tx.seatStatus.updateMany({
          where: {
            id: { in: statusesToUpdate.map(ss => ss.id) },
          },
          data: {
            status: 'AVAILABLE',
            orderId: null,
          },
        });
      }
    }

    return updatedOrder;
  }, {
    timeout: 30000, // Increase timeout to 30 seconds
  });
};

/**
 * Update order status after payment
 */
exports.updateOrderStatus = async (orderId, status) => {
  const result = await prisma.$transaction(async (tx) => {
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

    // If cancelling/expiring, release holds
    if (status === 'CANCELLED' || status === 'EXPIRED') {
      await seatHoldService.releaseHoldsForOrder(orderId);
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

        // Mark voucher as used if order has voucher
        if (order.voucherCode) {
          try {
            const pricingBreakdown = order.pricingBreakdown 
              ? (typeof order.pricingBreakdown === 'string' 
                  ? JSON.parse(order.pricingBreakdown) 
                  : order.pricingBreakdown)
              : {};
            
            if (pricingBreakdown.voucherId) {
              const rewardService = require('./rewardService');
              await rewardService.markVoucherAsUsed(pricingBreakdown.voucherId, order.id);
              console.log(`[OrderService] Marked voucher ${order.voucherCode} as used for order ${order.id}`);
            }
          } catch (err) {
            console.error('[OrderService] Error marking voucher as used:', err);
            // Don't throw - this is non-critical
          }
        }

        return {
          ...updatedOrder,
          tickets,
          userId: order.userId,
          totalAmount: order.totalAmount,
        };
      }
    }

    return {
      ...updatedOrder,
      userId: order.userId,
      totalAmount: order.totalAmount,
    };
  }, {
    timeout: 10000,
  });

  // After transaction commits, update user spending and check for rewards
  // Only update if payment was successful and we're in 2025
  console.log(`[OrderService] updateOrderStatus - status: ${status}, result:`, {
    hasResult: !!result,
    userId: result?.userId,
    totalAmount: result?.totalAmount,
  })
  
  if (status === 'PAID' && result && result.userId && result.totalAmount) {
    const currentYear = new Date().getFullYear()
    console.log(`[OrderService] Payment successful. Current year: ${currentYear}, checking if should update spending...`)
    
    if (currentYear === 2025) {
      const paymentAmount = result.totalAmount || 0
      console.log(`[OrderService] Updating user spending for user ${result.userId}, amount: ${paymentAmount}`)
      
      // Update user spending and check rewards (async, don't wait)
      const rewardService = require('./rewardService')
      rewardService.updateUserSpending(result.userId, paymentAmount)
        .then(({ newTotalSpending, rewards }) => {
          console.log(`[OrderService] ✅ Updated user ${result.userId} spending to ${newTotalSpending}, created ${rewards.length} rewards`)
          
          // Create notification for successful payment
          return prisma.notification.create({
            data: {
              userId: result.userId,
              type: 'ORDER_PAID',
              title: 'Thanh toán thành công',
              message: `Đơn hàng #${orderId} đã được thanh toán thành công. Tổng tiền: ${formatCurrency(paymentAmount)}`,
              metadata: {
                orderId: orderId,
                amount: paymentAmount,
              },
            },
          })
        })
        .then(() => {
          console.log(`[OrderService] Created payment notification for order ${orderId}`)
        })
        .catch(err => {
          console.error('[OrderService] ❌ Error updating user spending or creating notification:', err)
          // Don't throw - this is non-critical
        })
    } else {
      console.log(`[OrderService] ⚠️ Not 2025 (current year: ${currentYear}), skipping spending update`)
    }
  } else {
    console.log(`[OrderService] ⚠️ Skipping spending update - status: ${status}, hasResult: ${!!result}, hasUserId: ${!!result?.userId}, hasTotalAmount: ${!!result?.totalAmount}`)
  }

  return result;
};

// Helper function for formatting currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(amount)
}

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

