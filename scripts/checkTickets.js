const prisma = require('../src/prismaClient');

async function checkTickets() {
  try {
    const count = await prisma.ticket.count();
    console.log('Total tickets in DB:', count);
    
    if (count > 0) {
      const sample = await prisma.ticket.findFirst({
        include: {
          order: true,
          user: true,
          screening: {
            include: {
              movie: true,
              cinema: true,
            },
          },
        },
      });
      
      console.log('\nSample ticket:');
      console.log('- ID:', sample.id);
      console.log('- Code:', sample.code);
      console.log('- Status:', sample.status);
      console.log('- Order ID:', sample.orderId);
      console.log('- User:', sample.user?.email);
      console.log('- Movie:', sample.screening?.movie?.title);
      console.log('- Cinema:', sample.screening?.cinema?.name);
      console.log('- Created:', sample.createdAt);
    } else {
      console.log('\nNo tickets found in database.');
      console.log('Checking orders...');
      const orderCount = await prisma.order.count();
      console.log('Total orders:', orderCount);
      
      if (orderCount > 0) {
        const sampleOrder = await prisma.order.findFirst({
          include: {
            tickets: true,
            payments: true,
          },
        });
        console.log('\nSample order:');
        console.log('- ID:', sampleOrder.id);
        console.log('- Status:', sampleOrder.status);
        console.log('- Tickets count:', sampleOrder.tickets?.length || 0);
        console.log('- Payments count:', sampleOrder.payments?.length || 0);
        if (sampleOrder.payments?.length > 0) {
          console.log('- Latest payment status:', sampleOrder.payments[0].status);
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTickets();

