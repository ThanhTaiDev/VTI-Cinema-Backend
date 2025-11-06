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
  
  // Pre-sale filter
  if (params.isPreSale !== undefined) {
    where.isPreSale = params.isPreSale === 'true' || params.isPreSale === true;
  }
  
  // Release date filter
  if (params.releaseFrom || params.releaseTo) {
    where.releaseDate = {};
    if (params.releaseFrom) {
      where.releaseDate.gte = new Date(params.releaseFrom);
    }
    if (params.releaseTo) {
      where.releaseDate.lte = new Date(params.releaseTo);
    }
  }
  
  // Age rating filter
  if (params.ageRating) {
    where.ageRating = params.ageRating;
  }
  
  // Search by title
  if (params.search) {
    where.title = { contains: params.search };
  }
  
  // Order by
  let orderBy = { createdAt: 'desc' };
  if (params.orderBy === 'releaseDate') {
    orderBy = { releaseDate: 'desc' };
  } else if (params.orderBy === 'title') {
    orderBy = { title: 'asc' };
  } else if (params.orderBy === 'rating') {
    orderBy = { rating: 'desc' };
  }
  
  return await prisma.movie.findMany({
    where,
    orderBy,
  });
};

exports.getById = async (id) => {
  return await prisma.movie.findUnique({
    where: { id },
  });
};

exports.getBySlug = async (slug) => {
  return await prisma.movie.findUnique({
    where: { slug },
  });
};

exports.create = async (data) => {
  const {
    title,
    slug,
    actors,
    director,
    duration,
    genres,
    countries,
    releaseDate,
    rating,
    ageRating,
    description,
    summary,
    posterUrl,
    backdropUrl,
    trailerUrl,
    formats,
    cast,
    status,
    isPreSale,
    isFeatured,
  } = data;
  
  if (!title || !duration) {
    throw new Error('Title and duration are required');
  }

  // Generate slug from title if not provided
  const movieSlug = slug || title.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  return await prisma.movie.create({
    data: {
      title,
      slug: movieSlug,
      actors,
      director,
      duration: parseInt(duration),
      genres,
      countries,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      rating: rating ? parseFloat(rating) : null,
      ageRating,
      description,
      summary,
      posterUrl,
      backdropUrl,
      trailerUrl,
      formats: formats ? (typeof formats === 'string' ? formats : JSON.stringify(formats)) : null,
      cast: cast ? (typeof cast === 'string' ? cast : JSON.stringify(cast)) : null,
      status: status || 'COMING_SOON',
      isPreSale: isPreSale === true || isPreSale === 'true',
      isFeatured: isFeatured === true || isFeatured === 'true',
    },
  });
};

exports.update = async (id, data) => {
  const {
    title,
    slug,
    actors,
    director,
    duration,
    genres,
    countries,
    releaseDate,
    rating,
    ageRating,
    description,
    summary,
    posterUrl,
    backdropUrl,
    trailerUrl,
    formats,
    cast,
    status,
    isPreSale,
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
  if (actors !== undefined) updateData.actors = actors;
  if (director !== undefined) updateData.director = director;
  if (duration) updateData.duration = parseInt(duration);
  if (genres !== undefined) updateData.genres = genres;
  if (countries !== undefined) updateData.countries = countries;
  if (releaseDate !== undefined) updateData.releaseDate = releaseDate ? new Date(releaseDate) : null;
  if (rating !== undefined) updateData.rating = rating ? parseFloat(rating) : null;
  if (ageRating !== undefined) updateData.ageRating = ageRating;
  if (description !== undefined) updateData.description = description;
  if (summary !== undefined) updateData.summary = summary;
  if (posterUrl !== undefined) updateData.posterUrl = posterUrl;
  if (backdropUrl !== undefined) updateData.backdropUrl = backdropUrl;
  if (trailerUrl !== undefined) updateData.trailerUrl = trailerUrl;
  if (formats !== undefined) {
    updateData.formats = formats ? (typeof formats === 'string' ? formats : JSON.stringify(formats)) : null;
  }
  if (cast !== undefined) {
    updateData.cast = cast ? (typeof cast === 'string' ? cast : JSON.stringify(cast)) : null;
  }
  if (status !== undefined) updateData.status = status;
  if (isPreSale !== undefined) updateData.isPreSale = isPreSale === true || isPreSale === 'true';
  if (isFeatured !== undefined) updateData.isFeatured = isFeatured === true || isFeatured === 'true';

  return await prisma.movie.update({
    where: { id },
    data: updateData,
  });
};

exports.delete = async (id) => {
  return await prisma.movie.delete({
    where: { id },
  });
};

