const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedPaymentGateways() {
  console.log('Seeding payment gateways...');

  const gateways = [
    {
      code: 'mock',
      name: 'Mock Payment',
      enabled: true,
      locked: false,
      lockedReason: null,
      feeType: 'PERCENT',
      feePercent: 0,
      feeFixed: null,
      minFee: null,
      maxFee: null,
      vatOnFeePercent: 0,
      methodOverrides: null,
      rules: null,
      configJson: JSON.stringify({
        description: 'Mock payment gateway for development',
      }),
    },
    {
      code: 'momo',
      name: 'MoMo',
      enabled: true, // Enable for demo
      locked: false,
      lockedReason: null,
      feeType: 'PERCENT',
      feePercent: 0.011,
      feeFixed: null,
      minFee: null,
      maxFee: null,
      vatOnFeePercent: 0.1,
      methodOverrides: null,
      rules: null,
      configJson: JSON.stringify({
        description: 'MoMo payment gateway',
        partnerCode: process.env.MOMO_PARTNER_CODE || '',
        accessKey: process.env.MOMO_ACCESS_KEY || '',
      }),
    },
    {
      code: 'vnpay',
      name: 'VNPay',
      enabled: true, // Enable for demo
      locked: false,
      lockedReason: null,
      feeType: 'PERCENT',
      feePercent: 0.009,
      feeFixed: null,
      minFee: null,
      maxFee: null,
      vatOnFeePercent: 0.1,
      methodOverrides: null,
      rules: null,
      configJson: JSON.stringify({
        description: 'VNPay payment gateway',
        tmnCode: process.env.VNPAY_TMN_CODE || '',
      }),
    },
    {
      code: 'napasqr',
      name: 'NapasQR',
      enabled: true,
      locked: false,
      feeType: 'PERCENT',
      feePercent: 0.007,
      vatOnFeePercent: 0.1,
      configJson: JSON.stringify({ description: 'NapasQR payment gateway' }),
    },
    {
      code: 'payoo',
      name: 'Payoo',
      enabled: true,
      locked: false,
      feeType: 'PERCENT',
      feePercent: 0,
      vatOnFeePercent: 0,
      configJson: JSON.stringify({ description: 'Payoo payment gateway' }),
    },
    {
      code: 'shopeepay',
      name: 'ShopeePay',
      enabled: true,
      locked: false,
      feeType: 'PERCENT',
      feePercent: 0.012,
      vatOnFeePercent: 0.1,
      configJson: JSON.stringify({ description: 'ShopeePay payment gateway' }),
    },
    {
      code: 'smartpay',
      name: 'SmartPay',
      enabled: true,
      locked: false,
      feeType: 'PERCENT',
      feePercent: 0.0085,
      vatOnFeePercent: 0.1,
      configJson: JSON.stringify({ description: 'SmartPay payment gateway' }),
    },
    {
      code: 'zalopay',
      name: 'Zalo Pay',
      enabled: true,
      locked: false,
      feeType: 'PERCENT',
      feePercent: 0.1,
      vatOnFeePercent: 0,
      configJson: JSON.stringify({ description: 'Zalo Pay payment gateway' }),
    },
    {
      code: 'card',
      name: 'Credit Card',
      enabled: true,
      locked: false,
      feeType: 'PERCENT',
      feePercent: 0.015,
      vatOnFeePercent: 0.1,
      maxFee: 50000,
      configJson: JSON.stringify({ description: 'Credit Card payment gateway (DEMO ONLY)' }),
    },
    {
      code: 'paypal',
      name: 'PayPal',
      enabled: true,
      locked: false,
      feeType: 'PERCENT',
      feePercent: 0.0349, // PayPal standard fee: 3.49% + fixed fee
      feeFixed: 0, // In real PayPal, there's also a fixed fee per transaction
      minFee: null,
      maxFee: null,
      vatOnFeePercent: 0,
      methodOverrides: null,
      rules: null,
      configJson: JSON.stringify({ 
        description: 'PayPal payment gateway (DEMO ONLY - DO NOT USE IN PRODUCTION)',
        clientId: process.env.PAYPAL_CLIENT_ID || '',
        secretKey: process.env.PAYPAL_SECRET_KEY || '',
      }),
    },
  ];

  for (const gateway of gateways) {
    await prisma.paymentGateway.upsert({
      where: { code: gateway.code },
      update: gateway,
      create: gateway,
    });
    console.log(`✓ Seeded gateway: ${gateway.code}`);
  }

  console.log('Payment gateways seeded successfully!');
}

seedPaymentGateways()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

