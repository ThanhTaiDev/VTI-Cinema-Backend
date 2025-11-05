const prisma = require('../prismaClient');

exports.getAll = async (params = {}) => {
  const where = {};
  
  if (params.role) {
    where.role = params.role;
  }
  if (params.status) {
    where.status = params.status;
  }

  let users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      uid: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Filter by search term in memory for SQLite
  if (params.search) {
    const searchTerm = params.search.toLowerCase();
    users = users.filter(user => 
      user.name?.toLowerCase().includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchTerm) ||
      user.uid?.toLowerCase().includes(searchTerm)
    );
  }

  return users;
};

exports.getById = async (id) => {
  return await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      uid: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });
};

exports.update = async (id, data) => {
  const { name, email, phone, role, status } = data;
  
  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (role) updateData.role = role;
  if (status) updateData.status = status;

  return await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      uid: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      status: true,
    },
  });
};

exports.delete = async (id) => {
  return await prisma.user.delete({
    where: { id },
  });
};

