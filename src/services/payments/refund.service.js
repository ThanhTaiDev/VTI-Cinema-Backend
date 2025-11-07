const prisma = require('../../prismaClient');
const { getGatewayByCode } = require('../../gateways/GatewayFactory');

/**
 * Full refund
 */
async function refundFull(paymentId, reason) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      refunds: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'SUCCESS') {
    throw new Error('Payment must be SUCCESS to refund');
  }

  if (payment.status === 'REFUNDED') {
    throw new Error('Payment already refunded');
  }

  // Check if already has refunds
  const existingRefunds = payment.refunds.filter(r => r.status === 'SUCCESS');
  if (existingRefunds.length > 0) {
    throw new Error('Payment already has refunds');
  }

  // Get gateway
  const gateway = getGatewayByCode(payment.gateway);
  if (!gateway) {
    throw new Error(`Unknown gateway: ${payment.gateway}`);
  }

  // Create refund record
  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount: payment.amount,
      reason: reason || 'Full refund',
      status: 'PENDING',
    },
  });

  try {
    // Process refund via gateway
    const refundResult = await gateway.refund({
      payment,
      amount: payment.amount,
      reason: reason || 'Full refund',
    });

    // Update refund record
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        providerRefundId: refundResult.providerRefundId,
      },
    });

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: refundResult.status === 'SUCCESS' ? 'REFUNDED' : payment.status,
      },
    });

    return {
      refund,
      status: refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
    };
  } catch (error) {
    // Update refund as failed
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: 'FAILED',
      },
    });

    throw error;
  }
}

/**
 * Partial refund
 */
async function refundPartial(paymentId, amount, reason) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      refunds: true,
    },
  });

  if (!payment) {
    throw new Error('Payment not found');
  }

  if (payment.status !== 'SUCCESS' && payment.status !== 'PARTIAL_REFUNDED') {
    throw new Error('Payment must be SUCCESS or PARTIAL_REFUNDED to refund');
  }

  if (payment.status === 'REFUNDED') {
    throw new Error('Payment already fully refunded');
  }

  // Get gateway
  const gateway = getGatewayByCode(payment.gateway);
  if (!gateway) {
    throw new Error(`Unknown gateway: ${payment.gateway}`);
  }

  // Check if gateway supports partial refund
  if (!gateway.supportsPartialRefund) {
    throw new Error(`Gateway ${payment.gateway} does not support partial refund`);
  }

  // Calculate total refunded amount
  const totalRefunded = payment.refunds
    .filter(r => r.status === 'SUCCESS')
    .reduce((sum, r) => sum + r.amount, 0);

  // Validate amount
  if (amount <= 0) {
    throw new Error('Refund amount must be greater than 0');
  }

  if (totalRefunded + amount > payment.amount) {
    throw new Error(`Refund amount exceeds payment amount. Max refund: ${payment.amount - totalRefunded}`);
  }

  // Create refund record
  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      amount,
      reason: reason || 'Partial refund',
      status: 'PENDING',
    },
  });

  try {
    // Process refund via gateway
    const refundResult = await gateway.refund({
      payment,
      amount,
      reason: reason || 'Partial refund',
    });

    // Update refund record
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        providerRefundId: refundResult.providerRefundId,
      },
    });

    // Update payment status
    const newTotalRefunded = totalRefunded + amount;
    const newStatus = newTotalRefunded >= payment.amount ? 'REFUNDED' : 'PARTIAL_REFUNDED';

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: refundResult.status === 'SUCCESS' ? newStatus : payment.status,
      },
    });

    return {
      refund,
      status: refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
    };
  } catch (error) {
    // Update refund as failed
    await prisma.refund.update({
      where: { id: refund.id },
      data: {
        status: 'FAILED',
      },
    });

    throw error;
  }
}

module.exports = {
  refundFull,
  refundPartial,
};

