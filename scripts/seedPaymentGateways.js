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
      configJson: JSON.stringify({
        description: 'Mock payment gateway for development',
      }),
    },
    {
      code: 'momo',
      name: 'MoMo',
      enabled: false,
      locked: false,
      configJson: JSON.stringify({
        description: 'MoMo payment gateway',
        partnerCode: process.env.MOMO_PARTNER_CODE || '',
        accessKey: process.env.MOMO_ACCESS_KEY || '',
      }),
    },
    {
      code: 'vnpay',
      name: 'VNPay',
      enabled: false,
      locked: false,
      configJson: JSON.stringify({
        description: 'VNPay payment gateway',
        tmnCode: process.env.VNPAY_TMN_CODE || '',
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

