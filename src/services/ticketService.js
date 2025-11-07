const prisma = require('../prismaClient');
const crypto = require('crypto');

exports.getAll = async (params = {}) => {
  const where = {};
  
  // Status filter
  if (params.status) {
    where.status = params.status;
  }
  
  // User filter
  if (params.userId) {
    where.userId = params.userId;
  }
  
  // Search by code, orderId, email, phone
  // Note: SQLite doesn't support case-insensitive contains natively
  // We'll filter in memory after fetching, or use a simpler approach
  // For now, use contains which works but is case-sensitive
  if (params.search) {
    where.OR = [
      { code: { contains: params.search } },
      { orderId: { contains: params.search } },
    ];
    // Note: User email/phone search requires separate query or post-filtering
    // For simplicity, we'll search by code and orderId first
  }
  
  // Build screening filter properly (avoid overwriting)
  const screeningWhere = {};
  if (params.movieId) {
    screeningWhere.movieId = params.movieId;
  }
  if (params.cinemaId) {
    screeningWhere.cinemaId = params.cinemaId;
  }
  if (params.room) {
    screeningWhere.room = params.room;
  }
  if (params.from || params.to) {
    screeningWhere.startTime = {};
    if (params.from) {
      const fromDate = new Date(params.from);
      fromDate.setHours(0, 0, 0, 0);
      screeningWhere.startTime.gte = fromDate;
    }
    if (params.to) {
      const toDate = new Date(params.to);
      toDate.setHours(23, 59, 59, 999);
      screeningWhere.startTime.lte = toDate;
    }
  }
  
  // Apply screening filter if any
  if (Object.keys(screeningWhere).length > 0) {
    where.screening = screeningWhere;
  }
  
  // Created date range
  if (params.createdFrom || params.createdTo) {
    where.createdAt = {};
    if (params.createdFrom) {
      where.createdAt.gte = new Date(params.createdFrom);
    }
    if (params.createdTo) {
      where.createdAt.lte = new Date(params.createdTo);
    }
  }
  
  // Payment status filter (via Order -> Payment)
  // Filter by latest payment status
  if (params.paymentStatus) {
    // We'll filter this in memory after fetching, as it requires joining through Order -> Payment
    // For now, we'll handle it after fetching tickets
  }
  
  // Pagination
  const page = parseInt(params.page) || 1;
  const size = parseInt(params.size) || 20;
  const skip = (page - 1) * size;

  // If search includes user fields, we need to fetch all and filter in memory
  // Otherwise, use pagination
  const needsInMemoryFilter = params.search && (
    params.search.includes('@') || // Email pattern
    /^\d+$/.test(params.search) // Phone pattern (all digits)
  );

  let tickets, total;

  if (needsInMemoryFilter) {
    // Fetch all matching tickets (without pagination for search)
    // Build where without OR for search
    const whereWithoutSearch = { ...where };
    delete whereWithoutSearch.OR;
    
    const allTickets = await prisma.ticket.findMany({
      where: whereWithoutSearch,
      include: {
        order: {
          include: {
            payments: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch users and screenings separately
    const userIds = [...new Set(allTickets.map(t => t.userId))];
    const screeningIds = [...new Set(allTickets.map(t => t.screeningId))];
    
    const [users, screenings] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      }),
      prisma.screening.findMany({
        where: { id: { in: screeningIds } },
      }),
    ]);

    // Fetch movies and cinemas separately
    const movieIds = [...new Set(screenings.map(s => s.movieId))];
    const cinemaIds = [...new Set(screenings.map(s => s.cinemaId))];
    
    const [movies, cinemas] = await Promise.all([
      prisma.movie.findMany({
        where: { id: { in: movieIds } },
      }),
      prisma.cinema.findMany({
        where: { id: { in: cinemaIds } },
      }),
    ]);

    // Attach movies and cinemas to screenings
    const screeningsWithRelations = screenings.map(screening => ({
      ...screening,
      movie: movies.find(m => m.id === screening.movieId) || null,
      cinema: cinemas.find(c => c.id === screening.cinemaId) || null,
    }));

    // Attach users and screenings to tickets
    const ticketsWithUsers = allTickets.map(ticket => ({
      ...ticket,
      user: users.find(u => u.id === ticket.userId) || null,
      screening: screeningsWithRelations.find(s => s.id === ticket.screeningId) || null,
    }));

    // Filter by payment status if specified
    let filtered = ticketsWithUsers;
    if (params.paymentStatus) {
      filtered = filtered.filter(ticket => {
        const latestPayment = ticket.order?.payments?.[0];
        return latestPayment?.status === params.paymentStatus;
      });
    }

    // Filter in memory for email/phone
    const searchLower = params.search.toLowerCase();
    filtered = filtered.filter(ticket =>
      ticket.code?.toLowerCase().includes(searchLower) ||
      ticket.orderId?.toLowerCase().includes(searchLower) ||
      ticket.user?.email?.toLowerCase().includes(searchLower) ||
      ticket.user?.phone?.toLowerCase().includes(searchLower)
    );

    total = filtered.length;
    // Apply pagination after filtering
    tickets = filtered.slice(skip, skip + size);
  } else {
    // Normal query with pagination
    // Fetch tickets without nested relations first (to avoid Prisma errors)
    const [ticketsData, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          order: {
            include: {
              payments: {
                orderBy: { createdAt: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: size,
      }),
      prisma.ticket.count({ where }),
    ]);

    // Fetch related data separately
    const userIds = [...new Set(ticketsData.map(t => t.userId))];
    const screeningIds = [...new Set(ticketsData.map(t => t.screeningId))];
    
    const [users, screenings] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      }),
      prisma.screening.findMany({
        where: { id: { in: screeningIds } },
      }),
    ]);

    // Fetch movies and cinemas separately
    const movieIds = [...new Set(screenings.map(s => s.movieId))];
    const cinemaIds = [...new Set(screenings.map(s => s.cinemaId))];
    
    const [movies, cinemas] = await Promise.all([
      prisma.movie.findMany({
        where: { id: { in: movieIds } },
      }),
      prisma.cinema.findMany({
        where: { id: { in: cinemaIds } },
      }),
    ]);

    // Attach users, movies, and cinemas to screenings, then to tickets
    const screeningsWithRelations = screenings.map(screening => ({
      ...screening,
      movie: movies.find(m => m.id === screening.movieId) || null,
      cinema: cinemas.find(c => c.id === screening.cinemaId) || null,
    }));

    tickets = ticketsData.map(ticket => ({
      ...ticket,
      user: users.find(u => u.id === ticket.userId) || null,
      screening: screeningsWithRelations.find(s => s.id === ticket.screeningId) || null,
    }));

    // Filter by payment status if specified
    if (params.paymentStatus) {
      tickets = tickets.filter(ticket => {
        const latestPayment = ticket.order?.payments?.[0];
        return latestPayment?.status === params.paymentStatus;
      });
    }
  }

  return {
    tickets,
    pagination: {
      page,
      size,
      total,
      totalPages: Math.ceil(total / size),
    },
  };
};

exports.getById = async (id) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          seatStatuses: {
            include: {
              seat: true,
            },
          },
        },
      },
    },
  });

  if (!ticket) return null;

  // Fetch user, screening, movie, and cinema separately
  const [user, screening] = await Promise.all([
    prisma.user.findUnique({
      where: { id: ticket.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    }),
    prisma.screening.findUnique({
      where: { id: ticket.screeningId },
    }),
  ]);

  if (!screening) {
    return {
      ...ticket,
      user: user || null,
      screening: null,
    };
  }

  // Fetch movie and cinema separately
  const [movie, cinema] = await Promise.all([
    prisma.movie.findUnique({
      where: { id: screening.movieId },
    }),
    prisma.cinema.findUnique({
      where: { id: screening.cinemaId },
    }),
  ]);

  return {
    ...ticket,
    user: user || null,
    screening: {
      ...screening,
      movie: movie || null,
      cinema: cinema || null,
    },
  };
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
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid ticket ID');
  }
  
  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({ 
      where: { id },
      include: {
        order: true,
      },
    });
    
    if (!ticket) {
      throw new Error(`Ticket not found: ${id}`);
    }
    
    // Allow canceling PENDING, ISSUED, and FAILED tickets
    // Don't allow canceling already CANCELED, REFUNDED, or LOCKED tickets
    if (ticket.status === 'CANCELED' || ticket.status === 'REFUNDED' || ticket.status === 'LOCKED') {
      throw new Error(`Cannot cancel ticket with status: ${ticket.status}`);
    }

    // Update ticket status to CANCELED
    const updatedTicket = await tx.ticket.update({
      where: { id },
      data: { status: 'CANCELED' },
    });

    // Create new SeatStatus with AVAILABLE to release the seat
    // This allows the seat to be booked again
    await tx.seatStatus.create({
      data: {
        seatId: ticket.seatId,
        screeningId: ticket.screeningId,
        status: 'AVAILABLE',
      },
    });

    // Check if all tickets in the order are canceled
    const orderTickets = await tx.ticket.findMany({
      where: { orderId: ticket.orderId },
    });

    const allCanceled = orderTickets.every(t => 
      t.status === 'CANCELED' || t.status === 'FAILED'
    );

    // If all tickets are canceled, update order status to CANCELED
    if (allCanceled && orderTickets.length > 0) {
      await tx.order.update({
        where: { id: ticket.orderId },
        data: { status: 'CANCELED' },
      });
    }

    return updatedTicket;
  }, {
    timeout: 10000,
  });
};

exports.lock = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid ticket ID');
  }
  
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    throw new Error(`Ticket not found: ${id}`);
  }
  
  if (ticket.status !== 'ISSUED' && ticket.status !== 'PENDING') {
    throw new Error('Only ISSUED or PENDING tickets can be locked');
  }

  return await prisma.ticket.update({
    where: { id },
    data: { status: 'LOCKED' },
  });
};

exports.unlock = async (id) => {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid ticket ID');
  }
  
  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) {
    throw new Error(`Ticket not found: ${id}`);
  }
  
  if (ticket.status !== 'LOCKED') {
    throw new Error('Only LOCKED tickets can be unlocked');
  }

  // Restore to previous status (default to ISSUED)
  return await prisma.ticket.update({
    where: { id },
    data: { status: 'ISSUED' },
  });
};

exports.refund = async (id, reason) => {
  if (!id || typeof id !== 'string') {
    throw new Error('Invalid ticket ID');
  }
  
  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id },
      include: { 
        order: { 
          include: { payments: true } 
        } 
      },
    });
    
    if (!ticket) {
      throw new Error(`Ticket not found: ${id}`);
    }
    
    if (ticket.status !== 'ISSUED') {
      throw new Error('Only ISSUED tickets can be refunded');
    }
    
    // Check if payment was made - support both SUCCESS and PAID status
    const paidPayment = ticket.order?.payments?.find(p => 
      p.status === 'SUCCESS' || p.status === 'PAID'
    );
    if (!paidPayment) {
      throw new Error('No paid payment found for this ticket');
    }

    // Check if payment is already refunded
    if (paidPayment.status === 'REFUNDED' || paidPayment.status === 'PARTIAL_REFUNDED') {
      throw new Error('Payment already refunded');
    }
    
    // Update ticket status to REFUNDED
    const updatedTicket = await tx.ticket.update({
      where: { id },
      data: { status: 'REFUNDED' },
    });

    // Create new SeatStatus with AVAILABLE to release the seat
    // This allows the seat to be booked again after refund
    await tx.seatStatus.create({
      data: {
        seatId: ticket.seatId,
        screeningId: ticket.screeningId,
        status: 'AVAILABLE',
      },
    });

    // Check if this is a partial refund (multiple tickets in order)
    const allTickets = await tx.ticket.findMany({
      where: { orderId: ticket.orderId },
    });
    
    const remainingTickets = allTickets.filter(t => t.status === 'ISSUED');
    const isLastTicket = remainingTickets.length === 1 && remainingTickets[0].id === ticket.id;
    
    // Calculate refund amount for this ticket
    const ticketPrice = ticket.price;
    
    // Return ticket info for refund processing outside transaction
    return {
      ticket: updatedTicket,
      paymentId: paidPayment.id,
      orderId: ticket.orderId,
      isLastTicket,
      ticketPrice,
      reason: reason || `Refund ticket ${ticket.code}`,
    };
  }, {
    timeout: 10000,
  });
};

/**
 * Check-in a ticket (mark as checked in)
 * Prevents duplicate check-in
 */
exports.checkIn = async (ticketId) => {
  if (!ticketId || typeof ticketId !== 'string') {
    throw new Error('Invalid ticket ID');
  }

  return await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: true,
        screening: true,
      },
    });

    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    // Check if ticket is already checked in
    if (ticket.checkInAt) {
      throw new Error('Ticket already checked in');
    }

    // Check if ticket status is valid for check-in
    if (ticket.status !== 'ISSUED') {
      throw new Error(`Cannot check-in ticket with status: ${ticket.status}`);
    }

    // Check if order is paid
    const paidPayment = await tx.payment.findFirst({
      where: {
        orderId: ticket.orderId,
        status: 'PAID',
      },
    });

    if (!paidPayment) {
      throw new Error('Order is not paid');
    }

    // Check if screening has started (allow check-in up to 30 minutes after start)
    const now = new Date();
    const startTime = new Date(ticket.screening.startTime);
    const minutesSinceStart = (now - startTime) / (1000 * 60);

    if (minutesSinceStart < -30) {
      throw new Error('Check-in is only available 30 minutes before showtime');
    }

    if (minutesSinceStart > 30) {
      throw new Error('Check-in is only available up to 30 minutes after showtime');
    }

    // Mark ticket as checked in
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        checkInAt: now,
      },
    });

    return updatedTicket;
  }, {
    timeout: 10000,
  });
};

// Export tickets to CSV
exports.exportToCSV = async (params = {}) => {
  // Use getAll but without pagination
  const allParams = { ...params };
  delete allParams.page;
  delete allParams.size;
  
  const result = await exports.getAll(allParams);
  const tickets = result.tickets || [];
  
  // CSV headers
  const headers = [
    'Mã vé',
    'Phim',
    'Suất chiếu',
    'Phòng',
    'Ghế',
    'Chi nhánh',
    'Khách hàng',
    'Email',
    'Số điện thoại',
    'Mã đơn',
    'Tổng tiền',
    'Phương thức thanh toán',
    'Trạng thái thanh toán',
    'Trạng thái vé',
    'Tạo lúc',
  ];
  
  // CSV rows
  const rows = tickets.map(ticket => {
    const latestPayment = ticket.order?.payments?.[0];
    const formatDate = (date) => {
      if (!date) return '';
      return new Date(date).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };
    const formatSeat = (row, col) => {
      if (!row || !col) return 'N/A';
      const rowLetter = String.fromCharCode(64 + row);
      return `${rowLetter}${col}`;
    };
    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
      }).format(amount || 0);
    };
    
    return [
      ticket.code || '',
      ticket.screening?.movie?.title || 'N/A',
      formatDate(ticket.screening?.startTime) || '',
      ticket.screening?.room || 'N/A',
      formatSeat(ticket.seatRow, ticket.seatCol),
      ticket.screening?.cinema?.name || 'N/A',
      ticket.user?.name || 'N/A',
      ticket.user?.email || '',
      ticket.user?.phone || '',
      ticket.orderId || '',
      formatCurrency(ticket.order?.totalAmount || ticket.price),
      latestPayment?.method || 'N/A',
      latestPayment?.status || 'N/A',
      ticket.status || '',
      formatDate(ticket.createdAt) || '',
    ];
  });
  
  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');
  
  return csvContent;
};

// Bulk operations
exports.bulkLock = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Ticket IDs are required');
  }
  
  const results = [];
  for (const id of ids) {
    try {
      const ticket = await exports.lock(id);
      results.push({ id, success: true, ticket });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }
  
  return results;
};

exports.bulkUnlock = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Ticket IDs are required');
  }
  
  const results = [];
  for (const id of ids) {
    try {
      const ticket = await exports.unlock(id);
      results.push({ id, success: true, ticket });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }
  
  return results;
};

exports.bulkCancel = async (ids) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Ticket IDs are required');
  }
  
  const results = [];
  for (const id of ids) {
    try {
      const ticket = await exports.cancel(id);
      results.push({ id, success: true, ticket });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }
  
  return results;
};

exports.bulkRefund = async (ids, reason) => {
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new Error('Ticket IDs are required');
  }
  
  // Use new refund service
  const refundService = require('./refunds/refund.service');
  const results = [];
  
  for (const id of ids) {
    try {
      // Use new refund service which handles everything (ticket, payment, order)
      const result = await refundService.refundTicket({
        ticketId: id,
        reason: reason || `Bulk refund ticket ${id}`,
        actorId: 'system', // System actor for bulk operations
      });
      
      // Check if ticket was actually refunded (even if status is not SUCCESS)
      // Wait a bit to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      const ticket = await prisma.ticket.findUnique({ where: { id } });
      const isRefunded = ticket && ticket.status === 'REFUNDED';
      
      // If ticket is refunded, it's a success regardless of result.status
      const success = result.status === 'SUCCESS' || isRefunded;
      
      results.push({ 
        id, 
        success: success, 
        ticket: result.ticket || ticket,
        error: success ? undefined : (result.message || 'Refund failed'),
      });
    } catch (error) {
      // Check if ticket was actually refunded despite the error
      // Wait a bit to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 100));
      try {
        const ticket = await prisma.ticket.findUnique({ where: { id } });
        const isRefunded = ticket && ticket.status === 'REFUNDED';
        
        if (isRefunded) {
          // Ticket was refunded successfully, even though there was an error
          results.push({ 
            id, 
            success: true, 
            ticket: ticket,
            error: undefined,
          });
        } else {
          // Ticket was not refunded, report the error
          results.push({ 
            id, 
            success: false, 
            error: error.message || 'Refund failed',
          });
        }
      } catch (checkError) {
        // If we can't check the ticket status, report the original error
        results.push({ 
          id, 
          success: false, 
          error: error.message || 'Refund failed',
        });
      }
    }
  }
  
  return { results };
};

