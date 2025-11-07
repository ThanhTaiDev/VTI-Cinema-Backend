const prisma = require('../../prismaClient');
const crypto = require('crypto');
const { getGatewayByCode } = require('../../gateways/GatewayFactory');
const refundPaymentService = require('../payments/refund.service');

/**
 * Generate idempotency key
 */
function generateIdempotencyKey(ticketId, orderId, actorId) {
  const data = `${ticketId || orderId}:${actorId}:${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Refund a single ticket
 */
async function refundTicket({ ticketId, reason, idempotencyKey, actorId }) {
  if (!ticketId) {
    throw new Error('Ticket ID is required');
  }

  // Generate idempotency key if not provided
  const key = idempotencyKey || generateIdempotencyKey(ticketId, null, actorId);

  return await prisma.$transaction(async (tx) => {
    // Check idempotency
    const existingRefund = await tx.refund.findUnique({
      where: { idempotencyKey: key },
    });

    if (existingRefund) {
      // Already processed, return existing result
      const ticket = await tx.ticket.findUnique({
        where: { id: ticketId },
        include: { order: { include: { payments: true } } },
      });
      // Return early - don't process again
      return {
        ticket,
        refund: existingRefund,
        status: existingRefund.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        message: 'Refund already processed',
        skipPaymentRefund: true, // Flag to skip payment refund
      };
    }

    // Get ticket with order and payments
    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      include: {
        order: {
          include: {
            payments: true,
            tickets: true,
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

    if (!ticket) {
      throw new Error(`Ticket not found: ${ticketId}`);
    }

    if (ticket.status !== 'ISSUED') {
      throw new Error(`Only ISSUED tickets can be refunded. Current status: ${ticket.status}`);
    }

    // Find paid payment
    const paidPayment = ticket.order?.payments?.find(
      p => p.status === 'SUCCESS' || p.status === 'PAID'
    );

    if (!paidPayment) {
      throw new Error('No paid payment found for this ticket');
    }

    if (paidPayment.status === 'REFUNDED') {
      throw new Error('Payment already fully refunded');
    }

    // Calculate max refundable amount
    const existingRefunds = await tx.refund.findMany({
      where: {
        paymentId: paidPayment.id,
        status: 'SUCCESS',
      },
    });

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const maxRefundable = paidPayment.amount - totalRefunded;

    if (maxRefundable <= 0) {
      throw new Error('No refundable amount available');
    }

    const ticketPrice = ticket.price;
    const refundAmount = Math.min(ticketPrice, maxRefundable);

    // Check if this is the last ticket
    const remainingTickets = ticket.order.tickets.filter(t => t.status === 'ISSUED');
    const isLastTicket = remainingTickets.length === 1 && remainingTickets[0].id === ticket.id;

    // Create refund record
    const refund = await tx.refund.create({
      data: {
        paymentId: paidPayment.id,
        amount: refundAmount,
        reason: reason || `Refund ticket ${ticket.code}`,
        status: 'PENDING',
        idempotencyKey: key,
      },
    });

    // Update ticket status
    const updatedTicket = await tx.ticket.update({
      where: { id: ticketId },
      data: { status: 'REFUNDED' },
    });

    // Release seat
    await tx.seatStatus.create({
      data: {
        seatId: ticket.seatId,
        screeningId: ticket.screeningId,
        status: 'AVAILABLE',
      },
    });

    // Return info for payment refund processing outside transaction
    return {
      ticket: updatedTicket,
      refund,
      paymentId: paidPayment.id,
      orderId: ticket.orderId,
      isLastTicket,
      refundAmount,
      reason: reason || `Refund ticket ${ticket.code}`,
    };
  }, {
    timeout: 30000,
  });

  // Skip if already processed
  if (result.skipPaymentRefund) {
    return result;
  }

  // Process payment refund outside transaction
  try {
    let refundResult;
    try {
      if (result.isLastTicket) {
        refundResult = await refundPaymentService.refundFull(result.paymentId, result.reason);
      } else {
        refundResult = await refundPaymentService.refundPartial(result.paymentId, result.refundAmount, result.reason);
      }
    } catch (paymentError) {
      // Check if payment was already refunded (e.g., by another concurrent refund)
      const currentPayment = await prisma.payment.findUnique({
        where: { id: result.paymentId },
        include: { refunds: { where: { status: 'SUCCESS' } } },
      });

      if (currentPayment && (currentPayment.status === 'REFUNDED' || currentPayment.status === 'PARTIAL_REFUNDED')) {
        // Payment was already refunded, mark our refund as SUCCESS
        await prisma.refund.update({
          where: { id: result.refund.id },
          data: {
            status: 'SUCCESS',
          },
        });

        // Check if all tickets in the order are refunded
        const allTickets = await prisma.ticket.findMany({
          where: { orderId: result.orderId },
        });

        const allTicketsRefunded = allTickets.every(t => t.status === 'REFUNDED');

        // Update order status if payment fully refunded OR all tickets are refunded
        if (allTicketsRefunded || currentPayment.status === 'REFUNDED') {
          await prisma.order.update({
            where: { id: result.orderId },
            data: { status: 'REFUNDED' },
          });
        }

        return {
          ticket: await prisma.ticket.findUnique({ where: { id: ticketId } }),
          refund: await prisma.refund.findUnique({ where: { id: result.refund.id } }),
          status: 'SUCCESS',
        };
      }

      // If payment was not refunded, throw the error
      throw paymentError;
    }

    // Update refund status
    await prisma.refund.update({
      where: { id: result.refund.id },
      data: {
        status: refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        providerRefundId: refundResult.refund?.providerRefundId,
      },
    });

    // Check if all tickets in the order are refunded
    const allTickets = await prisma.ticket.findMany({
      where: { orderId: result.orderId },
    });

    const allTicketsRefunded = allTickets.every(t => t.status === 'REFUNDED');

    // Update order status if payment fully refunded OR all tickets are refunded
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: result.paymentId },
    });

    if (allTicketsRefunded || (updatedPayment && updatedPayment.status === 'REFUNDED')) {
      await prisma.order.update({
        where: { id: result.orderId },
        data: { status: 'REFUNDED' },
      });
    }

    // Get final ticket status to ensure accuracy
    const finalTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    const finalStatus = finalTicket && finalTicket.status === 'REFUNDED' ? 'SUCCESS' : (refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED');

    return {
      ticket: finalTicket,
      refund: await prisma.refund.findUnique({ where: { id: result.refund.id } }),
      status: finalStatus,
    };
  } catch (error) {
    // Check if ticket was actually refunded (might have been refunded by another process)
    const currentTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    
    if (currentTicket && currentTicket.status === 'REFUNDED') {
      // Ticket was refunded, check if all tickets in order are refunded
      const allTickets = await prisma.ticket.findMany({
        where: { orderId: result.orderId },
      });

      const allTicketsRefunded = allTickets.every(t => t.status === 'REFUNDED');

      // Update order status if all tickets are refunded
      if (allTicketsRefunded) {
        await prisma.order.update({
          where: { id: result.orderId },
          data: { status: 'REFUNDED' },
        });
      }

      // Ticket was refunded, don't rollback - return success
      // Also check and update order status if all tickets are refunded
      const allTicketsInOrder = await prisma.ticket.findMany({
        where: { orderId: result.orderId },
      });

      const allTicketsRefundedInOrder = allTicketsInOrder.every(t => t.status === 'REFUNDED');

      if (allTicketsRefundedInOrder) {
        await prisma.order.update({
          where: { id: result.orderId },
          data: { status: 'REFUNDED' },
        });
      }

      return {
        ticket: currentTicket,
        refund: await prisma.refund.findUnique({ where: { id: result.refund.id } }),
        status: 'SUCCESS',
      };
    }

    // Rollback ticket status only if it wasn't already refunded
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'ISSUED' },
    });

    // Update refund as failed
    await prisma.refund.update({
      where: { id: result.refund.id },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

/**
 * Refund entire order
 */
async function refundOrder({ orderId, reason, idempotencyKey, actorId }) {
  if (!orderId) {
    throw new Error('Order ID is required');
  }

  // Generate idempotency key if not provided
  const key = idempotencyKey || generateIdempotencyKey(null, orderId, actorId);

  const result = await prisma.$transaction(async (tx) => {
    // Check idempotency
    const existingRefund = await tx.refund.findFirst({
      where: {
        idempotencyKey: key,
        payment: {
          orderId: orderId,
        },
      },
    });

    if (existingRefund) {
      // Already processed
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { tickets: true, payments: true },
      });
      return {
        order,
        refund: existingRefund,
        status: existingRefund.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        message: 'Refund already processed',
        skipPaymentRefund: true, // Flag to skip payment refund
      };
    }

    // Get order with tickets and payments
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        tickets: true,
        payments: true,
        screening: {
          include: {
            movie: true,
            cinema: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Find paid payment
    const paidPayment = order.payments?.find(
      p => p.status === 'SUCCESS' || p.status === 'PAID'
    );

    if (!paidPayment) {
      throw new Error('No paid payment found for this order');
    }

    if (paidPayment.status === 'REFUNDED') {
      throw new Error('Payment already fully refunded');
    }

    // Get all ISSUED tickets
    const issuedTickets = order.tickets.filter(t => t.status === 'ISSUED');

    if (issuedTickets.length === 0) {
      throw new Error('No refundable tickets found in this order');
    }

    // Calculate total refundable amount
    const existingRefunds = await tx.refund.findMany({
      where: {
        paymentId: paidPayment.id,
        status: 'SUCCESS',
      },
    });

    const totalRefunded = existingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const maxRefundable = paidPayment.amount - totalRefunded;

    if (maxRefundable <= 0) {
      throw new Error('No refundable amount available');
    }

    const totalTicketPrice = issuedTickets.reduce((sum, t) => sum + t.price, 0);
    const refundAmount = Math.min(totalTicketPrice, maxRefundable);

    // Create refund record
    const refund = await tx.refund.create({
      data: {
        paymentId: paidPayment.id,
        amount: refundAmount,
        reason: reason || `Refund order ${orderId}`,
        status: 'PENDING',
        idempotencyKey: key,
      },
    });

    // Update all tickets to REFUNDED
    await tx.ticket.updateMany({
      where: {
        id: { in: issuedTickets.map(t => t.id) },
      },
      data: { status: 'REFUNDED' },
    });

    // Release all seats
    for (const ticket of issuedTickets) {
      await tx.seatStatus.create({
        data: {
          seatId: ticket.seatId,
          screeningId: ticket.screeningId,
          status: 'AVAILABLE',
        },
      });
    }

    // Return info for payment refund processing outside transaction
    return {
      order,
      refund,
      paymentId: paidPayment.id,
      orderId,
      refundAmount,
      issuedTicketIds: issuedTickets.map(t => t.id),
      reason: reason || `Refund order ${orderId}`,
    };
  }, {
    timeout: 30000,
  });

  // Skip if already processed
  if (result.skipPaymentRefund) {
    return result;
  }

  // Process payment refund outside transaction
  try {
    const refundResult = await refundPaymentService.refundFull(result.paymentId, result.reason);

    // Update refund status
    await prisma.refund.update({
      where: { id: result.refund.id },
      data: {
        status: refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
        providerRefundId: refundResult.refund?.providerRefundId,
      },
    });

    // Update order status
    const updatedPayment = await prisma.payment.findUnique({
      where: { id: result.paymentId },
    });

    if (updatedPayment && updatedPayment.status === 'REFUNDED') {
      await prisma.order.update({
        where: { id: result.orderId },
        data: { status: 'REFUNDED' },
      });
    }

    return {
      order: await prisma.order.findUnique({
        where: { id: result.orderId },
        include: { tickets: true },
      }),
      refund: await prisma.refund.findUnique({ where: { id: result.refund.id } }),
      status: refundResult.status === 'SUCCESS' ? 'SUCCESS' : 'FAILED',
    };
  } catch (error) {
    // Rollback tickets
    await prisma.ticket.updateMany({
      where: {
        id: { in: result.issuedTicketIds },
      },
      data: { status: 'ISSUED' },
    });

    // Update refund as failed
    await prisma.refund.update({
      where: { id: result.refund.id },
      data: { status: 'FAILED' },
    });

    throw error;
  }
}

/**
 * Get refund summary for an order
 */
async function getRefundSummary(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      tickets: true,
      payments: {
        include: {
          refunds: {
            where: { status: 'SUCCESS' },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error(`Order not found: ${orderId}`);
  }

  const paidPayment = order.payments?.find(
    p => p.status === 'SUCCESS' || p.status === 'PAID'
  );

  if (!paidPayment) {
    return {
      orderId,
      totalAmount: order.totalAmount,
      refundableAmount: 0,
      refundedAmount: 0,
      tickets: order.tickets.map(t => ({
        id: t.id,
        code: t.code,
        price: t.price,
        status: t.status,
        refundable: t.status === 'ISSUED' ? t.price : 0,
      })),
    };
  }

  const totalRefunded = paidPayment.refunds.reduce((sum, r) => sum + r.amount, 0);
  const refundableAmount = paidPayment.amount - totalRefunded;

  return {
    orderId,
    totalAmount: order.totalAmount,
    paymentAmount: paidPayment.amount,
    refundableAmount,
    refundedAmount: totalRefunded,
    paymentStatus: paidPayment.status,
    tickets: order.tickets.map(t => ({
      id: t.id,
      code: t.code,
      price: t.price,
      status: t.status,
      refundable: t.status === 'ISSUED' ? t.price : 0,
    })),
  };
}

module.exports = {
  refundTicket,
  refundOrder,
  getRefundSummary,
};

