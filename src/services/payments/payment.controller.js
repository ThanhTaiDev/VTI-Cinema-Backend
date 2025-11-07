const paymentService = require('./payment.service');
const exportService = require('./export.service');
const prisma = require('../../prismaClient');
const { validateListPayments } = require('../../middlewares/validate');

/**
 * List payments
 */
async function listPayments(req, res, next) {
  try {
    const params = {
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      gateway: req.query.gateway,
      orderId: req.query.orderId,
      providerTxId: req.query.providerTxId,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    };

    const result = await paymentService.listPayments(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment detail
 */
async function getPaymentDetail(req, res, next) {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
}

/**
 * Initialize payment
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 */
async function initPayment(req, res, next) {
  try {
    const { orderId, method, gatewayCode } = req.body;
    const userId = req.user.id;

    console.log('[Payment Controller] Received request:', {
      orderId,
      method,
      gatewayCode,
      body: req.body,
    });

    const result = await paymentService.initPayment({
      orderId,
      userId,
      method,
      gatewayCode: gatewayCode || 'auto', // 'auto' means use routing logic
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Export payments to CSV
 */
async function exportCSV(req, res, next) {
  try {
    const params = {
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      gateway: req.query.gateway,
      orderId: req.query.orderId,
      providerTxId: req.query.providerTxId,
    };

    const result = await exportService.exportPayments(params);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment by ID (user-facing, with masked data)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 */
async function getPaymentById(req, res, next) {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    // Verify payment belongs to user (unless admin)
    if (req.user.role !== 'ADMIN' && payment.userId !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
}

/**
 * Charge credit card (DEMO ONLY)
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 */
async function chargeCard(req, res, next) {
  try {
    const { cardNumber, expMonth, expYear, cvc, simulate3DS } = req.body;
    const paymentId = req.params.id;
    const userId = req.user.id;

    // Validate card input
    if (!cardNumber || !expMonth || !expYear || !cvc) {
      return res.status(400).json({ error: 'All card fields are required' });
    }

    // Get payment
    const payment = await paymentService.getPaymentById(paymentId);
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    if (payment.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (payment.status !== 'PENDING') {
      return res.status(400).json({ error: 'Payment is not pending' });
    }

    // DEMO ONLY - Simple Luhn check
    // In dev mode, allow any card number that passes basic validation (length check)
    // In production, enforce Luhn check
    const luhnCheck = (cardNum) => {
      const num = cardNum.replace(/\D/g, '');
      let sum = 0;
      let isEven = false;
      for (let i = num.length - 1; i >= 0; i--) {
        let digit = parseInt(num[i]);
        if (isEven) {
          digit *= 2;
          if (digit > 9) digit -= 9;
        }
        sum += digit;
        isEven = !isEven;
      }
      return sum % 10 === 0;
    };

    // Basic validation: card number must be 13-19 digits
    const cardNumberClean = cardNumber.replace(/\D/g, '');
    if (cardNumberClean.length < 13 || cardNumberClean.length > 19) {
      return res.status(400).json({ error: 'Card number must be 13-19 digits' });
    }

    // In dev mode, skip Luhn check for easier testing
    // In production, enforce Luhn check
    if (process.env.NODE_ENV === 'production') {
      if (!luhnCheck(cardNumber)) {
        return res.status(400).json({ error: 'Invalid card number (Luhn check failed)' });
      }
    } else {
      // Dev mode: Log warning but allow any card number
      if (!luhnCheck(cardNumber)) {
        console.warn(`[DEV MODE] Card number ${cardNumberClean.slice(0, 4)}...${cardNumberClean.slice(-4)} failed Luhn check, but allowing in dev mode`);
      }
    }

    // Simulate 3DS if requested
    if (simulate3DS) {
      return res.json({
        requires3DS: true,
        redirectUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/${paymentId}/3ds`,
      });
    }

    // Mask card number (only store last 4 digits)
    const maskedCard = `**** **** **** ${cardNumber.slice(-4)}`;
    const cardToken = `TOKEN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Update payment with card info and mark as SUCCESS
    const updatedPayment = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'SUCCESS',
        metadata: {
          cardToken,
          maskedCard,
          cardLast4: cardNumber.slice(-4),
          expMonth,
          expYear,
          chargedAt: new Date().toISOString(),
        },
      },
    });

    // Update order status
    const orderService = require('../orderService');
    await orderService.updateOrderStatus(payment.orderId, 'PAID');

    res.json({
      success: true,
      payment: {
        id: updatedPayment.id,
        status: updatedPayment.status,
        providerTxId: updatedPayment.providerTxId,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPayments,
  getPaymentDetail,
  getPaymentById,
  initPayment,
  chargeCard,
  exportCSV,
};

