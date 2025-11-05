const prisma = require('../prismaClient');

exports.getAll = async (params = {}) => {
  return await prisma.movie.findMany({
    orderBy: { id: 'desc' },
  });
};

exports.getById = async (id) => {
  return await prisma.movie.findUnique({
    where: { id },
  });
};

exports.create = async (data) => {
  const { title, actors, duration, genres, releaseDate, rating, description, posterUrl } = data;
  
  if (!title || !duration) {
    throw new Error('Title and duration are required');
  }

  return await prisma.movie.create({
    data: {
      title,
      actors,
      duration: parseInt(duration),
      genres,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      rating: rating ? parseFloat(rating) : null,
      description,
      posterUrl,
    },
  });
};

exports.update = async (id, data) => {
  const { title, actors, duration, genres, releaseDate, rating, description, posterUrl } = data;
  
  const updateData = {};
  if (title) updateData.title = title;
  if (actors !== undefined) updateData.actors = actors;
  if (duration) updateData.duration = parseInt(duration);
  if (genres !== undefined) updateData.genres = genres;
  if (releaseDate) updateData.releaseDate = new Date(releaseDate);
  if (rating !== undefined) updateData.rating = rating ? parseFloat(rating) : null;
  if (description !== undefined) updateData.description = description;
  if (posterUrl !== undefined) updateData.posterUrl = posterUrl;

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

