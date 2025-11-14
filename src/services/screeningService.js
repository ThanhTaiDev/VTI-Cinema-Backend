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
  const { 
    movieId, 
    cinemaId, 
    room, 
    roomId, 
    startTime, 
    endTime, 
    price, 
    basePrice, 
    audio, 
    subtitle 
  } = data;
  
  if (!movieId || !cinemaId || !startTime || !endTime) {
    throw new Error('Missing required fields: movieId, cinemaId, startTime, endTime');
  }

  // If roomId provided, validate room exists and belongs to cinema
  if (roomId) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });
    if (!room) {
      throw new Error('Room not found');
    }
    if (room.cinemaId !== cinemaId) {
      throw new Error('Room does not belong to the selected cinema');
    }
  }

  // Create screening
  // Parse price and basePrice to integers
  // Handle empty strings and invalid values
  let parsedPrice;
  if (price !== null && price !== undefined && price !== '') {
    const priceNum = parseInt(price, 10);
    parsedPrice = isNaN(priceNum) ? (basePrice ? parseInt(basePrice, 10) : 90000) : priceNum;
  } else {
    parsedPrice = basePrice ? parseInt(basePrice, 10) : 90000;
  }
  
  let parsedBasePrice = null;
  if (basePrice !== null && basePrice !== undefined && basePrice !== '') {
    const basePriceNum = parseInt(basePrice, 10);
    parsedBasePrice = isNaN(basePriceNum) ? null : basePriceNum;
  }

  // Validate parsedPrice is a valid number
  if (isNaN(parsedPrice) || parsedPrice <= 0) {
    throw new Error('Invalid price value. Price must be a positive number.');
  }

  const screeningData = {
    movieId,
    cinemaId,
    room: room || 'Room 1', // Keep for backward compatibility
    roomId: roomId || null,
    startTime: new Date(startTime),
    endTime: new Date(endTime),
    price: parsedPrice, // Always an integer
    basePrice: parsedBasePrice,
    audio: audio || null,
    subtitle: subtitle || null,
  };

  // Debug log
  console.log('[ScreeningService] Creating screening with data:', {
    movieId,
    cinemaId,
    price: parsedPrice,
    basePrice: parsedBasePrice,
  });

  const screening = await prisma.screening.create({
    data: screeningData,
  });
  
  // NOTE: Seats are now managed through Room, not created per screening
  // If roomId is provided, seats already exist in the room
  // If no roomId, old screenings without room assignment will work but seats need to be created separately
  
  const [movie, cinema, roomRef] = await Promise.all([
    prisma.movie.findUnique({ where: { id: movieId } }),
    prisma.cinema.findUnique({ where: { id: cinemaId } }),
    roomId ? prisma.room.findUnique({ where: { id: roomId } }) : null,
  ]);
  
  return {
    ...screening,
    movie,
    cinema,
    roomRef,
  };
};

exports.update = async (id, data) => {
  const { 
    movieId, 
    cinemaId,
    room,
    roomId,
    startTime,
    endTime,
    price,
    basePrice,
    audio,
    subtitle 
  } = data;
  
  const updateData = {};
  if (movieId !== undefined) updateData.movieId = movieId;
  if (cinemaId !== undefined) updateData.cinemaId = cinemaId;
  if (room !== undefined) updateData.room = room;
  if (roomId !== undefined) {
    // Validate room if provided
    if (roomId) {
      const room = await prisma.room.findUnique({
        where: { id: roomId },
      });
      if (!room) {
        throw new Error('Room not found');
      }
      if (cinemaId && room.cinemaId !== cinemaId) {
        throw new Error('Room does not belong to the selected cinema');
      }
    }
    updateData.roomId = roomId;
  }
  if (startTime !== undefined) updateData.startTime = new Date(startTime);
  if (endTime !== undefined) updateData.endTime = new Date(endTime);
  // Parse price to integer if provided
  if (price !== undefined) {
    updateData.price = parseInt(price, 10);
  }
  // Parse basePrice to integer if provided
  if (basePrice !== undefined) {
    updateData.basePrice = basePrice !== null && basePrice !== undefined 
      ? parseInt(basePrice, 10) 
      : null;
  }
  if (audio !== undefined) updateData.audio = audio;
  if (subtitle !== undefined) updateData.subtitle = subtitle;

  const screening = await prisma.screening.update({
    where: { id },
    data: updateData,
    include: {
      roomRef: {
        select: {
          id: true,
          name: true,
        },
      },
    },
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

