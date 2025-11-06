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

  // Create screening with seats in a transaction
  const screening = await prisma.$transaction(async (tx) => {
    const newScreening = await tx.screening.create({
      data: {
        movieId,
        cinemaId,
        room,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        price: parseInt(price),
      },
    });

    // Create seats (8 rows x 10 columns)
    const ROWS = 8;
    const COLS = 10;
    const seatCreates = [];
    
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const row = r + 1;
        const col = c + 1;
        const code = String.fromCharCode(65 + r) + col; // A1, A2, ..., H10
        
        seatCreates.push(
          tx.seat.create({
            data: {
              screeningId: newScreening.id,
              row,
              col,
              code,
              statuses: {
                create: {
                  screeningId: newScreening.id,
                  status: 'AVAILABLE',
                },
              },
            },
          })
        );
      }
    }
    
    await Promise.all(seatCreates);
    console.log(`Created ${ROWS * COLS} seats for screening ${newScreening.id}`);
    
    return newScreening;
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

