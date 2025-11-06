const prisma = require('../prismaClient');

// Helper: Convert to Vietnam timezone
const toVietnamTime = (date) => {
  if (!date) return null;
  const d = new Date(date);
  // Vietnam is UTC+7
  return new Date(d.getTime() + (7 * 60 * 60 * 1000));
};

// Helper: Build where clause for filters
const buildWhereClause = (params) => {
  const where = {};
  
  // Date range filter
  if (params.fromDate || params.toDate) {
    where.createdAt = {};
    if (params.fromDate) {
      const fromDate = new Date(params.fromDate);
      fromDate.setHours(0, 0, 0, 0);
      where.createdAt.gte = fromDate;
    }
    if (params.toDate) {
      const toDate = new Date(params.toDate);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  // Payment status filter - only count PAID/SUCCESS payments
  if (params.status) {
    if (params.status === 'PAID') {
      where.status = { in: ['PAID', 'SUCCESS'] };
    } else {
      where.status = params.status;
    }
  } else {
    // Default: only count successful payments
    where.status = { in: ['PAID', 'SUCCESS'] };
  }

  // Payment method filter
  if (params.method) {
    where.method = params.method;
  }

  // Source filter
  if (params.source) {
    where.source = params.source;
  }

  // Cinema filter (via order -> screening -> cinema)
  if (params.cinemaId) {
    where.order = {
      screening: {
        cinemaId: params.cinemaId
      }
    };
  }

  // Movie filter (via order -> screening -> movie)
  if (params.movieId) {
    where.order = {
      ...where.order,
      screening: {
        ...where.order?.screening,
        movieId: params.movieId
      }
    };
  }

  // Screening filter
  if (params.screeningId) {
    where.order = {
      ...where.order,
      screeningId: params.screeningId
    };
  }

  return where;
};

// Get comprehensive stats
exports.getStats = async (params = {}) => {
  const where = buildWhereClause(params);

  // Get all successful payments with related data
  const payments = await prisma.payment.findMany({
    where,
    include: {
      order: {
        include: {
          screening: {
            include: {
              movie: true
            }
          },
          tickets: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch cinemas separately and attach to screenings
  const cinemaIds = [...new Set(payments.map(p => p.order?.screening?.cinemaId).filter(Boolean))];
  const cinemas = cinemaIds.length > 0 ? await prisma.cinema.findMany({
    where: { id: { in: cinemaIds } }
  }) : [];
  const cinemaMap = new Map(cinemas.map(c => [c.id, c]));
  
  // Attach cinema to each screening
  payments.forEach(payment => {
    if (payment.order?.screening?.cinemaId) {
      payment.order.screening.cinema = cinemaMap.get(payment.order.screening.cinemaId);
    }
  });

  // Calculate metrics
  const successfulPayments = payments.filter(p => ['PAID', 'SUCCESS'].includes(p.status));
  const refundedPayments = payments.filter(p => p.status === 'REFUNDED');
  const failedPayments = payments.filter(p => p.status === 'FAILED');

  // Gross revenue (total amount of successful payments)
  const grossRevenue = successfulPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  
  // Total fees
  const totalFees = successfulPayments.reduce((sum, p) => sum + (p.fee || 0), 0);
  
  // Net revenue (gross - fees - refunds)
  const refundAmount = refundedPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  // Calculate netAmount for each payment (if not set, calculate: amount - fee)
  const calculatedNetRevenue = successfulPayments.reduce((sum, p) => {
    const netAmount = p.netAmount !== null && p.netAmount !== undefined 
      ? p.netAmount 
      : (p.amount || 0) - (p.fee || 0);
    return sum + netAmount;
  }, 0);
  const netRevenue = calculatedNetRevenue - refundAmount;

  // Count orders (unique orderIds)
  const uniqueOrderIds = [...new Set(successfulPayments.map(p => p.orderId))];
  const totalOrders = uniqueOrderIds.length;

  // Count tickets
  const totalTickets = successfulPayments.reduce((sum, p) => {
    return sum + (p.order?.tickets?.length || 0);
  }, 0);

  // AOV (Average Order Value)
  const aov = totalOrders > 0 ? grossRevenue / totalOrders : 0;

  // Average ticket price
  const avgTicketPrice = totalTickets > 0 ? grossRevenue / totalTickets : 0;

  // Refund rate
  const refundRate = payments.length > 0 ? (refundedPayments.length / payments.length) * 100 : 0;

  // Seat occupancy (for screenings in date range)
  let totalSeats = 0;
  let soldSeats = 0;
  
  if (params.fromDate || params.toDate) {
    const screeningWhere = {};
    if (params.fromDate) {
      screeningWhere.startTime = { gte: new Date(params.fromDate) };
    }
    if (params.toDate) {
      const toDate = new Date(params.toDate);
      toDate.setHours(23, 59, 59, 999);
      screeningWhere.startTime = { lte: toDate };
    }

    const screenings = await prisma.screening.findMany({
      where: screeningWhere,
      select: { id: true }
    });

    const screeningIds = screenings.map(s => s.id);
    
    if (screeningIds.length > 0) {
      // Get total seats for these screenings
      const seats = await prisma.seat.findMany({
        where: {
          screeningId: { in: screeningIds }
        }
      });
      totalSeats = seats.length;

      // Get sold seats (SeatStatus with status = 'SOLD')
      const soldSeatStatuses = await prisma.seatStatus.findMany({
        where: {
          screeningId: { in: screeningIds },
          status: 'SOLD'
        }
      });
      soldSeats = soldSeatStatuses.length;
    }
  }

  const seatOccupancy = totalSeats > 0 ? (soldSeats / totalSeats) * 100 : 0;

  return {
    grossRevenue,
    netRevenue,
    totalFees,
    refundAmount,
    totalOrders,
    totalTickets,
    aov,
    avgTicketPrice,
    refundRate,
    seatOccupancy,
    totalPayments: payments.length,
    successfulPayments: successfulPayments.length,
    refundedPayments: refundedPayments.length,
    failedPayments: failedPayments.length
  };
};

// Get daily revenue
exports.getDailyRevenue = async (params = {}) => {
  const where = buildWhereClause(params);

  const payments = await prisma.payment.findMany({
    where,
    include: {
      order: {
        include: {
          screening: {
            include: {
              movie: true
            }
          },
          tickets: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  // Fetch cinemas separately and attach to screenings
  const cinemaIds = [...new Set(payments.map(p => p.order?.screening?.cinemaId).filter(Boolean))];
  const cinemas = cinemaIds.length > 0 ? await prisma.cinema.findMany({
    where: { id: { in: cinemaIds } }
  }) : [];
  const cinemaMap = new Map(cinemas.map(c => [c.id, c]));
  
  // Attach cinema to each screening
  payments.forEach(payment => {
    if (payment.order?.screening?.cinemaId) {
      payment.order.screening.cinema = cinemaMap.get(payment.order.screening.cinemaId);
    }
  });

  // Group by date (Vietnam timezone)
  const dailyData = {};
  
  payments.forEach((payment) => {
    const date = new Date(payment.createdAt);
    // Convert to Vietnam timezone
    const vietnamDate = new Date(date.getTime() + (7 * 60 * 60 * 1000));
    const dateKey = vietnamDate.toISOString().split('T')[0];
    
    if (!dailyData[dateKey]) {
      dailyData[dateKey] = {
        date: dateKey,
        grossRevenue: 0,
        netRevenue: 0,
        fees: 0,
        orders: new Set(),
        tickets: 0,
        refunds: 0
      };
    }

    const dayData = dailyData[dateKey];
    
    if (['PAID', 'SUCCESS'].includes(payment.status)) {
      dayData.grossRevenue += payment.amount || 0;
      const netAmount = payment.netAmount !== null && payment.netAmount !== undefined
        ? payment.netAmount
        : (payment.amount || 0) - (payment.fee || 0);
      dayData.netRevenue += netAmount;
      dayData.fees += payment.fee || 0;
      dayData.orders.add(payment.orderId);
      dayData.tickets += payment.order?.tickets?.length || 0;
    } else if (payment.status === 'REFUNDED') {
      dayData.refunds += payment.amount || 0;
    }
  });

  // Convert to array and calculate AOV
  return Object.values(dailyData).map(day => ({
    date: day.date,
    revenue: day.grossRevenue,
    netRevenue: day.netRevenue,
    fees: day.fees,
    orders: day.orders.size,
    tickets: day.tickets,
    aov: day.orders.size > 0 ? day.grossRevenue / day.orders.size : 0,
    refunds: day.refunds
  })).sort((a, b) => a.date.localeCompare(b.date));
};

// Get comparison stats (WoW/DoD/YoY)
exports.getComparisonStats = async (params = {}) => {
  const { period = 'day', compareWith = 'previous' } = params;
  
  // Current period
  const currentStats = await exports.getStats(params);
  
  // Previous period
  let previousParams = { ...params };
  const fromDate = params.fromDate ? new Date(params.fromDate) : new Date();
  const toDate = params.toDate ? new Date(params.toDate) : new Date();
  
  let daysDiff = 0;
  if (period === 'day') {
    daysDiff = 1;
  } else if (period === 'week') {
    daysDiff = 7;
  } else if (period === 'month') {
    daysDiff = 30;
  } else if (period === 'year') {
    daysDiff = 365;
  }

  previousParams.fromDate = new Date(fromDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
  previousParams.toDate = new Date(toDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
  
  const previousStats = await exports.getStats(previousParams);

  // Calculate percentage changes
  const calculateChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    current: currentStats,
    previous: previousStats,
    changes: {
      grossRevenue: calculateChange(currentStats.grossRevenue, previousStats.grossRevenue),
      netRevenue: calculateChange(currentStats.netRevenue, previousStats.netRevenue),
      totalOrders: calculateChange(currentStats.totalOrders, previousStats.totalOrders),
      totalTickets: calculateChange(currentStats.totalTickets, previousStats.totalTickets),
      aov: calculateChange(currentStats.aov, previousStats.aov),
      avgTicketPrice: calculateChange(currentStats.avgTicketPrice, previousStats.avgTicketPrice)
    }
  };
};

// Get detailed revenue data for export
exports.getDetailedRevenue = async (params = {}) => {
  const where = buildWhereClause(params);

  const payments = await prisma.payment.findMany({
    where,
    include: {
      order: {
        include: {
          screening: {
            include: {
              movie: true
            }
          },
          tickets: true
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Fetch cinemas separately and attach to screenings
  const cinemaIds = [...new Set(payments.map(p => p.order?.screening?.cinemaId).filter(Boolean))];
  const cinemas = cinemaIds.length > 0 ? await prisma.cinema.findMany({
    where: { id: { in: cinemaIds } }
  }) : [];
  const cinemaMap = new Map(cinemas.map(c => [c.id, c]));
  
  // Attach cinema to each screening
  payments.forEach(payment => {
    if (payment.order?.screening?.cinemaId) {
      payment.order.screening.cinema = cinemaMap.get(payment.order.screening.cinemaId);
    }
  });

  return payments.map(payment => ({
    orderId: payment.orderId,
    paymentId: payment.id,
    movie: payment.order?.screening?.movie?.title || 'N/A',
    cinema: payment.order?.screening?.cinema?.name || 'N/A',
    screening: payment.order?.screeningId,
    screeningTime: payment.order?.screening?.startTime,
    ticketCount: payment.order?.tickets?.length || 0,
    gross: payment.amount || 0,
    fee: payment.fee || 0,
    net: payment.netAmount || (payment.amount || 0) - (payment.fee || 0),
    method: payment.method,
    status: payment.status,
    source: payment.source || 'web',
    createdAt: payment.createdAt
  }));
};

// Get settlement data by payment gateway
exports.getSettlement = async (params = {}) => {
  const where = buildWhereClause(params);

  const payments = await prisma.payment.findMany({
    where: {
      ...where,
      status: { in: ['PAID', 'SUCCESS'] }
    }
  });

  // Group by payment method
  const settlement = {};
  
  payments.forEach(payment => {
    const method = payment.method || 'UNKNOWN';
    if (!settlement[method]) {
      settlement[method] = {
        method,
        totalAmount: 0,
        totalFees: 0,
        netAmount: 0,
        count: 0
      };
    }
    
    settlement[method].totalAmount += payment.amount || 0;
    settlement[method].totalFees += payment.fee || 0;
    const netAmount = payment.netAmount !== null && payment.netAmount !== undefined
      ? payment.netAmount
      : (payment.amount || 0) - (payment.fee || 0);
    settlement[method].netAmount += netAmount;
    settlement[method].count += 1;
  });

  return Object.values(settlement);
};
