const prisma = require('../prismaClient');

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

  // Create tickets for each seat
  const tickets = await Promise.all(
    seats.map(async (seat) => {
      return await prisma.ticket.create({
        data: {
          screeningId,
          seatRow: seat.row,
          seatCol: seat.col.toString(),
          userId,
          price: price || 100000,
          status: 'PENDING',
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

  return tickets.length === 1 ? tickets[0] : tickets;
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

