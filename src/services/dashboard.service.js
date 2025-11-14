const prisma = require('../prismaClient');

/**
 * Dashboard Service - Aggregates data for admin dashboard
 */

/**
 * Get dashboard summary
 */
exports.getSummary = async () => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Revenue calculations
  const [todayRevenue, weekRevenue, monthRevenue] = await Promise.all([
    // Today revenue (from successful payments - SUCCESS or PAID)
    prisma.payment.aggregate({
      where: {
        status: { in: ['SUCCESS', 'PAID'] }, // Include both SUCCESS and PAID
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    // Week revenue
    prisma.payment.aggregate({
      where: {
        status: { in: ['SUCCESS', 'PAID'] }, // Include both SUCCESS and PAID
        createdAt: { gte: weekAgo },
      },
      _sum: { amount: true },
    }),
    // Month revenue
    prisma.payment.aggregate({
      where: {
        status: { in: ['SUCCESS', 'PAID'] }, // Include both SUCCESS and PAID
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  // Tickets sold today (only issued tickets - successfully paid)
  const todayTickets = await prisma.ticket.count({
    where: {
      createdAt: { gte: todayStart },
      status: 'ISSUED', // Only count issued tickets (successfully paid)
    },
  });

  // Users
  const [totalUsers, newUsers7d] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: { gte: weekAgo },
      },
    }),
  ]);

  // Movies playing
  const moviesPlaying = await prisma.movie.count({
    where: {
      status: 'NOW_PLAYING',
    },
  });

  // Active promotions (events with status ACTIVE)
  const activePromotions = await prisma.event.count({
    where: {
      status: 'ACTIVE',
      endDate: { gte: now },
    },
  });

  // Active banners
  const activeBanners = await prisma.banner.count({
    where: {
      isActive: true,
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
  });

  // Payment gateways
  const [activeGateways, totalGateways] = await Promise.all([
    prisma.paymentGateway.count({
      where: { enabled: true },
    }),
    prisma.paymentGateway.count(),
  ]);

  return {
    todayRevenue: todayRevenue._sum.amount || 0,
    weekRevenue: weekRevenue._sum.amount || 0,
    monthRevenue: monthRevenue._sum.amount || 0,
    todayTickets,
    totalUsers,
    newUsers7d,
    moviesPlaying,
    activePromotions,
    activeBanners,
    activePaymentGateways: {
      active: activeGateways,
      total: totalGateways,
    },
  };
};

/**
 * Get revenue chart data
 */
exports.getRevenueChart = async (days = 30) => {
  const now = new Date();
  // Start from (days - 1) days ago to include today
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  // Get all successful payments in range (SUCCESS or PAID)
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ['SUCCESS', 'PAID'] }, // Include both SUCCESS and PAID
      createdAt: { gte: startDate },
    },
    select: {
      amount: true,
      createdAt: true,
      status: true, // For debugging
    },
  });

  console.log(`[Dashboard] getRevenueChart: Found ${payments.length} payments in last ${days} days`);
  if (payments.length > 0) {
    console.log(`[Dashboard] Sample payment:`, {
      amount: payments[0].amount,
      status: payments[0].status,
      createdAt: payments[0].createdAt,
    });
  }

  // Group by date (using local timezone, not UTC)
  const revenueByDate = {};
  payments.forEach(payment => {
    // Convert to local date string (Vietnam timezone UTC+7)
    const paymentDate = new Date(payment.createdAt);
    // Get local date string (YYYY-MM-DD)
    const year = paymentDate.getFullYear();
    const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const day = String(paymentDate.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    revenueByDate[date] = (revenueByDate[date] || 0) + (payment.amount || 0);
  });

  console.log(`[Dashboard] Revenue by date:`, Object.keys(revenueByDate).length, 'days with data');
  if (Object.keys(revenueByDate).length > 0) {
    console.log(`[Dashboard] Sample dates:`, Object.keys(revenueByDate).slice(0, 5));
  }

  // Convert to array format (using local timezone)
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    // Get local date string (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const revenue = revenueByDate[dateStr] || 0;
    result.push({
      date: dateStr,
      revenue: Number.isFinite(revenue) ? revenue : 0,
    });
  }

  console.log(`[Dashboard] Result array length:`, result.length);
  const totalRevenue = result.reduce((sum, d) => sum + d.revenue, 0);
  console.log(`[Dashboard] Total revenue in result:`, totalRevenue);

  return result;
};

/**
 * Get tickets chart data
 */
exports.getTicketsChart = async (days = 30) => {
  const now = new Date();
  // Start from (days - 1) days ago to include today
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - (days - 1));
  startDate.setHours(0, 0, 0, 0);

  // Get all tickets that have been issued (paid successfully)
  // Count tickets by their order's payment date (more accurate than ticket.createdAt)
  // First, get all successful payments in range
  const payments = await prisma.payment.findMany({
    where: {
      status: { in: ['SUCCESS', 'PAID'] },
      createdAt: { gte: startDate },
    },
    include: {
      order: {
        include: {
          tickets: {
            where: {
              status: 'ISSUED', // Only count issued tickets
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  console.log(`[Dashboard] getTicketsChart: Found ${payments.length} payments in last ${days} days`);
  if (payments.length > 0) {
    const totalTickets = payments.reduce((sum, p) => sum + (p.order?.tickets?.length || 0), 0);
    console.log(`[Dashboard] Total ISSUED tickets from payments:`, totalTickets);
  }

  // Group tickets by payment date (when payment was successful)
  // Use local timezone, not UTC
  const ticketsByDate = {};
  payments.forEach(payment => {
    // Convert to local date string (Vietnam timezone UTC+7)
    const paymentDate = new Date(payment.createdAt);
    // Get local date string (YYYY-MM-DD)
    const year = paymentDate.getFullYear();
    const month = String(paymentDate.getMonth() + 1).padStart(2, '0');
    const day = String(paymentDate.getDate()).padStart(2, '0');
    const date = `${year}-${month}-${day}`;
    const ticketCount = payment.order?.tickets?.length || 0;
    if (ticketCount > 0) {
      ticketsByDate[date] = (ticketsByDate[date] || 0) + ticketCount;
    }
  });

  console.log(`[Dashboard] Tickets by date:`, Object.keys(ticketsByDate).length, 'days with data');
  if (Object.keys(ticketsByDate).length > 0) {
    console.log(`[Dashboard] Sample dates:`, Object.keys(ticketsByDate).slice(0, 5));
  }

  // Convert to array format (using local timezone)
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    // Get local date string (YYYY-MM-DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const tickets = ticketsByDate[dateStr] || 0;
    result.push({
      date: dateStr,
      tickets: Number.isFinite(tickets) ? tickets : 0,
    });
  }

  console.log(`[Dashboard] Result array length:`, result.length);
  const totalTickets = result.reduce((sum, d) => sum + d.tickets, 0);
  console.log(`[Dashboard] Total tickets in result:`, totalTickets);

  return result;
};

/**
 * Get upcoming screenings
 */
exports.getUpcomingScreenings = async (limit = 10) => {
  const now = new Date();
  
  const screenings = await prisma.screening.findMany({
    where: {
      startTime: { gte: now },
    },
    include: {
      movie: {
        select: {
          id: true,
          title: true,
          posterUrl: true,
        },
      },
      cinema: {
        select: {
          id: true,
          name: true,
        },
      },
      roomRef: {
        select: {
          id: true,
          name: true,
          seats: {
            select: {
              id: true,
            },
          },
        },
      },
      seatStatuses: {
        select: {
          seatId: true,
          status: true,
        },
      },
    },
    orderBy: {
      startTime: 'asc',
    },
    take: limit,
  });

  return screenings.map(screening => {
    // Count total seats from Room (new schema) or fallback to seatStatuses count
    let totalSeats = 0;
    if (screening.roomRef && screening.roomRef.seats) {
      // New schema: seats belong to Room
      totalSeats = screening.roomRef.seats.length;
    } else {
      // Fallback: count from seatStatuses (all statuses)
      totalSeats = screening.seatStatuses.length;
    }
    
    // Count available seats
    // Logic: availableSeats = totalSeats - soldSeats - heldSeats
    // Use unique seatIds to avoid counting duplicates
    const uniqueSeatStatuses = new Map();
    screening.seatStatuses.forEach(ss => {
      // Use seatId as key to avoid duplicates
      if (!uniqueSeatStatuses.has(ss.seatId)) {
        uniqueSeatStatuses.set(ss.seatId, ss.status);
      } else {
        // If duplicate, keep the most restrictive status (SOLD > HELD > PENDING > AVAILABLE)
        const currentStatus = uniqueSeatStatuses.get(ss.seatId);
        const statusPriority = { 'SOLD': 4, 'HELD': 3, 'PENDING': 2, 'AVAILABLE': 1 };
        if (statusPriority[ss.status] > statusPriority[currentStatus]) {
          uniqueSeatStatuses.set(ss.seatId, ss.status);
        }
      }
    });
    
    // Count sold and held seats (not available)
    const soldSeats = Array.from(uniqueSeatStatuses.values()).filter(s => s === 'SOLD').length;
    const heldSeats = Array.from(uniqueSeatStatuses.values()).filter(s => s === 'HELD' || s === 'PENDING').length;
    
    // Available seats = total - sold - held
    const unavailableSeats = soldSeats + heldSeats;
    const availableSeats = Math.max(0, totalSeats - unavailableSeats);
    
    // Get room name
    const roomName = screening.roomRef?.name || screening.room || 'N/A';
    
    return {
      screeningId: screening.id,
      time: screening.startTime,
      cinemaName: screening.cinema.name,
      movieTitle: screening.movie.title,
      moviePoster: screening.movie.posterUrl,
      room: roomName,
      seatsLeft: availableSeats,
      totalSeats: totalSeats || 0,
    };
  });
};

/**
 * Get active promotions
 */
exports.getPromotions = async (limit = 3) => {
  const now = new Date();
  
  const promotions = await prisma.event.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { endDate: null },
        { endDate: { gte: now } },
      ],
    },
    orderBy: [
      { isFeatured: 'desc' },
      { createdAt: 'desc' },
    ],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      imageUrl: true,
      thumbnailUrl: true,
      startDate: true,
      endDate: true,
    },
  });

  return promotions;
};

/**
 * Get active banners
 */
exports.getBanners = async (limit = 3) => {
  const now = new Date();
  
  const banners = await prisma.banner.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [
            { startDate: null },
            { startDate: { lte: now } },
          ],
        },
        {
          OR: [
            { endDate: null },
            { endDate: { gte: now } },
          ],
        },
      ],
    },
    orderBy: {
      order: 'asc',
    },
    take: limit,
    select: {
      id: true,
      title: true,
      imageUrl: true,
      linkUrl: true,
      linkType: true,
    },
  });

  return banners;
};

/**
 * Get activity feed
 */
exports.getActivity = async (limit = 20) => {
  const activities = await prisma.adminActivity.findMany({
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
  });

  return activities.map(activity => ({
    id: activity.id,
    actor: {
      id: activity.actor.id,
      name: activity.actor.name,
      email: activity.actor.email,
    },
    action: activity.action,
    resource: activity.resource,
    resourceId: activity.resourceId,
    metadata: activity.metadata,
    createdAt: activity.createdAt,
  }));
};

/**
 * Get system alerts
 */
exports.getAlerts = async () => {
  const alerts = [];
  const now = new Date();

  // Check webhook signature verification (check if any webhook has verified=false)
  const unverifiedWebhooks = await prisma.webhookEvent.count({
    where: {
      verified: false,
      receivedAt: {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Last 24h
      },
    },
  });

  if (unverifiedWebhooks > 0) {
    alerts.push({
      severity: 'warning',
      type: 'webhookSignatureMissing',
      message: `Có ${unverifiedWebhooks} webhook chưa được xác thực chữ ký trong 24h qua`,
      action: '/admin/payments',
    });
  }

  // Check disabled payment gateways
  const disabledGateways = await prisma.paymentGateway.findMany({
    where: {
      enabled: false,
    },
    select: {
      code: true,
      name: true,
    },
  });

  if (disabledGateways.length > 0) {
    alerts.push({
      severity: 'warning',
      type: 'disabledGateways',
      message: `${disabledGateways.length} cổng thanh toán đang bị tắt: ${disabledGateways.map(g => g.name).join(', ')}`,
      action: '/admin/payment-gateways',
      metadata: { gateways: disabledGateways },
    });
  }

  // Check expired payments
  const expiredPayments = await prisma.payment.count({
    where: {
      status: 'PENDING',
      expiresAt: {
        lt: now,
      },
    },
  });

  if (expiredPayments > 0) {
    alerts.push({
      severity: 'info',
      type: 'expiredPayments',
      message: `Có ${expiredPayments} thanh toán đã hết hạn cần xử lý`,
      action: '/admin/payments?status=PENDING',
    });
  }

  // Check recent payment errors
  const recentErrors = await prisma.payment.count({
    where: {
      status: 'FAILED',
      createdAt: {
        gte: new Date(now.getTime() - 24 * 60 * 60 * 1000),
      },
    },
  });

  if (recentErrors > 10) {
    alerts.push({
      severity: 'warning',
      type: 'recentPaymentErrors',
      message: `Có ${recentErrors} thanh toán thất bại trong 24h qua`,
      action: '/admin/payments?status=FAILED',
    });
  }

  // Check Redis (if available) - fallback to DB check
  // For now, we'll skip Redis check as it may not be configured
  // This can be added later if Redis is available
  alerts.push({
    severity: 'info',
    type: 'redisStatus',
    message: 'Redis: Chưa được cấu hình (không bắt buộc)',
    action: null,
  });

  return alerts;
};

/**
 * Log admin activity
 */
exports.logActivity = async (actorId, action, resource, resourceId = null, metadata = null) => {
  return await prisma.adminActivity.create({
    data: {
      actorId,
      action,
      resource,
      resourceId,
      metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : null,
    },
  });
};

