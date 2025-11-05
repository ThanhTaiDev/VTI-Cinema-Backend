const prisma = require('../prismaClient');

exports.getStats = async (params = {}) => {
  const where = {};
  
  if (params.fromDate || params.toDate) {
    where.createdAt = {};
    if (params.fromDate) {
      where.createdAt.gte = new Date(params.fromDate);
    }
    if (params.toDate) {
      const toDate = new Date(params.toDate);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      ...where,
      status: 'SUCCESS',
    },
  });

  const totalRevenue = tickets.reduce((sum, ticket) => sum + (ticket.price || 0), 0);
  const totalTickets = tickets.length;

  return {
    totalRevenue,
    totalTickets,
  };
};

exports.getDailyRevenue = async (params = {}) => {
  const where = {};
  
  if (params.fromDate || params.toDate) {
    where.createdAt = {};
    if (params.fromDate) {
      where.createdAt.gte = new Date(params.fromDate);
    }
    if (params.toDate) {
      const toDate = new Date(params.toDate);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  const tickets = await prisma.ticket.findMany({
    where: {
      ...where,
      status: 'SUCCESS',
    },
  });

  // Group by date
  const dailyRevenue = {};
  tickets.forEach((ticket) => {
    const date = ticket.createdAt.toISOString().split('T')[0];
    if (!dailyRevenue[date]) {
      dailyRevenue[date] = 0;
    }
    dailyRevenue[date] += ticket.price || 0;
  });

  // Convert to array format
  return Object.entries(dailyRevenue).map(([date, revenue]) => ({
    date,
    revenue,
  })).sort((a, b) => a.date.localeCompare(b.date));
};

