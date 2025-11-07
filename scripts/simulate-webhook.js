// DEMO ONLY - DO NOT USE IN PRODUCTION
// Script to simulate webhook for local development testing

const axios = require('axios');
const crypto = require('crypto');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:4000/api';
const GATEWAY = process.argv[2] || 'mock';
const PAYMENT_ID = process.argv[3];
const STATUS = process.argv[4] || 'SUCCESS'; // SUCCESS or FAILED

if (!PAYMENT_ID) {
  console.error('Usage: node scripts/simulate-webhook.js <gateway> <paymentId> [status]');
  console.error('Example: node scripts/simulate-webhook.js mock payment123 SUCCESS');
  process.exit(1);
}

async function simulateWebhook() {
  try {
    // Generate a mock signature (for demo purposes)
    const secretKey = process.env.MOCK_SECRET_KEY || 'demo-secret-key';
    const payload = {
      type: 'payment.succeeded',
      paymentId: PAYMENT_ID,
      providerTxId: `${GATEWAY.toUpperCase()}-${PAYMENT_ID}-${Date.now()}`,
      status: STATUS,
      amount: 100000, // Default amount, should be fetched from payment
      timestamp: new Date().toISOString(),
    };

    const payloadString = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(payloadString)
      .digest('hex');

    console.log(`[Simulate Webhook] Sending webhook to ${GATEWAY} gateway...`);
    console.log(`[Simulate Webhook] Payment ID: ${PAYMENT_ID}`);
    console.log(`[Simulate Webhook] Status: ${STATUS}`);
    console.log(`[Simulate Webhook] Payload:`, payload);

    const response = await axios.post(
      `${API_BASE_URL}/payments/webhook/${GATEWAY}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Signature': signature,
          'X-Request-Id': `sim-${Date.now()}`,
        },
      }
    );

    console.log('\n[Simulate Webhook] Response:', response.status, response.statusText);
    console.log('[Simulate Webhook] Result:', JSON.stringify(response.data, null, 2));

    if (response.data.success) {
      console.log('\n✅ Webhook processed successfully!');
      if (response.data.payment) {
        console.log(`   Payment Status: ${response.data.payment.status}`);
        console.log(`   Payment ID: ${response.data.payment.id}`);
      }
    } else {
      console.log('\n❌ Webhook processing failed:', response.data.message);
    }
  } catch (error) {
    console.error('\n[Simulate Webhook] Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.status, error.response.data);
    }
    process.exit(1);
  }
}

simulateWebhook();

