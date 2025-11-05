const prisma = require('../src/prismaClient');

const email = process.argv[2] || 'test.user+vm1@example.com';

(async function(){
  try{
    const user = await prisma.user.findUnique({ where: { email } });
    if(!user){
      console.log('No user found for', email);
      return;
    }
    const deleted = await prisma.user.delete({ where: { email } });
    console.log('Deleted user:', { id: deleted.id, email: deleted.email, name: deleted.name });
  }catch(e){
    console.error('ERROR', e);
    process.exit(1);
  } finally{
    await prisma.$disconnect();
  }
})();
