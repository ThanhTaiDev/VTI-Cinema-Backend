const prisma = require('../prismaClient');

exports.getAll = async (params = {}) => {
  const where = {};
  
  // Status filter
  if (params.status) {
    where.status = params.status;
  }
  
  // Featured filter
  if (params.isFeatured !== undefined) {
    where.isFeatured = params.isFeatured === 'true' || params.isFeatured === true;
  }
  
  // Date filters
  if (params.startFrom || params.startTo) {
    where.startDate = {};
    if (params.startFrom) {
      where.startDate.gte = new Date(params.startFrom);
    }
    if (params.startTo) {
      where.startDate.lte = new Date(params.startTo);
    }
  }
  
  if (params.endFrom || params.endTo) {
    where.endDate = {};
    if (params.endFrom) {
      where.endDate.gte = new Date(params.endFrom);
    }
    if (params.endTo) {
      where.endDate.lte = new Date(params.endTo);
    }
  }
  
  // Search by title
  if (params.search) {
    where.title = { contains: params.search };
  }
  
  // Order by
  let orderBy = { createdAt: 'desc' };
  if (params.orderBy === 'startDate') {
    orderBy = { startDate: 'desc' };
  } else if (params.orderBy === 'title') {
    orderBy = { title: 'asc' };
  } else if (params.orderBy === 'viewCount') {
    orderBy = { viewCount: 'desc' };
  }
  
  return await prisma.event.findMany({
    where,
    orderBy,
  });
};

exports.getById = async (id) => {
  return await prisma.event.findUnique({
    where: { id },
  });
};

exports.getBySlug = async (slug) => {
  const event = await prisma.event.findUnique({
    where: { slug },
  });
  
  // Increment view count
  if (event) {
    await prisma.event.update({
      where: { id: event.id },
      data: { viewCount: { increment: 1 } },
    });
  }
  
  return event;
};

exports.create = async (data) => {
  const {
    title,
    slug,
    description,
    content,
    imageUrl,
    thumbnailUrl,
    startDate,
    endDate,
    status,
    isFeatured,
  } = data;
  
  if (!title) {
    throw new Error('Title is required');
  }

  // Generate slug from title if not provided
  const eventSlug = slug || title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return await prisma.event.create({
    data: {
      title,
      slug: eventSlug,
      description,
      content,
      imageUrl,
      thumbnailUrl,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: status || 'ACTIVE',
      isFeatured: isFeatured === true || isFeatured === 'true',
    },
  });
};

exports.update = async (id, data) => {
  const {
    title,
    slug,
    description,
    content,
    imageUrl,
    thumbnailUrl,
    startDate,
    endDate,
    status,
    isFeatured,
  } = data;
  
  const updateData = {};
  if (title) updateData.title = title;
  if (slug !== undefined) {
    updateData.slug = slug || title.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  if (description !== undefined) updateData.description = description;
  if (content !== undefined) updateData.content = content;
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
  if (thumbnailUrl !== undefined) updateData.thumbnailUrl = thumbnailUrl;
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
  if (status !== undefined) updateData.status = status;
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured === true || isFeatured === 'true';

  return await prisma.event.update({
    where: { id },
    data: updateData,
  });
};

exports.delete = async (id) => {
  return await prisma.event.delete({
    where: { id },
  });
};

