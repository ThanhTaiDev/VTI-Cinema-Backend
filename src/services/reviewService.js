const prisma = require('../prismaClient');

exports.getByMovieId = async (movieId) => {
  return await prisma.review.findMany({
    where: { movieId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

exports.create = async (data, userId) => {
  const { movieId, rating, content, tags } = data;
  
  if (!movieId || !rating) {
    throw new Error('Movie ID and rating are required');
  }

  if (rating < 1 || rating > 10) {
    throw new Error('Rating must be between 1 and 10');
  }

  // Check if user has ticket for this movie
  // This is a simplified check - you might want to add proper validation
  const hasTicket = await prisma.ticket.findFirst({
    where: {
      userId,
      screening: {
        movieId,
      },
      status: {
        in: ['SUCCESS', 'PENDING'],
      },
    },
  });

  if (!hasTicket) {
    throw new Error('You need to purchase a ticket to review this movie');
  }

  return await prisma.review.create({
    data: {
      movieId,
      userId,
      rating: parseInt(rating),
      content,
      tags,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

exports.update = async (id, data, userId) => {
  const { rating, content, tags } = data;
  
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    throw new Error('Review not found');
  }
  if (review.userId !== userId) {
    throw new Error('You can only update your own reviews');
  }

  const updateData = {};
  if (rating !== undefined) updateData.rating = parseInt(rating);
  if (content !== undefined) updateData.content = content;
  if (tags !== undefined) updateData.tags = tags;

  return await prisma.review.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });
};

exports.delete = async (id, userId) => {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) {
    throw new Error('Review not found');
  }
  if (review.userId !== userId) {
    throw new Error('You can only delete your own reviews');
  }

  return await prisma.review.delete({
    where: { id },
  });
};

