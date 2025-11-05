const prisma = require('../prismaClient');

exports.create = async (data, userId) => {
  const { ticketId, method, amount } = data;
  
  if (!ticketId || !method) {
    throw new Error('Ticket ID and payment method are required');
  }

  // Verify ticket belongs to user
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: { user: true },
  });

  if (!ticket) {
    throw new Error('Ticket not found');
  }
  if (ticket.userId !== userId) {
    throw new Error('Ticket does not belong to user');
  }

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      ticketId,
      amount: amount || ticket.price,
      method,
      status: 'PENDING',
    },
    include: {
      ticket: {
        include: {
          screening: {
            include: {
              movie: true,
              cinema: true,
            },
          },
        },
      },
    },
  });

  // Update ticket status to PENDING (waiting for payment)
  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'PENDING' },
  });

  return payment;
};

exports.getById = async (id) => {
  return await prisma.payment.findUnique({
    where: { id },
    include: {
      ticket: {
        include: {
          screening: {
            include: {
              movie: true,
              cinema: true,
            },
          },
          user: true,
        },
      },
    },
  });
};

exports.verify = async (id, data) => {
  const { status, externalRef } = data;
  
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { ticket: true },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Update payment status
  const updatedPayment = await prisma.payment.update({
    where: { id },
    data: {
      status: status || 'SUCCESS',
      externalRef,
    },
  });

  // Update ticket status if payment successful
  if (status === 'SUCCESS') {
    await prisma.ticket.update({
      where: { id: payment.ticketId },
      data: { status: 'SUCCESS' },
    });
  }

  return updatedPayment;
};

