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

  // Calculate fee based on payment method
  const feeRates = {
    MOCK: 0,
    STRIPE: 0.02,
    MOMO: 0.015,
    VNPAY: 0.015,
  };
  const paymentAmount = amount || ticket.price;
  const feeRate = feeRates[method] || 0.02;
  const fee = Math.round(paymentAmount * feeRate);
  const netAmount = paymentAmount - fee;

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      ticketId,
      amount: paymentAmount,
      fee,
      netAmount,
      method,
      status: 'PENDING',
      source: 'web',
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
  // Fetch order without movie/cinema (fetch separately)
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      screening: true,
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

  // Fetch movie and cinema separately
  const [movie, cinema] = await Promise.all([
    prisma.movie.findUnique({ where: { id: order.screening.movieId } }),
    prisma.cinema.findUnique({ where: { id: order.screening.cinemaId } }),
  ]);

  // Attach movie and cinema to screening for backward compatibility
  order.screening.movie = movie;
  order.screening.cinema = cinema;

  // Check if payment already exists
  const existingPayment = await prisma.payment.findFirst({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
  });

  if (existingPayment && existingPayment.status === 'PENDING') {
    // Attach order with movie/cinema to existing payment
    existingPayment.order = order;
    return existingPayment;
  }

  // Calculate fee based on payment method
  const feeRates = {
    MOCK: 0,
    STRIPE: 0.02,
    MOMO: 0.015,
    VNPAY: 0.015,
  };
  const paymentMethod = method || 'MOCK';
  const feeRate = feeRates[paymentMethod] || 0.02;
  const fee = Math.round(order.totalAmount * feeRate);
  const netAmount = order.totalAmount - fee;

  // Create payment
  const payment = await prisma.payment.create({
    data: {
      orderId,
      amount: order.totalAmount,
      fee,
      netAmount,
      method: paymentMethod,
      status: 'PENDING',
      source: 'web',
      webhookData: JSON.stringify({ idempotencyKey }),
    },
    include: {
      order: {
        include: {
          screening: true,
        },
      },
    },
  });

  // Attach movie and cinema to payment.order.screening for backward compatibility
  payment.order.screening.movie = movie;
  payment.order.screening.cinema = cinema;

  // Generate redirect URL (mock for now)
  // For mock payment, redirect to payment page with order ID
  // Frontend route is /payment/:ticketId (using order.id as ticketId)
  const redirectUrl = method === 'mock' 
    ? `/payment/${orderId}`
    : `https://payment-gateway.com/checkout/${payment.id}`;

  // Update payment with redirect URL
  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: { redirectUrl },
    include: {
      order: {
        include: {
          screening: true,
        },
      },
    },
  });

  // Attach movie and cinema to updatedPayment.order.screening for backward compatibility
  updatedPayment.order.screening.movie = movie;
  updatedPayment.order.screening.cinema = cinema;

  return updatedPayment;
};

/**
 * Handle webhook from payment gateway
 */
exports.handleWebhook = async (webhookData, signature) => {
  // For mock payment, auto approve
  const { type, orderId, paymentId } = webhookData;

  console.log('[Webhook] Received webhook:', { type, orderId, paymentId });

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

  // If payment not found but orderId exists, create payment for mock testing
  if (!payment && orderId) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { 
        screening: true,
        seatStatuses: true,
      },
    });
    
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    console.log('[Webhook] Creating payment for order:', orderId);

    // Create payment if doesn't exist (for mock testing)
    // Calculate fee for mock payment
    const feeRates = {
      MOCK: 0,
      STRIPE: 0.02,
      MOMO: 0.015,
      VNPAY: 0.015,
    };
    const feeRate = feeRates['MOCK'] || 0;
    const fee = Math.round(order.totalAmount * feeRate);
    const netAmount = order.totalAmount - fee;

    payment = await prisma.payment.create({
      data: {
        orderId,
        amount: order.totalAmount,
        fee,
        netAmount,
        method: 'MOCK',
        status: 'PENDING',
        source: 'web',
        webhookData: JSON.stringify(webhookData),
      },
      include: { order: true },
    });
  }

  if (!payment) {
    throw new Error('Payment not found and cannot create');
  }

  // Update payment status
  const status = type === 'payment.succeeded' || type === 'payment.success' || type === 'SUCCESS' ? 'PAID' : 'FAILED';
  
  console.log('[Webhook] Updating payment status to:', status);

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status,
      externalRef: webhookData.externalRef || webhookData.paymentId || paymentId || `mock-${orderId}`,
      webhookData: JSON.stringify(webhookData),
    },
    include: { order: true },
  });

  // Update order status if payment successful
  if (status === 'PAID') {
    console.log('[Webhook] Updating order status to PAID for order:', orderId || payment.orderId);
    try {
      const orderService = require('./orderService');
      await orderService.updateOrderStatus(orderId || payment.orderId, 'PAID');
      console.log('[Webhook] Order status updated successfully');
    } catch (err) {
      console.error('[Webhook] Error updating order status:', err);
      throw err;
    }
  }

  return updatedPayment;
};

