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

/**
 * Initialize payment for an order
 */
exports.initPayment = async (orderId, userId, method, idempotencyKey) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      screening: {
        include: {
          movie: true,
          cinema: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error('Order not found');
  }

  if (order.userId !== userId) {
    throw new Error('Order does not belong to user');
  }

  if (order.status !== 'PENDING') {
    throw new Error('Order is not in pending status');
  }

  // Check if order has expired
  if (new Date(order.expiresAt) < new Date()) {
    throw new Error('Order has expired');
  }

  // Check if payment already exists
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  if (existingPayment && existingPayment.status === 'PENDING') {
    return existingPayment;
  }

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      orderId,
      amount: order.totalAmount,
      method: method || 'mock',
      status: 'PENDING',
      webhookData: JSON.stringify({ idempotencyKey }),
    },
    include: {
      order: {
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

  // Generate redirect URL (mock for now)
  const redirectUrl = method === 'mock' 
    ? `/payment/success/${payment.id}`
    : `https://payment-gateway.com/checkout/${payment.id}`;

  // Update payment with redirect URL
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { redirectUrl },
    include: {
      order: {
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

  return updatedPayment;
};

/**
 * Handle webhook from payment gateway
 */
exports.handleWebhook = async (webhookData, signature) => {
  // For mock payment, auto approve
  const { type, orderId, paymentId } = webhookData;

  let payment;
  
  if (paymentId) {
    payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: true },
    });
  } else if (orderId) {
    payment = await prisma.payment.findFirst({
      where: { orderId },
      orderBy: { createdAt: 'desc' },
      include: { order: true },
    });
  }

  if (!payment) {
    throw new Error('Payment not found');
  }

  // Update payment status
  const status = type === 'payment.succeeded' || type === 'payment.success' ? 'PAID' : 'FAILED';
  
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      externalRef: webhookData.externalRef || webhookData.paymentId,
      webhookData: JSON.stringify(webhookData),
    },
    include: { order: true },
  });

  // Update order status if payment successful
  if (status === 'PAID') {
    const orderService = require('./orderService');
    await orderService.updateOrderStatus(orderId, 'PAID');
  }

  return updatedPayment;
};

