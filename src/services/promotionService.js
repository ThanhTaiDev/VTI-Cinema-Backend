const prisma = require('../prismaClient');

/**
 * Get all promotions (using Event model with filter)
 * Promotions are Events that are marked as promotions (we'll use a pattern or field to identify)
 * For now, we'll filter by checking if slug starts with 'promotion-' or use isFeatured flag
 * In the future, can add a 'type' field to Event model
 */
exports.getAll = async (params = {}) => {
  const {
    page = 1,
    limit = 12,
    search,
    featured,
  } = params;

  const where = {
    status: 'ACTIVE', // Only active events
  };

  // Filter for promotions: we'll use a pattern or check description
  // For now, we'll assume promotions have slug starting with 'promotion-' or 'uu-dai-'
  // Or we can check if description contains 'khuyến mãi' or 'ưu đãi'
  // Alternative: use a custom field or check if it's in a specific category
  // For simplicity, we'll filter by checking if slug contains 'promotion' or 'uu-dai'
  // In production, you might want to add a 'type' field to Event model
  
  // Option 1: Filter by slug pattern (if promotions have specific slug pattern)
  // where.slug = { contains: 'promotion' }; // or 'uu-dai'
  
  // Option 2: For now, we'll return all ACTIVE events and let frontend filter
  // OR we can add a field to identify promotions
  // For this implementation, we'll return all events and filter on frontend
  // OR better: add a check in description or use isFeatured for promotions
  
  // Actually, let's use a simpler approach: check if slug starts with certain patterns
  // But to be flexible, we'll allow filtering by search term that can match promotion keywords
  
  // Search filter
  const searchConditions = [];
  if (search) {
    searchConditions.push(
      { title: { contains: search } },
      { description: { contains: search } }
    );
  }

  // Featured filter
  if (featured !== undefined) {
    where.isFeatured = featured === 'true' || featured === true;
  }

  // Date filter: only show promotions that are currently active
  // Promotion is active if:
  // - startDate is null OR startDate <= now (has started)
  // - AND endDate is null OR endDate >= now (hasn't ended)
  const now = new Date();
  const dateConditions = {
    AND: [
      {
        OR: [
          { startDate: null },
          { startDate: { lte: now } },
        ],
      },
      {
        OR: [
          { endDate: null },
          { endDate: { gte: now } },
        ],
      },
    ],
  };

  // Combine all conditions
  const allConditions = [dateConditions];
  if (searchConditions.length > 0) {
    allConditions.push({ OR: searchConditions });
  }
  
  if (allConditions.length > 1) {
    where.AND = allConditions;
  } else {
    Object.assign(where, dateConditions);
  }

  // Count total
  const total = await prisma.event.count({ where });

  // Get promotions with pagination
  const promotions = await prisma.event.findMany({
    where,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true, // Use as excerpt
      imageUrl: true,
      thumbnailUrl: true,
      startDate: true,
      endDate: true,
      isFeatured: true,
      createdAt: true,
      updatedAt: true,
      // Don't select content for list view (too large)
    },
    orderBy: [
      { isFeatured: 'desc' }, // Featured first
      { createdAt: 'desc' }, // Then by date
    ],
    skip: (page - 1) * limit,
    take: parseInt(limit),
  });

  return {
    data: promotions.map(p => ({
      id: p.id,
      title: p.title,
      slug: p.slug,
      excerpt: p.description || '', // Use description as excerpt
      imageUrl: p.imageUrl || p.thumbnailUrl,
      startDate: p.startDate,
      endDate: p.endDate,
      featured: p.isFeatured,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get promotion by slug
 */
exports.getBySlug = async (slug) => {
  const promotion = await prisma.event.findUnique({
    where: { slug },
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      content: true,
      imageUrl: true,
      thumbnailUrl: true,
      startDate: true,
      endDate: true,
      isFeatured: true,
      viewCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!promotion) {
    return null;
  }

  // Increment view count
  await prisma.event.update({
    where: { id: promotion.id },
    data: { viewCount: { increment: 1 } },
  });

  return {
    id: promotion.id,
    title: promotion.title,
    slug: promotion.slug,
    excerpt: promotion.description || '',
    content: promotion.content || '',
    imageUrl: promotion.imageUrl || promotion.thumbnailUrl,
    startDate: promotion.startDate,
    endDate: promotion.endDate,
    featured: promotion.isFeatured,
    viewCount: promotion.viewCount,
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt,
  };
};

/**
 * Get promotion by ID
 */
exports.getById = async (id) => {
  const promotion = await prisma.event.findUnique({
    where: { id },
  });

  if (!promotion) {
    return null;
  }

  return {
    id: promotion.id,
    title: promotion.title,
    slug: promotion.slug,
    excerpt: promotion.description || '',
    content: promotion.content || '',
    imageUrl: promotion.imageUrl || promotion.thumbnailUrl,
    startDate: promotion.startDate,
    endDate: promotion.endDate,
    featured: promotion.isFeatured,
    viewCount: promotion.viewCount,
    createdAt: promotion.createdAt,
    updatedAt: promotion.updatedAt,
  };
};

