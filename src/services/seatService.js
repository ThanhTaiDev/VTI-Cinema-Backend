const prisma = require('../prismaClient')

/**
 * Seat Service - Manage seats in rooms
 */

/**
 * Get seats for a room (seat map)
 */
exports.getSeatsByRoom = async (roomId) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
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
    },
  })

  if (!room) {
    throw new Error('Room not found')
  }

  return room.seats
}

/**
 * Get seat map for a screening (legacy format for backward compatibility)
 * Returns format: { seats: { [seatId]: { ... } } }
 */
exports.getSeatMap = async (screeningId) => {
  try {
    // Use the new getSeatsByScreening function
    const seats = await exports.getSeatsByScreening(screeningId)
    
    // Convert to legacy format: { seats: { [seatId]: seatData } }
    const seatsMap = {}
    seats.forEach(seat => {
      const seatId = seat.seatId || seat.code
      seatsMap[seatId] = {
        id: seat.seatId,
        code: seat.code,
        row: seat.row,
        col: seat.col,
        status: seat.status,
        price: seat.price,
        seatType: seat.seatType,
      }
    })
    
    return { seats: seatsMap }
  } catch (err) {
    // If error, return empty map instead of throwing
    console.error('[SeatService] Error in getSeatMap:', err)
    return { seats: {} }
  }
}

/**
 * Get seats for a screening (with availability status)
 */
exports.getSeatsByScreening = async (screeningId) => {
  const screening = await prisma.screening.findUnique({
    where: { id: screeningId },
    include: {
      roomRef: {
        include: {
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
        },
      },
      cinema: {
        include: {
          rooms: {
            include: {
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
            },
          },
        },
      },
      seatStatuses: {
        select: {
          seatId: true,
          status: true,
          orderId: true,
        },
      },
    },
  })

  if (!screening) {
    throw new Error('Screening not found')
  }

  // If screening has roomId, use that room
  let targetRoom = screening.roomRef

  // If no roomId, try to find a room by matching the legacy "room" field (room name)
  if (!targetRoom && screening.room) {
    const matchingRoom = screening.cinema?.rooms?.find(
      r => r.name.toLowerCase() === screening.room.toLowerCase()
    )
    if (matchingRoom) {
      targetRoom = matchingRoom
      // Auto-assign roomId to screening for future use
      await prisma.screening.update({
        where: { id: screeningId },
        data: { roomId: matchingRoom.id },
      }).catch(err => {
        console.warn('[SeatService] Could not auto-assign roomId:', err)
      })
    }
  }

  // If still no room, use the first available room in the cinema
  if (!targetRoom && screening.cinema?.rooms?.length > 0) {
    targetRoom = screening.cinema.rooms[0]
    // Auto-assign roomId to screening for future use
    await prisma.screening.update({
      where: { id: screeningId },
      data: { roomId: targetRoom.id },
    }).catch(err => {
      console.warn('[SeatService] Could not auto-assign roomId:', err)
    })
  }

  if (!targetRoom) {
    throw new Error('Screening has no room assigned and no rooms available in cinema')
  }

  // Clean up orphaned HELD seats (seats held but no valid order exists)
  // This happens when user holds seats, creates order, but then navigates away
  // and the order gets deleted/cancelled but seats remain HELD
  const now = new Date()
  const heldSeatStatuses = screening.seatStatuses.filter(ss => ss.status === 'HELD')
  if (heldSeatStatuses.length > 0) {
    // Get full seat status details including holdUntil
    const fullHeldStatuses = await prisma.seatStatus.findMany({
      where: {
        screeningId,
        seatId: { in: heldSeatStatuses.map(ss => ss.seatId) },
        status: 'HELD',
      },
      select: {
        seatId: true,
        orderId: true,
        holdUntil: true,
      },
    })
    
    const heldOrderIds = fullHeldStatuses
      .map(ss => ss.orderId)
      .filter(Boolean) // Remove null/undefined
    
    // Check which orders still exist and are valid
    let validOrderIds = new Set()
    if (heldOrderIds.length > 0) {
      const orders = await prisma.order.findMany({
        where: {
          id: { in: heldOrderIds },
          status: { in: ['PENDING', 'PAID', 'CONFIRMED'] }, // Only valid order statuses
        },
        select: { id: true },
      })
      validOrderIds = new Set(orders.map(o => o.id))
    }
    
    // Release seats that are HELD but:
    // 1. Have orderId but order doesn't exist or is invalid (CANCELLED, EXPIRED, etc.)
    // 2. Have no orderId AND holdUntil has expired
    const orphanedSeatStatuses = fullHeldStatuses.filter(ss => {
      // If has orderId but order is not valid, it's orphaned
      if (ss.orderId && !validOrderIds.has(ss.orderId)) {
        return true
      }
      // If no orderId and holdUntil expired, it's orphaned
      if (!ss.orderId && ss.holdUntil && new Date(ss.holdUntil) < now) {
        return true
      }
      return false
    })
    
    if (orphanedSeatStatuses.length > 0) {
      const orphanedSeatStatusIds = orphanedSeatStatuses.map(ss => ss.seatId)
      // Update orphaned HELD seats to AVAILABLE
      await prisma.seatStatus.updateMany({
        where: {
          screeningId,
          seatId: { in: orphanedSeatStatusIds },
          status: 'HELD',
        },
        data: {
          status: 'AVAILABLE',
          holdToken: null,
          holdUserId: null,
          holdUntil: null,
          orderId: null,
        },
      }).catch(err => {
        console.warn('[SeatService] Error releasing orphaned holds:', err)
      })
    }
  }

  // Re-fetch seat statuses after cleanup to get accurate status
  const updatedSeatStatuses = await prisma.seatStatus.findMany({
    where: { screeningId },
    select: {
      seatId: true,
      status: true,
      orderId: true,
    },
  })

  // Map seat statuses
  const statusMap = {}
  updatedSeatStatuses.forEach(ss => {
    statusMap[ss.seatId] = ss.status
  })

  // Return seats with status
  return targetRoom.seats.map(seat => ({
    seatId: seat.id,
    code: seat.code,
    row: seat.row,
    col: seat.col,
    seatType: seat.seatType,
    status: statusMap[seat.id] || 'AVAILABLE',
    price: screening.basePrice
      ? Math.round(screening.basePrice * seat.seatType.priceFactor)
      : screening.price || 0,
  }))
}

/**
 * Create/Update seats in bulk for a room
 */
exports.saveSeats = async (roomId, seatsData) => {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
  })

  if (!room) {
    throw new Error('Room not found')
  }

  // Get default seat type (STANDARD)
  const defaultSeatType = await prisma.seatType.findUnique({
    where: { code: 'STANDARD' },
  })

  if (!defaultSeatType) {
    throw new Error('Default seat type (STANDARD) not found. Please run seed script.')
  }

  // Get unavailable seat type
  const unavailableSeatType = await prisma.seatType.findUnique({
    where: { code: 'UNAVAILABLE' },
  })

  // Process seats
  const seatsToUpsert = []
  for (const seatData of seatsData) {
    const { code, row, col, seatType: seatTypeCode, status = 'available' } = seatData

    // Extract seatType code (handle both string and object)
    let seatTypeCodeStr = seatTypeCode
    if (typeof seatTypeCode === 'object' && seatTypeCode !== null) {
      seatTypeCodeStr = seatTypeCode.code || seatTypeCode
    }

    // Find seat type
    let seatType = defaultSeatType
    if (seatTypeCodeStr) {
      const found = await prisma.seatType.findUnique({
        where: { code: String(seatTypeCodeStr) },
      })
      if (found) {
        seatType = found
      }
    }

    // If status is 'disabled' or seatType is UNAVAILABLE, use unavailable type
    if (status === 'disabled' || seatTypeCodeStr === 'UNAVAILABLE') {
      seatType = unavailableSeatType || defaultSeatType
    }

    seatsToUpsert.push({
      roomId,
      code,
      row: String(row),
      col: parseInt(col),
      seatTypeId: seatType.id,
      status,
    })
  }

  // Use transaction to upsert all seats
  const results = await prisma.$transaction(async (tx) => {
    const seatResults = []
    for (const seatData of seatsToUpsert) {
      // Try to find existing seat
      const existing = await tx.seat.findFirst({
        where: {
          roomId: seatData.roomId,
          row: seatData.row,
          col: seatData.col,
        },
      })

      if (existing) {
        // Update existing seat
        const updated = await tx.seat.update({
          where: { id: existing.id },
          data: {
            code: seatData.code,
            seatTypeId: seatData.seatTypeId,
            status: seatData.status,
          },
        })
        seatResults.push(updated)
      } else {
        // Create new seat
        const created = await tx.seat.create({
          data: seatData,
        })
        seatResults.push(created)
      }
    }
    return seatResults
  })

  return {
    success: true,
    count: results.length,
  }
}

/**
 * Delete all seats for a room (when resetting layout)
 */
exports.deleteSeatsByRoom = async (roomId) => {
  await prisma.seat.deleteMany({
    where: { roomId },
  })

  return { success: true }
}

/**
 * Get seat statuses for a screening
 */
exports.getSeatStatuses = async (screeningId) => {
  const statuses = await prisma.seatStatus.findMany({
    where: {
      screeningId,
    },
    select: {
      seatId: true,
      status: true,
      orderId: true,
      holdUntil: true,
    },
  })

  return statuses
}

/**
 * Hold seats for a screening (create SeatStatus records with HELD status)
 */
exports.holdSeats = async (screeningId, seatIds, userId) => {
  if (!screeningId || !seatIds || !Array.isArray(seatIds) || seatIds.length === 0) {
    throw new Error('Missing required fields: screeningId, seatIds')
  }

  if (!userId) {
    throw new Error('User ID is required')
  }

  // Verify screening exists
  const screening = await prisma.screening.findUnique({
    where: { id: screeningId },
  })

  if (!screening) {
    throw new Error('Screening not found')
  }

  // Generate hold token
  const crypto = require('crypto')
  const holdToken = crypto.randomBytes(32).toString('hex')
  const holdUntil = new Date(Date.now() + 600000) // 10 minutes

  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Check if any seats are already HELD or SOLD
    const existingStatuses = await tx.seatStatus.findMany({
      where: {
        screeningId,
        seatId: { in: seatIds },
        status: { in: ['HELD', 'SOLD'] },
      },
    })

    if (existingStatuses.length > 0) {
      const error = new Error('Some seats are already taken')
      error.status = 409 // Conflict
      error.conflictedSeats = existingStatuses.map(ss => ss.seatId)
      throw error
    }

    // Create or update SeatStatus records
    const seatStatuses = await Promise.all(
      seatIds.map(async (seatId) => {
        // Check if seat exists
        const seat = await tx.seat.findUnique({
          where: { id: seatId },
        })

        if (!seat) {
          throw new Error(`Seat ${seatId} not found`)
        }

        // Find existing SeatStatus for this seat and screening
        const existing = await tx.seatStatus.findFirst({
          where: {
            seatId,
            screeningId,
          },
          orderBy: { createdAt: 'desc' },
        })

        if (existing) {
          // Update existing status to HELD
          return await tx.seatStatus.update({
            where: { id: existing.id },
            data: {
              status: 'HELD',
              holdToken,
              holdUserId: userId,
              holdUntil,
            },
          })
        } else {
          // Create new SeatStatus
          return await tx.seatStatus.create({
            data: {
              seatId,
              screeningId,
              status: 'HELD',
              holdToken,
              holdUserId: userId,
              holdUntil,
            },
          })
        }
      })
    )

    return {
      holdToken,
      holdUntil,
      seatStatuses: seatStatuses.map(ss => ({
        seatId: ss.seatId,
        status: ss.status,
      })),
    }
  })
}

/**
 * Release expired seat holds
 * Updates SeatStatus records with status='HELD' and holdUntil < now to 'AVAILABLE'
 * Also releases HELD seats that have no valid order (orphaned holds)
 */
exports.releaseExpiredHolds = async () => {
  try {
    const now = new Date()

    // Step 1: Release expired holds (holdUntil < now)
    const expiredResult = await prisma.seatStatus.updateMany({
      where: {
        status: 'HELD',
        holdUntil: {
          lt: now, // Less than now = expired
        },
      },
      data: {
        status: 'AVAILABLE',
        holdToken: null,
        holdUserId: null,
        holdUntil: null,
        orderId: null,
      },
    })

    // Step 2: Release orphaned HELD seats (seats held but no valid order exists)
    // Find all HELD seats with orderId
    const heldSeatsWithOrders = await prisma.seatStatus.findMany({
      where: {
        status: 'HELD',
        orderId: { not: null },
      },
      select: {
        id: true,
        seatId: true,
        orderId: true,
      },
    })

    if (heldSeatsWithOrders.length > 0) {
      const orderIds = [...new Set(heldSeatsWithOrders.map(ss => ss.orderId).filter(Boolean))]
      
      // Check which orders still exist and are valid
      const validOrders = await prisma.order.findMany({
        where: {
          id: { in: orderIds },
          status: { in: ['PENDING', 'PAID', 'CONFIRMED'] }, // Only valid order statuses
        },
        select: { id: true },
      })
      
      const validOrderIds = new Set(validOrders.map(o => o.id))
      
      // Find orphaned seat statuses (have orderId but order doesn't exist or is invalid)
      const orphanedSeatStatusIds = heldSeatsWithOrders
        .filter(ss => !validOrderIds.has(ss.orderId))
        .map(ss => ss.id)
      
      if (orphanedSeatStatusIds.length > 0) {
        await prisma.seatStatus.updateMany({
          where: {
            id: { in: orphanedSeatStatusIds },
            status: 'HELD',
          },
          data: {
            status: 'AVAILABLE',
            holdToken: null,
            holdUserId: null,
            holdUntil: null,
            orderId: null,
          },
        })
      }
      
      // Also release HELD seats without orderId (shouldn't happen but cleanup anyway)
      const heldSeatsWithoutOrders = await prisma.seatStatus.updateMany({
        where: {
          status: 'HELD',
          orderId: null,
          holdUntil: {
            lt: now, // Only release if expired
          },
        },
        data: {
          status: 'AVAILABLE',
          holdToken: null,
          holdUserId: null,
          holdUntil: null,
        },
      })
      
      return {
        released: expiredResult.count + orphanedSeatStatusIds.length + heldSeatsWithoutOrders.count,
        expired: expiredResult.count,
        orphaned: orphanedSeatStatusIds.length,
        withoutOrder: heldSeatsWithoutOrders.count,
      }
    }

    return {
      released: expiredResult.count,
      expired: expiredResult.count,
      orphaned: 0,
      withoutOrder: 0,
    }
  } catch (error) {
    console.error('[SeatService] Error releasing expired holds:', error)
    throw error
  }
}
