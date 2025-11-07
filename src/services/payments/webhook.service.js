const prisma = require('../../prismaClient');
const crypto = require('crypto');
const { getGatewayByCode } = require('../../gateways/GatewayFactory');
const { maskObject } = require('../../utils/mask');

/**
 * Generate idempotency key from gateway, provider transaction ID, and event type
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 */
function generateIdempotencyKey(gateway, providerTxId, eventType, requestId) {
  // Use providerTxId + eventType for better idempotency
  const data = `${gateway}:${providerTxId || 'unknown'}:${eventType || 'payment'}:${requestId || Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Receive and process webhook
 * DEMO ONLY - DO NOT USE IN PRODUCTION
 */
async function receiveWebhook({ gateway, headers, body }) {
  // Extract event type and provider transaction ID from body
  const eventType = body.type || body.eventType || headers['x-event-type'] || headers['event-type'] || 'payment';
  const providerTxId = body.providerTxId || body.transactionId || body.txId || body.id;
  const requestId = headers['x-request-id'] || headers['request-id'] || Date.now().toString();
  
  // Generate idempotency key using providerTxId + eventType
  const idempotencyKey = generateIdempotencyKey(gateway, providerTxId, eventType, requestId);

  // Check if webhook already processed (idempotency check)
  const existingEvent = await prisma.webhookEvent.findUnique({
    where: { idempotencyKey },
  });

  if (existingEvent && existingEvent.handled) {
    // Already processed, return success with existing payment ID
    let existingPayment = null;
    if (existingEvent.paymentId) {
      existingPayment = await prisma.payment.findUnique({
        where: { id: existingEvent.paymentId },
      });
    }
    return { 
      success: true, 
      message: 'Webhook already processed (idempotent)',
      paymentId: existingPayment?.id || null,
    };
  }

  // Get gateway instance
  const gatewayInstance = getGatewayByCode(gateway);
  if (!gatewayInstance) {
    throw new Error(`Unknown gateway: ${gateway}`);
  }

  // Create webhook event record (or update if exists but not handled)
  let webhookEvent = existingEvent;
  if (!webhookEvent) {
    webhookEvent = await prisma.webhookEvent.create({
      data: {
        gateway,
        eventType,
        rawPayload: JSON.stringify(body),
        signature: headers['x-signature'] || headers['signature'] || null,
        idempotencyKey,
        verified: false,
        handled: false,
      },
    });
  }

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

  // Parse webhook payload (DEMO ONLY - simplified parsing)
  let parsed;
  
  // For simulated webhooks (from frontend), parse directly from body
  // For real webhooks, use gateway's parseWebhook method
  const isSimulated = headers['x-simulated-webhook'] || body.type === 'payment.succeeded' || body.status === 'SUCCESS';
  
  if (isSimulated) {
    // Direct parsing for simulated webhooks
    console.log('[Webhook] Detected simulated webhook, parsing directly from body');
    parsed = {
      status: body.status || (body.type?.includes('succeeded') ? 'SUCCESS' : 'PENDING'),
      providerTxId: body.providerTxId || body.transactionId || body.txId || body.id,
      amount: body.amount || 0,
      fee: body.fee,
    };
  } else {
    // Use gateway's parseWebhook for real webhooks
    try {
      parsed = await gatewayInstance.parseWebhook({ headers, body });
    } catch (err) {
      console.error('[Webhook] Error parsing webhook via gateway, using fallback:', err);
      // Fallback: parse from body directly
      parsed = {
        status: body.status || body.paymentStatus || (body.type?.includes('succeeded') ? 'SUCCESS' : 'PENDING'),
        providerTxId: body.providerTxId || body.transactionId || body.txId || body.id,
        amount: body.amount || 0,
        fee: body.fee,
      };
    }
  }
  
  // Normalize status: 'SUCCESS' or 'PAID' both mean success
  if (parsed.status === 'PAID' || parsed.status === 'SUCCEEDED' || parsed.status === 'payment.succeeded') {
    parsed.status = 'SUCCESS';
  }
  
  // Ensure status is valid
  if (!parsed.status || parsed.status === 'PENDING') {
    // If body explicitly says SUCCESS, use it
    if (body.status === 'SUCCESS' || body.type === 'payment.succeeded') {
      parsed.status = 'SUCCESS';
    }
  }
  
  console.log(`[Webhook] Parsed status: ${parsed.status}, providerTxId: ${parsed.providerTxId}, body.status: ${body.status}, body.type: ${body.type}`);

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
    
    const newStatus = parsed.status === 'SUCCESS' || parsed.status === 'PAID' ? 'SUCCESS' : 
                      parsed.status === 'FAILED' ? 'FAILED' : payment.status;
    
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        providerTxId: parsed.providerTxId || payment.providerTxId,
        fee: finalFee,
        net: finalNet,
        rawPayload: JSON.stringify(maskedPayload),
        errorCode: parsed.status === 'FAILED' ? 'WEBHOOK_FAILED' : null,
        errorMessage: parsed.status === 'FAILED' ? 'Payment failed via webhook' : null,
      },
    });

    console.log(`[Webhook] Updated payment ${payment.id} status to: ${newStatus}`);

    // Update order status if payment succeeded
    if (parsed.status === 'SUCCESS' || parsed.status === 'PAID') {
      // Use orderService to update order status and create SOLD seat statuses
      const orderService = require('../orderService');
      await orderService.updateOrderStatus(payment.orderId, 'PAID');
      console.log(`[Webhook] Updated order ${payment.orderId} status to PAID`);
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

