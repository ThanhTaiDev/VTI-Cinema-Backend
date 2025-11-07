const prisma = require('../../prismaClient');
const { selectGateway } = require('./routing.service');
const { maskObject } = require('../../utils/mask');

/**
 * List payments with filters
 */
async function listPayments(params = {}) {
  const {
    from,
    to,
    status,
    gateway,
    orderId,
    providerTxId,
    page = 1,
    pageSize = 20,
  } = params;

  const where = {};

  // Date filter
  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Gateway filter
  if (gateway) {
    where.gateway = gateway;
  }

  // Order ID filter
  if (orderId) {
    where.orderId = orderId;
  }

  // Provider transaction ID filter
  if (providerTxId) {
    where.providerTxId = { contains: providerTxId };
  }

  // Count total
  const total = await prisma.payment.count({ where });

  // Get payments
  const payments = await prisma.payment.findMany({
    where,
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
      refunds: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  // Mask sensitive data in rawPayload
  const maskedPayments = payments.map(payment => {
    if (payment.rawPayload) {
      try {
        const payload = JSON.parse(payment.rawPayload);
        payment.rawPayload = JSON.stringify(maskObject(payload));
      } catch (e) {
        // Invalid JSON, keep as is
      }
    }
    return payment;
  });

  return {
    payments: maskedPayments,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get payment by ID
 */
async function getPaymentById(id) {
  const payment = await prisma.payment.findUnique({
    where: { id },
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
      refunds: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!payment) {
    return null;
  }

  // Mask sensitive data
  if (payment.rawPayload) {
    try {
      const payload = JSON.parse(payment.rawPayload);
      payment.rawPayload = JSON.stringify(maskObject(payload));
    } catch (e) {
      // Invalid JSON, keep as is
    }
  }

  return payment;
}

/**
 * Initialize payment (create payment and get redirect URL)
 */
async function initPayment({ orderId, userId, method = null }) {
  // Get order
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

  // Verify order belongs to user
  if (order.userId !== userId) {
    throw new Error('Order does not belong to user');
  }

  // Check if order is still valid
  if (order.status !== 'PENDING') {
    throw new Error('Order is not pending');
  }

  if (new Date(order.expiresAt) < new Date()) {
    throw new Error('Order has expired');
  }

  // Check if payment already exists for this order
  const existingPayment = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });

  let payment;
  if (existingPayment) {
    // Use existing payment
    payment = existingPayment;
  } else {
    // Select gateway
    const gateway = await selectGateway({
      order,
      amount: order.totalAmount,
      user: { id: userId },
    });

    // Calculate fee based on gateway
    const feeRates = {
      mock: 0,
      momo: 0.015,
      vnpay: 0.015,
    };
    const feeRate = feeRates[gateway.code] || 0;
    const fee = Math.round(order.totalAmount * feeRate);
    const net = order.totalAmount - fee;

    // Create payment record
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        gateway: gateway.code,
        method: method || 'qrcode',
        amount: order.totalAmount,
        fee,
        net,
        currency: 'VND',
        status: 'PENDING',
      },
    });
  }

  // Get gateway for this payment
  const gateway = await selectGateway({
    order,
    amount: order.totalAmount,
    user: { id: userId },
  });

  // Create payment via gateway (only if not already created)
  let gatewayResult;
  if (!existingPayment || !payment.redirectUrl) {
    gatewayResult = await gateway.createPayment({
      order,
      amount: order.totalAmount,
      meta: {
        paymentId: payment.id,
        userId,
      },
    });

    // Update payment with gateway info
    payment = await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: gatewayResult.providerRef,
        redirectUrl: gatewayResult.redirectUrl,
        rawPayload: JSON.stringify(maskObject(gatewayResult)),
      },
    });
  } else {
    // Use existing redirect URL
    gatewayResult = {
      redirectUrl: payment.redirectUrl,
      providerRef: payment.providerOrderId,
    };
  }

  return {
    payment,
    redirectUrl: gatewayResult.redirectUrl,
    qrCode: gatewayResult.qrCode,
    providerRef: gatewayResult.providerRef,
  };
}

module.exports = {
  listPayments,
  getPaymentById,
  initPayment,
};

