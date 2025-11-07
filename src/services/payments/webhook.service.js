const prisma = require('../../prismaClient');
const crypto = require('crypto');
const { getGatewayByCode } = require('../../gateways/GatewayFactory');
const { maskObject } = require('../../utils/mask');

/**
 * Generate idempotency key from gateway and provider transaction ID
 */
function generateIdempotencyKey(gateway, providerTxId, requestId) {
  const data = `${gateway}:${providerTxId || requestId || Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Receive and process webhook
 */
async function receiveWebhook({ gateway, headers, body }) {
  // Generate idempotency key
  const requestId = headers['x-request-id'] || headers['request-id'] || Date.now().toString();
  const idempotencyKey = generateIdempotencyKey(gateway, null, requestId);

  // Check if webhook already processed
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey },
  });

  if (existingEvent && existingEvent.handled) {
    // Already processed, return success
    return { success: true, message: 'Webhook already processed' };
  }

  // Get gateway instance
  const gatewayInstance = getGatewayByCode(gateway);
  if (!gatewayInstance) {
    throw new Error(`Unknown gateway: ${gateway}`);
  }

  // Create webhook event record
  const webhookEvent = await prisma.webhookEvent.create({
    data: {
      gateway,
      eventType: headers['x-event-type'] || headers['event-type'] || 'payment',
      rawPayload: JSON.stringify(body),
      signature: headers['x-signature'] || headers['signature'] || null,
      idempotencyKey,
      verified: false,
      handled: false,
    },
  });

  // Verify webhook signature
  const verifyResult = await gatewayInstance.verifyWebhook({ headers, body });

  if (!verifyResult.ok) {
    // Verification failed, but still save event
    await prisma.webhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        verified: false,
        handled: true, // Mark as handled to prevent retry
      },
    });

    return {
      success: false,
      message: `Webhook verification failed: ${verifyResult.reason}`,
    };
  }

  // Parse webhook payload
  const parsed = await gatewayInstance.parseWebhook({ headers, body });

  // Find payment by provider transaction ID, provider order ID, or order ID
  let payment = null;
  
  // First try to find by providerTxId
  if (parsed.providerTxId) {
    payment = await prisma.payment.findFirst({
      where: {
        OR: [
          { providerTxId: parsed.providerTxId },
          { providerOrderId: parsed.providerTxId },
        ],
        gateway,
      },
    });
  }

  // If not found, try to find by providerOrderId from body
  if (!payment && body.providerRef) {
    payment = await prisma.payment.findFirst({
      where: {
        providerOrderId: body.providerRef,
        gateway,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // If still not found, try to find by orderId from payload
  if (!payment && body.orderId) {
    payment = await prisma.payment.findFirst({
      where: {
        orderId: body.orderId,
        gateway,
        status: 'PENDING',
      },
      orderBy: { createdAt: 'desc' },
    });
  }
  
  // If still not found, try to find by paymentId from meta
  if (!payment && body.paymentId) {
    payment = await prisma.payment.findUnique({
      where: {
        id: body.paymentId,
        gateway,
      },
    });
  }

  // Update payment if found
  if (payment) {
    const maskedPayload = maskObject(body);
    
    // Calculate fee and net - use payment.amount if parsed.amount is 0 or invalid
    const finalAmount = parsed.amount > 0 ? parsed.amount : payment.amount;
    const finalFee = parsed.fee !== undefined ? parsed.fee : payment.fee;
    const finalNet = finalAmount - finalFee;
    
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: parsed.status === 'SUCCESS' ? 'SUCCESS' : parsed.status === 'FAILED' ? 'FAILED' : payment.status,
        providerTxId: parsed.providerTxId || payment.providerTxId,
        fee: finalFee,
        net: finalNet,
        rawPayload: JSON.stringify(maskedPayload),
        errorCode: parsed.status === 'FAILED' ? 'WEBHOOK_FAILED' : null,
        errorMessage: parsed.status === 'FAILED' ? 'Payment failed via webhook' : null,
      },
    });

    // Update order status if payment succeeded
    if (parsed.status === 'SUCCESS' || parsed.status === 'PAID') {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });
    }
  }

  // Update webhook event
  await prisma.webhookEvent.update({
    where: { id: webhookEvent.id },
    data: {
      paymentId: payment?.id || null,
      verified: true,
      handled: true,
    },
  });

  return {
    success: true,
    message: 'Webhook processed successfully',
    paymentId: payment?.id || null,
  };
}

module.exports = {
  receiveWebhook,
  generateIdempotencyKey,
};

