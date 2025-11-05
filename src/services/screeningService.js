const prisma = require('../prismaClient');

exports.getAll = async (params = {}) => {
  const where = {};
  
  if (params.movieId) {
    where.movieId = params.movieId;
  }
  if (params.cinemaId) {
    where.cinemaId = params.cinemaId;
  }
  if (params.date) {
    const startDate = new Date(params.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(params.date);
    endDate.setHours(23, 59, 59, 999);
    where.startTime = {
      gte: startDate,
      lte: endDate,
    };
  }

  const screenings = await prisma.screening.findMany({
    where,
    orderBy: { startTime: 'asc' },
  });
  
  // Fetch related data separately
  const movieIds = [...new Set(screenings.map(s => s.movieId))];
  const cinemaIds = [...new Set(screenings.map(s => s.cinemaId))];
  
  const movies = await prisma.movie.findMany({
    where: { id: { in: movieIds } },
  });
  
  const cinemas = await prisma.cinema.findMany({
    where: { id: { in: cinemaIds } },
  });
  
  return screenings.map(screening => ({
    ...screening,
    movie: movies.find(m => m.id === screening.movieId),
    cinema: cinemas.find(c => c.id === screening.cinemaId),
  }));
};

exports.getById = async (id) => {
  const screening = await prisma.screening.findUnique({
    where: { id },
  });
  
  if (!screening) return null;
  
  const [movie, cinema] = await Promise.all([
    prisma.movie.findUnique({ where: { id: screening.movieId } }),
    prisma.cinema.findUnique({ where: { id: screening.cinemaId } }),
  ]);
  
  return {
    ...screening,
    movie,
    cinema,
  };
};

exports.create = async (data) => {
  const { movieId, cinemaId, room, startTime, endTime, price } = data;
  
  if (!movieId || !cinemaId || !room || !startTime || !endTime || !price) {
    throw new Error('All fields are required');
  }

  const screening = await prisma.screening.create({
    data: {
      movieId,
      cinemaId,
      room,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      price: parseInt(price),
    },
  });
  
  const [movie, cinema] = await Promise.all([
    prisma.movie.findUnique({ where: { id: movieId } }),
    prisma.cinema.findUnique({ where: { id: cinemaId } }),
  ]);
  
  return {
    ...screening,
    movie,
    cinema,
  };
};

exports.update = async (id, data) => {
  const { movieId, cinemaId, room, startTime, endTime, price } = data;
  
  const updateData = {};
  if (movieId) updateData.movieId = movieId;
  if (cinemaId) updateData.cinemaId = cinemaId;
  if (room) updateData.room = room;
  if (startTime) updateData.startTime = new Date(startTime);
  if (endTime) updateData.endTime = new Date(endTime);
  if (price) updateData.price = parseInt(price);

  const screening = await prisma.screening.update({
    where: { id },
    data: updateData,
  });
  
  const [movie, cinema] = await Promise.all([
    prisma.movie.findUnique({ where: { id: screening.movieId } }),
    prisma.cinema.findUnique({ where: { id: screening.cinemaId } }),
  ]);
  
  return {
    ...screening,
    movie,
    cinema,
  };
};

exports.delete = async (id) => {
  return await prisma.screening.delete({
    where: { id },
  });
};

