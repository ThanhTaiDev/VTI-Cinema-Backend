const prisma = require('../prismaClient')

/**
 * Room Service - Manage cinema rooms
 */

/**
 * List all rooms with cinema info and seat count
 */
exports.listRooms = async (params = {}) => {
  const { cinemaId, page = 1, limit = 20 } = params
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where = {}
  if (cinemaId) {
    where.cinemaId = cinemaId
  }

  const rooms = await prisma.room.findMany({
    where,
    skip,
    take: parseInt(limit),
    include: {
      cinema: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { seats: true },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  const total = await prisma.room.count({ where })

  return {
    data: rooms.map(room => ({
      ...room,
      seatCount: room._count.seats,
    })),
    meta: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit),
    },
  }
}

/**
 * Get room by ID with full details
 */
exports.getRoomById = async (id) => {
  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      cinema: {
        select: {
          id: true,
          name: true,
          address: true,
        },
      },
      seats: {
        include: {
          seatType: {
            select: {
              id: true,
              code: true,
              name: true,
              priceFactor: true,
              color: true,
            },
          },
        },
        orderBy: [
          { row: 'asc' },
          { col: 'asc' },
        ],
      },
      _count: {
        select: { seats: true },
      },
    },
  })

  if (!room) return null

  return {
    ...room,
    seatCount: room._count.seats,
  }
}

/**
 * Create a new room
 */
exports.createRoom = async (data) => {
  const { cinemaId, name, rows, cols, seatLayout } = data

  // Validate
  if (!cinemaId || !name || !rows || !cols) {
    throw new Error('Missing required fields: cinemaId, name, rows, cols')
  }

  if (rows < 1 || cols < 1) {
    throw new Error('Rows and cols must be at least 1')
  }

  // Check cinema exists
  const cinema = await prisma.cinema.findUnique({
    where: { id: cinemaId },
  })

  if (!cinema) {
    throw new Error('Cinema not found')
  }

  // Get default STANDARD seat type
  const standardSeatType = await prisma.seatType.findUnique({
    where: { code: 'STANDARD' },
  })

  if (!standardSeatType) {
    throw new Error('STANDARD seat type not found. Please run seedSeatTypes.js first.')
  }

  const rowsInt = parseInt(rows)
  const colsInt = parseInt(cols)

  // Create room and seats in a transaction
  const room = await prisma.$transaction(async (tx) => {
    // Create room
    const newRoom = await tx.room.create({
      data: {
        cinemaId,
        name,
        rows: rowsInt,
        cols: colsInt,
        seatLayout: seatLayout || null,
      },
    })

    // Auto-generate seats for the room
    const seatCreates = []
    for (let r = 0; r < rowsInt; r++) {
      for (let c = 1; c <= colsInt; c++) {
        const rowLetter = String.fromCharCode(65 + r) // A, B, C...
        const code = rowLetter + c // A1, A2, ...

        seatCreates.push(
          tx.seat.create({
            data: {
              roomId: newRoom.id,
              seatTypeId: standardSeatType.id,
              row: rowLetter,
              col: c,
              code,
              status: 'available',
            },
          })
        )
      }
    }

    // Create seats in batches to avoid overwhelming the database
    const CONCURRENCY = 20
    for (let k = 0; k < seatCreates.length; k += CONCURRENCY) {
      await Promise.all(seatCreates.slice(k, k + CONCURRENCY))
    }

    return newRoom
  })

  // Return room with cinema info
  return await prisma.room.findUnique({
    where: { id: room.id },
    include: {
      cinema: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: { seats: true },
      },
    },
  })
}

/**
 * Update room
 */
exports.updateRoom = async (id, data) => {
  const { name, rows, cols, seatLayout } = data

  const updateData = {}
  if (name !== undefined) updateData.name = name
  if (rows !== undefined) updateData.rows = parseInt(rows)
  if (cols !== undefined) updateData.cols = parseInt(cols)
  if (seatLayout !== undefined) updateData.seatLayout = seatLayout

  const room = await prisma.room.update({
    where: { id },
    data: updateData,
    include: {
      cinema: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  return room
}

/**
 * Delete room
 */
exports.deleteRoom = async (id) => {
  // Check if room has screenings
  const screeningsCount = await prisma.screening.count({
    where: { roomId: id },
  })

  if (screeningsCount > 0) {
    throw new Error(`Cannot delete room: ${screeningsCount} screening(s) are using this room`)
  }

  await prisma.room.delete({
    where: { id },
  })

  return { success: true }
}

