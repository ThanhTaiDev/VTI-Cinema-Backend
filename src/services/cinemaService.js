const prisma = require('../prismaClient');

exports.getAll = async (params = {}) => {
  return await prisma.cinema.findMany({
    orderBy: { name: 'asc' },
  });
};

exports.getById = async (id) => {
  return await prisma.cinema.findUnique({
    where: { id },
  });
};

exports.create = async (data) => {
  const { name, region, address, latitude, longitude, logoUrl, phone } = data;
  
  if (!name || !region || !address) {
    throw new Error('Name, region, and address are required');
  }

  return await prisma.cinema.create({
    data: {
      name,
      region,
      address,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      logoUrl,
      phone,
    },
  });
};

exports.update = async (id, data) => {
  const { name, region, address, latitude, longitude, logoUrl, phone } = data;
  
  const updateData = {};
  if (name) updateData.name = name;
  if (region) updateData.region = region;
  if (address) updateData.address = address;
  if (latitude !== undefined) updateData.latitude = latitude ? parseFloat(latitude) : null;
  if (longitude !== undefined) updateData.longitude = longitude ? parseFloat(longitude) : null;
  if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
  if (phone !== undefined) updateData.phone = phone;

  return await prisma.cinema.update({
    where: { id },
    data: updateData,
  });
};

exports.delete = async (id) => {
  return await prisma.cinema.delete({
    where: { id },
  });
};

