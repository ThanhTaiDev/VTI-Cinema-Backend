const prisma = require('../src/prismaClient');

(async function(){
  try{
    const users = await prisma.user.findMany();
    console.log(JSON.stringify(users, null, 2));
  }catch(e){
    console.error('ERROR', e);
  } finally{
    await prisma.$disconnect();
  }
})();
