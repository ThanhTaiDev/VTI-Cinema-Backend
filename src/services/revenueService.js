const prisma = require('../prismaClient');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ = 'Asia/Ho_Chi_Minh';

// Helper: Build where clause for filters
const buildWhereClause = (params) => {
  const where = {};
  
  // Date range filter (Vietnam timezone UTC+7)
  // Helper functions to parse dates with explicit UTC+7 offset
  const parseVNDateStart = (dStr) => {
    if (!dStr) return null;
    if (dStr.includes('T') || dStr.includes('+')) {
      // ISO string with offset, parse directly
      return dayjs(dStr).toDate();
    } else {
      // YYYY-MM-DD format, explicitly set to UTC+7
      return dayjs.tz(dStr + 'T00:00:00.000+07:00', TZ).toDate();
    }
  };
  
  const parseVNDateEnd = (dStr) => {
    if (!dStr) return null;
    if (dStr.includes('T') || dStr.includes('+')) {
      // ISO string with offset, parse directly
      return dayjs(dStr).toDate();
    } else {
      // YYYY-MM-DD format, explicitly set to UTC+7
      return dayjs.tz(dStr + 'T23:59:59.999+07:00', TZ).toDate();
    }
  };
  
  if (params.fromDate || params.toDate) {
    where.createdAt = {};
    if (params.fromDate) {
      where.createdAt.gte = parseVNDateStart(params.fromDate);
    }
    if (params.toDate) {
      where.createdAt.lte = parseVNDateEnd(params.toDate);
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

// Get daily revenue with proper date range
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

  // Generate date range
  let startDate, endDate;
  if (params.fromDate && params.toDate) {
    startDate = new Date(params.fromDate);
    endDate = new Date(params.toDate);
  } else if (params.fromDate) {
    startDate = new Date(params.fromDate);
    endDate = new Date();
  } else if (params.toDate) {
    endDate = new Date(params.toDate);
    startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default to 30 days back
  } else {
    // Default to last 30 days
    endDate = new Date();
    startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }

  // Initialize all dates in range with 0
  const dailyData = {};
  const currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    dailyData[dateKey] = {
      date: dateKey,
      grossRevenue: 0,
      netRevenue: 0,
      fees: 0,
      orders: new Set(),
      tickets: 0,
      refunds: 0
    };
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group payments by date (Vietnam timezone)
  payments.forEach((payment) => {
    const date = new Date(payment.createdAt);
    // Convert to Vietnam timezone (UTC+7)
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
  const { period = 'day' } = params;
  
  // Current period
  const currentStats = await exports.getStats(params);
  
  // Previous period - calculate date range shift
  let previousParams = { ...params };
  delete previousParams.period; // Remove period from filters
  
  // Calculate date range for current period
  let fromDate, toDate;
  if (params.fromDate && params.toDate) {
    fromDate = new Date(params.fromDate);
    toDate = new Date(params.toDate);
  } else if (params.fromDate) {
    fromDate = new Date(params.fromDate);
    toDate = new Date();
  } else if (params.toDate) {
    toDate = new Date(params.toDate);
    fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  } else {
    // Default to last 30 days
    toDate = new Date();
    fromDate = new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  }
  
  // Calculate period length
  const periodLength = toDate.getTime() - fromDate.getTime();
  
  // Shift dates back by period length
  previousParams.toDate = new Date(fromDate.getTime() - 1).toISOString().split('T')[0];
  previousParams.fromDate = new Date(fromDate.getTime() - periodLength).toISOString().split('T')[0];
  
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

  return payments.map(payment => {
    const netAmount = payment.netAmount !== null && payment.netAmount !== undefined
      ? payment.netAmount
      : (payment.amount || 0) - (payment.fee || 0);
    
    return {
      date: new Date(payment.createdAt).toISOString().split('T')[0],
      orderId: payment.orderId,
      paymentId: payment.id,
      movie: payment.order?.screening?.movie?.title || 'N/A',
      cinema: payment.order?.screening?.cinema?.name || 'N/A',
      screening: payment.order?.screeningId,
      screeningTime: payment.order?.screening?.startTime,
      ticketCount: payment.order?.tickets?.length || 0,
      gross: payment.amount || 0,
      fee: payment.fee || 0,
      net: netAmount,
      method: payment.method,
      status: payment.status,
      source: payment.source || 'web',
      createdAt: payment.createdAt
    };
  });
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
        count: 0,
        firstDate: payment.createdAt,
        lastDate: payment.createdAt
      };
    }
    
    settlement[method].totalAmount += payment.amount || 0;
    settlement[method].totalFees += payment.fee || 0;
    const netAmount = payment.netAmount !== null && payment.netAmount !== undefined
      ? payment.netAmount
      : (payment.amount || 0) - (payment.fee || 0);
    settlement[method].netAmount += netAmount;
    settlement[method].count += 1;
    
    // Track date range
    if (new Date(payment.createdAt) < new Date(settlement[method].firstDate)) {
      settlement[method].firstDate = payment.createdAt;
    }
    if (new Date(payment.createdAt) > new Date(settlement[method].lastDate)) {
      settlement[method].lastDate = payment.createdAt;
    }
  });

  return Object.values(settlement);
};

// Get top movies by revenue
exports.getTopMovies = async (params = {}, limit = 5) => {
  const where = buildWhereClause(params);

  const payments = await prisma.payment.findMany({
    where: {
      ...where,
      status: { in: ['PAID', 'SUCCESS'] }
    },
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
    }
  });

  // Group by movie
  const movieStats = {};
  
  payments.forEach(payment => {
    const movieId = payment.order?.screening?.movieId;
    const movie = payment.order?.screening?.movie;
    
    if (movieId && movie) {
      if (!movieStats[movieId]) {
        movieStats[movieId] = {
          movieId,
          movieTitle: movie.title,
          revenue: 0,
          tickets: 0,
          orders: new Set()
        };
      }
      
      movieStats[movieId].revenue += payment.amount || 0;
      movieStats[movieId].tickets += payment.order?.tickets?.length || 0;
      movieStats[movieId].orders.add(payment.orderId);
    }
  });

  return Object.values(movieStats)
    .map(m => ({
      ...m,
      orders: m.orders.size
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
};

// Get revenue by cinema
exports.getRevenueByCinema = async (params = {}) => {
  const where = buildWhereClause(params);

  const payments = await prisma.payment.findMany({
    where: {
      ...where,
      status: { in: ['PAID', 'SUCCESS'] }
    },
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
    }
  });

  // Fetch cinemas
  const cinemaIds = [...new Set(payments.map(p => p.order?.screening?.cinemaId).filter(Boolean))];
  const cinemas = cinemaIds.length > 0 ? await prisma.cinema.findMany({
    where: { id: { in: cinemaIds } }
  }) : [];
  const cinemaMap = new Map(cinemas.map(c => [c.id, c]));

  // Group by cinema
  const cinemaStats = {};
  
  payments.forEach(payment => {
    const cinemaId = payment.order?.screening?.cinemaId;
    const cinema = cinemaMap.get(cinemaId);
    
    if (cinemaId && cinema) {
      if (!cinemaStats[cinemaId]) {
        cinemaStats[cinemaId] = {
          cinemaId,
          cinemaName: cinema.name,
          revenue: 0,
          tickets: 0,
          orders: new Set()
        };
      }
      
      cinemaStats[cinemaId].revenue += payment.amount || 0;
      cinemaStats[cinemaId].tickets += payment.order?.tickets?.length || 0;
      cinemaStats[cinemaId].orders.add(payment.orderId);
    }
  });

  return Object.values(cinemaStats)
    .map(c => ({
      ...c,
      orders: c.orders.size
    }))
    .sort((a, b) => b.revenue - a.revenue);
};
