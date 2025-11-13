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
    // Today revenue (from successful payments)
    prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: todayStart },
      },
      _sum: { amount: true },
    }),
    // Week revenue
    prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: weekAgo },
      },
      _sum: { amount: true },
    }),
    // Month revenue
    prisma.payment.aggregate({
      where: {
        status: 'SUCCESS',
        createdAt: { gte: monthStart },
      },
      _sum: { amount: true },
    }),
  ]);

  // Tickets sold today
  const todayTickets = await prisma.ticket.count({
    where: {
      createdAt: { gte: todayStart },
      status: { not: 'CANCELED' },
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
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get all successful payments in range
  const payments = await prisma.payment.findMany({
    where: {
      status: 'SUCCESS',
      createdAt: { gte: startDate },
    },
    select: {
      amount: true,
      createdAt: true,
    },
  });

  // Group by date
  const revenueByDate = {};
  payments.forEach(payment => {
    const date = new Date(payment.createdAt).toISOString().split('T')[0];
    revenueByDate[date] = (revenueByDate[date] || 0) + payment.amount;
  });

  // Convert to array format
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const revenue = revenueByDate[dateStr] || 0;
    result.push({
      date: dateStr,
      revenue: Number.isFinite(revenue) ? revenue : 0,
    });
  }

  return result;
};

/**
 * Get tickets chart data
 */
exports.getTicketsChart = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  // Get all tickets in range
  const tickets = await prisma.ticket.findMany({
    where: {
      createdAt: { gte: startDate },
      status: { not: 'CANCELED' },
    },
    select: {
      createdAt: true,
    },
  });

  // Group by date
  const ticketsByDate = {};
  tickets.forEach(ticket => {
    const date = new Date(ticket.createdAt).toISOString().split('T')[0];
    ticketsByDate[date] = (ticketsByDate[date] || 0) + 1;
  });

  // Convert to array format
  const result = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    const tickets = ticketsByDate[dateStr] || 0;
    result.push({
      date: dateStr,
      tickets: Number.isFinite(tickets) ? tickets : 0,
    });
  }

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
      seats: {
        select: {
          id: true,
        },
      },
      seatStatuses: {
        select: {
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
    // Count total seats
    const totalSeats = screening.seats.length;
    // Count available seats
    const availableSeats = screening.seatStatuses.filter(s => s.status === 'AVAILABLE').length;
    
    return {
      screeningId: screening.id,
      time: screening.startTime,
      cinemaName: screening.cinema.name,
      movieTitle: screening.movie.title,
      moviePoster: screening.movie.posterUrl,
      room: screening.room,
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

