const prisma = require('../../prismaClient');
const { selectGateway } = require('./routing.service');
const { computeFee } = require('../../utils/fee/computeFee');
const { maskObject } = require('../../utils/mask');
const { getGatewayByCode } = require('../../gateways/GatewayFactory');

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
/**
 * Get payment by ID (with masked sensitive data)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
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
  
  // Also fetch webhook events for this payment (DEMO ONLY)
  const webhookEvents = await prisma.webhookEvent.findMany({
    where: { paymentId: id },
    orderBy: { receivedAt: 'desc' },
    take: 10, // Last 10 events
  });
  
  if (payment) {
    payment.webhookEvents = webhookEvents;
  }

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

  // Mask sensitive data before returning
  if (payment.rawPayload) {
    try {
      const payload = JSON.parse(payment.rawPayload);
      payment.rawPayload = JSON.stringify(maskObject(payload));
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // Add vatSurcharge and amountCharged from metadata for easier access
  if (payment.metadata) {
    payment.vatSurcharge = payment.metadata.vatSurcharge || 0;
    payment.amountCharged = payment.metadata.amountCharged || payment.amount;
  } else {
    payment.vatSurcharge = 0;
    payment.amountCharged = payment.amount;
  }
  
  return payment;
}

/**
 * Initialize payment (create payment and get redirect URL)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 */
async function initPayment({ orderId, userId, method = null, gatewayCode = null }) {
  console.log('[Payment Service] initPayment called with:', {
    orderId,
    userId,
    method,
    gatewayCode,
  });
  
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
  let existingPayment = await prisma.payment.findFirst({
    where: {
      orderId: order.id,
      status: 'PENDING',
    },
    orderBy: { createdAt: 'desc' },
  });

  let payment;
  let gatewayRecord;
  let gatewayInstance;

  const normalizedMethod = method ? method.toLowerCase() : null;

  // Check if user wants to use a different gateway than existing payment
  if (existingPayment && gatewayCode && gatewayCode !== 'auto' && existingPayment.gateway !== gatewayCode.toLowerCase()) {
    console.log(`[Payment Init] User wants to change gateway from ${existingPayment.gateway} to ${gatewayCode.toLowerCase()}, creating new payment`);
    // Cancel existing payment and create a new one
    await prisma.payment.update({
      where: { id: existingPayment.id },
      data: { status: 'CANCELLED' },
    });
    existingPayment = null; // Clear to create new payment
  }

  if (existingPayment) {
    // Use existing payment
    console.log(`[Payment Init] Using existing payment with gateway: ${existingPayment.gateway}`);
    payment = existingPayment;
    
    // Get gateway record from database
    gatewayRecord = await prisma.paymentGateway.findFirst({
      where: { code: existingPayment.gateway },
    });
    gatewayInstance = getGatewayByCode(existingPayment.gateway) || getGatewayByCode('mock');
    
    if (!gatewayRecord) {
      gatewayRecord = await prisma.paymentGateway.findFirst({ where: { code: 'mock' } });
    }

    // Update method if changed
    if (normalizedMethod && existingPayment.method !== normalizedMethod) {
      payment = await prisma.payment.update({
        where: { id: existingPayment.id },
        data: { method: normalizedMethod },
      });
    }
  } else {
    // Select gateway - use provided gatewayCode or auto-select
    let selection;
    if (gatewayCode && gatewayCode !== 'auto') {
      // Use specified gateway
      const allGateways = await prisma.paymentGateway.findMany({
        orderBy: { code: 'asc' },
      });
      
      console.log(`[Payment Init] Looking for gateway: ${gatewayCode.toLowerCase()}`);
      console.log(`[Payment Init] Available gateways:`, allGateways.map(g => ({ code: g.code, enabled: g.enabled, locked: g.locked })));
      
      const specifiedGateway = allGateways.find(g => g.code === gatewayCode.toLowerCase());
      
      if (!specifiedGateway) {
        console.error(`[Payment Init] Gateway ${gatewayCode} not found in database. Available:`, allGateways.map(g => g.code));
        throw new Error(`Gateway ${gatewayCode} not found`);
      }
      
      console.log(`[Payment Init] Found gateway: ${specifiedGateway.code} (enabled: ${specifiedGateway.enabled}, locked: ${specifiedGateway.locked})`);
      
      // Check if gateway is enabled and not locked
      if (!specifiedGateway.enabled || specifiedGateway.locked) {
        console.warn(`[Payment Init] Gateway ${specifiedGateway.code} is ${specifiedGateway.locked ? 'locked' : 'disabled'}, but proceeding anyway in dev mode`);
        // In dev mode, allow disabled/locked gateways for testing
        if (process.env.NODE_ENV === 'production') {
          throw new Error(`Gateway ${specifiedGateway.name} is unavailable`);
        }
      }
      
      // Try to get gateway instance
      const gatewayInstance = getGatewayByCode(specifiedGateway.code);
      if (!gatewayInstance && process.env.NODE_ENV === 'production') {
        throw new Error(`Gateway instance for ${specifiedGateway.code} not found`);
      }
      
      // Use specified gateway (even if disabled in dev mode for testing)
      selection = {
        record: specifiedGateway,
        instance: gatewayInstance || getGatewayByCode('mock'), // Fallback to mock instance if not found
      };
      
      console.log(`[Payment Init] Using specified gateway: ${specifiedGateway.code} (enabled: ${specifiedGateway.enabled}, locked: ${specifiedGateway.locked})`);
    } else {
      // Auto-select gateway
      selection = await selectGateway({
        order,
        amount: order.totalAmount,
        user: { id: userId },
        method: normalizedMethod || undefined,
      });
    }

    gatewayRecord = selection.record;
    gatewayInstance = selection.instance;
    
    console.log(`[Payment Init] Selected gateway record: ${gatewayRecord.code}, instance: ${gatewayInstance ? gatewayInstance.constructor.name : 'null'}`);

    // Calculate fee using computeFee
    const feeResult = computeFee(gatewayRecord, order.totalAmount, normalizedMethod);

    // Set payment expiry (10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Create payment record
    // Store vatSurcharge and amountCharged in metadata for easy access
    payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        userId,
        gateway: gatewayRecord.code,
        method: normalizedMethod || 'qrcode',
        amount: order.totalAmount, // Order total (before fees)
        fee: feeResult.fee, // Total fee merchant pays (base + VAT)
        net: feeResult.net, // Net amount merchant receives
        netAmount: feeResult.net,
        currency: 'VND',
        status: 'PENDING',
        expiresAt,
        metadata: {
          vatSurcharge: feeResult.vatSurcharge || 0, // VAT customer pays (if vatOnFeePercent > 0)
          amountCharged: feeResult.amountCharged || order.totalAmount, // Total amount customer pays
          feeBase: feeResult.feeBase || 0, // Base fee merchant pays
        },
      },
    });
  }

  if (!gatewayInstance || !gatewayRecord) {
    throw new Error('Gateway unavailable');
  }

  // DEMO ONLY - Create payment via gateway (only if not already created)
  let gatewayResult;
  let paymentMetadata = {};
  
  if (!existingPayment || !payment.redirectUrl) {
    // Generate provider transaction ID
    const providerTxId = `${gatewayRecord.code.toUpperCase()}-${payment.id}-${Date.now()}`;
    
    // Handle different gateway types
    if (gatewayRecord.code === 'mock') {
      // MOCK: Auto-success
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'SUCCESS',
          providerTxId,
          providerOrderId: providerTxId,
          metadata: {
            autoSuccess: true,
            simulatedAt: new Date().toISOString(),
          },
        },
      });
      
      // Update order status immediately for MOCK
      console.log(`[Payment Init] Mock payment succeeded, updating order ${order.id} to PAID`);
      const orderService = require('../orderService');
      try {
        const result = await orderService.updateOrderStatus(order.id, 'PAID');
        console.log(`[Payment Init] Order ${order.id} updated to PAID successfully`);
        console.log(`[Payment Init] Updated order result:`, {
          orderId: result.id,
          orderStatus: result.status,
          ticketsCount: result.tickets?.length || 0,
          ticketsStatuses: result.tickets?.map(t => ({ id: t.id, status: t.status })) || [],
        });
      } catch (error) {
        console.error(`[Payment Init] ERROR updating order status:`, error);
        console.error(`[Payment Init] Error stack:`, error.stack);
        // Don't throw - payment is already SUCCESS, just log the error
        // Payment will still be SUCCESS, but order/tickets might not be updated
        // This is a critical error that should be investigated
      }
      
      gatewayResult = {
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/mock`,
        providerRef: providerTxId,
        qrCode: null,
      };
    } else if (gatewayRecord.code.toLowerCase() === 'card' || gatewayRecord.code.toLowerCase() === 'credit_card') {
      // Credit Card: Show card form
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTxId,
          providerOrderId: providerTxId,
          metadata: {
            providerTxId,
            requiresCardInput: true,
          },
          redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/card`,
        },
      });
      
      gatewayResult = {
        redirectUrl: payment.redirectUrl,
        providerRef: providerTxId,
        qrCode: null,
      };
    } else if (gatewayRecord.code.toLowerCase() === 'paypal') {
      // PayPal: Show PayPal login form (DEMO ONLY)
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTxId,
          providerOrderId: providerTxId,
          metadata: {
            providerTxId,
            requiresPayPalLogin: true,
          },
          redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/paypal`,
        },
      });
      
      gatewayResult = {
        redirectUrl: payment.redirectUrl,
        providerRef: providerTxId,
        qrCode: null,
      };
    } else if (['momo', 'vnpay', 'zalopay', 'napasqr', 'shopeepay'].includes(gatewayRecord.code.toLowerCase())) {
      // QR Gateways: Generate QR code data
      const qrData = {
        gateway: gatewayRecord.code,
        paymentId: payment.id,
        orderId: order.id,
        amount: order.totalAmount,
        providerTxId,
      };
      
      // Generate QR code URL (using a simple QR code generator service)
      const qrDataString = JSON.stringify(qrData);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataString)}`;
      
      paymentMetadata = {
        qrData: qrDataString,
        qrCodeUrl,
        providerTxId,
        webhookUrl: `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/payments/webhook/${gatewayRecord.code}`,
      };
      
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTxId,
          providerOrderId: providerTxId,
          metadata: paymentMetadata,
          redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/${gatewayRecord.code}`,
        },
      });
      
      gatewayResult = {
        redirectUrl: payment.redirectUrl,
        providerRef: providerTxId,
        qrCode: qrCodeUrl,
        qrData: qrDataString,
      };
    } else if (gatewayRecord.code.toLowerCase() === 'credit_card' || gatewayRecord.code.toLowerCase() === 'card') {
      // Credit Card: Show card form
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTxId,
          providerOrderId: providerTxId,
          metadata: {
            providerTxId,
            requiresCardInput: true,
          },
          redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/card`,
        },
      });
      
      gatewayResult = {
        redirectUrl: payment.redirectUrl,
        providerRef: providerTxId,
        qrCode: null,
      };
    } else {
      // Default: For other gateways, treat as QR gateway
      // All unknown gateways will be treated as QR gateways for demo purposes
      console.log(`[Payment Init] Treating gateway ${gatewayRecord.code} as QR gateway`);
      
      const qrData = {
        gateway: gatewayRecord.code,
        paymentId: payment.id,
        orderId: order.id,
        amount: order.totalAmount,
        providerTxId,
      };
      
      const qrDataString = JSON.stringify(qrData);
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrDataString)}`;
      
      paymentMetadata = {
        qrData: qrDataString,
        qrCodeUrl,
        providerTxId,
        webhookUrl: `${process.env.API_BASE_URL || 'http://localhost:4000'}/api/payments/webhook/${gatewayRecord.code}`,
      };
      
      payment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          providerTxId,
          providerOrderId: providerTxId,
          metadata: paymentMetadata,
          redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/${gatewayRecord.code}`,
        },
      });
      
      gatewayResult = {
        redirectUrl: payment.redirectUrl,
        providerRef: providerTxId,
        qrCode: qrCodeUrl,
        qrData: qrDataString,
      };
    }
  } else {
    // Use existing redirect URL
    gatewayResult = {
      redirectUrl: payment.redirectUrl || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/${payment.gateway}`,
      providerRef: payment.providerOrderId,
      qrCode: payment.metadata?.qrCodeUrl || null,
    };
  }
  
  // Ensure redirectUrl always exists
  if (!gatewayResult.redirectUrl) {
    gatewayResult.redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${payment.id}/gateway/${gatewayRecord.code}`;
    console.warn('[Payment Init] redirectUrl was missing, generated fallback:', gatewayResult.redirectUrl);
  }

  // Get vatSurcharge and amountCharged from metadata
  const vatSurcharge = payment.metadata?.vatSurcharge || 0;
  const amountCharged = payment.metadata?.amountCharged || payment.amount;

  const result = {
    payment: {
      id: payment.id,
      status: payment.status,
      amount: payment.amount, // Order total
      amountCharged, // Total amount customer pays (orderTotal + vatSurcharge)
      fee: payment.fee, // Total fee merchant pays
      vatSurcharge, // VAT customer pays (if vatOnFeePercent > 0)
      net: payment.net, // Net amount merchant receives
      gateway: payment.gateway,
      method: payment.method,
      providerTxId: payment.providerTxId,
      expiresAt: payment.expiresAt,
    },
    redirectUrl: gatewayResult.redirectUrl,
    qrCode: gatewayResult.qrCode,
    qrData: gatewayResult.qrData,
    providerRef: gatewayResult.providerRef,
  };
  
  // Log for debugging
  console.log('[Payment Init] Returning result:', {
    paymentId: result.payment.id,
    redirectUrl: result.redirectUrl,
    gateway: result.payment.gateway,
    status: result.payment.status,
    gatewayRecordCode: gatewayRecord.code,
  });
  
  // Final validation - ensure redirectUrl is correct format
  if (result.redirectUrl && !result.redirectUrl.includes('/gateway/')) {
    console.error('[Payment Init] ERROR: redirectUrl missing /gateway/ path:', result.redirectUrl);
    result.redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${result.payment.id}/gateway/${result.payment.gateway}`;
    console.log('[Payment Init] Fixed redirectUrl:', result.redirectUrl);
  }
  
  return result;
}

module.exports = {
  listPayments,
  getPaymentById,
  initPayment,
};

