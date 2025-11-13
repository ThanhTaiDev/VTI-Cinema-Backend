const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding seat types...')

  const seatTypes = [
    {
      code: 'STANDARD',
      name: 'Ghế thường',
      priceFactor: 1.0,
      color: '#C4B5FD', // Purple-300 (lighter)
    },
    {
      code: 'VIP',
      name: 'Ghế VIP',
      priceFactor: 1.5,
      color: '#FCA5A5', // Red-300 (lighter)
    },
    {
      code: 'COUPLE',
      name: 'Ghế COUPLE',
      priceFactor: 2.0,
      color: '#F9A8D4', // Pink-300 (lighter)
    },
    {
      code: 'UNAVAILABLE',
      name: 'Không khả dụng',
      priceFactor: 0,
      color: '#9CA3AF', // Gray-400 (lighter)
    },
  ]

  for (const seatType of seatTypes) {
    await prisma.seatType.upsert({
      where: { code: seatType.code },
      update: seatType,
      create: seatType,
    })
    console.log(`✅ Created/Updated seat type: ${seatType.code}`)
  }

  console.log('✅ Seeding seat types completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

