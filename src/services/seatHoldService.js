const prisma = require('../prismaClient')

/**
 * SeatHold Service - Manage seat holds
 * New flow: User selects seats → Create SeatHold → Create Order → Claim holds to order
 */

const HOLD_TTL_MINUTES = 10

/**
 * Create holds for multiple seats
 * @param {string} screeningId
 * @param {string[]} seatIds
 * @param {string} userId
 * @returns {Promise<{holdIds: string[], expiresAt: Date, screeningId: string}>}
 */
exports.createHolds = async (screeningId, seatIds, userId) => {
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

  // Check if screening has already started
  const now = new Date()
  if (new Date(screening.startTime) < now) {
    throw new Error('Screening has already started')
  }

  const expiresAt = new Date(now.getTime() + HOLD_TTL_MINUTES * 60 * 1000)

  // Use transaction to ensure atomicity
  return await prisma.$transaction(async (tx) => {
    // Check if any seats are already held or sold
    // Get all holds for these SPECIFIC seats only
    const allHolds = await tx.seatHold.findMany({
      where: {
        screeningId,
        seatId: { in: seatIds }, // Only check the seats user is trying to hold
        status: { in: ['HOLD', 'CLAIMED'] },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
        seat: {
          select: {
            id: true,
            row: true,
            col: true,
            code: true,
          },
        },
      },
    })

    console.log(`[SeatHoldService] Checking ${seatIds.length} seats for holds. Found ${allHolds.length} existing holds.`)

    // Filter holds that are actually blocking (active holds or holds with PAID orders)
    const blockingHolds = allHolds.filter(hold => {
      // If hold has no order and is not expired, it's blocking
      if (!hold.orderId && hold.expiresAt > now) {
        console.log(`[SeatHoldService] Blocking: Hold ${hold.id} for seat ${hold.seat?.code || hold.seatId} - no order, not expired`)
        return true
      }
      
      // If hold has order with PAID/CONFIRMED status, it's blocking (seat is sold)
      if (hold.order && (hold.order.status === 'PAID' || hold.order.status === 'CONFIRMED')) {
        console.log(`[SeatHoldService] Blocking: Hold ${hold.id} for seat ${hold.seat?.code || hold.seatId} - order ${hold.order.status}`)
        return true
      }
      
      // If hold has order with PENDING status and not expired, it's blocking
      if (hold.order && hold.order.status === 'PENDING' && hold.expiresAt > now) {
        console.log(`[SeatHoldService] Blocking: Hold ${hold.id} for seat ${hold.seat?.code || hold.seatId} - order PENDING, not expired`)
        return true
      }
      
      // Otherwise, not blocking (expired or order is CANCELLED/EXPIRED)
      console.log(`[SeatHoldService] Not blocking: Hold ${hold.id} for seat ${hold.seat?.code || hold.seatId} - expired or invalid order`)
      return false
    })

    // Also check SeatStatus for SOLD seats (double check)
    const soldSeats = await tx.seatStatus.findMany({
      where: {
        screeningId,
        seatId: { in: seatIds },
        status: 'SOLD',
      },
      include: {
        seat: {
          select: {
            id: true,
            row: true,
            col: true,
            code: true,
          },
        },
      },
    })

    console.log(`[SeatHoldService] Found ${blockingHolds.length} blocking holds and ${soldSeats.length} sold seats`)

    if (blockingHolds.length > 0 || soldSeats.length > 0) {
      const conflictedSeatIds = [
        ...new Set([
          ...blockingHolds.map(h => h.seatId),
          ...soldSeats.map(s => s.seatId),
        ])
      ]
      
      console.log(`[SeatHoldService] Conflict detected. Conflicted seats:`, conflictedSeatIds)
      
      const error = new Error('Some seats are already taken')
      error.status = 409 // Conflict
      error.conflictedSeats = conflictedSeatIds
      throw error
    }

    // Clean up any expired or invalid holds for these seats before creating new ones
    const expiredOrInvalidHolds = allHolds.filter(hold => {
      // Expired holds without order
      if (!hold.orderId && hold.expiresAt <= now) {
        return true
      }
      
      // Holds with CANCELLED/EXPIRED orders
      if (hold.order && (hold.order.status === 'CANCELLED' || hold.order.status === 'EXPIRED')) {
        return true
      }
      
      return false
    })

    if (expiredOrInvalidHolds.length > 0) {
      console.log(`[SeatHoldService] Cleaning up ${expiredOrInvalidHolds.length} expired/invalid holds`)
      
      // Release these holds
      await tx.seatHold.updateMany({
        where: {
          id: { in: expiredOrInvalidHolds.map(h => h.id) },
        },
        data: {
          status: 'RELEASED',
        },
      })

      // Also update SeatStatus to AVAILABLE
      const seatIdsToRelease = expiredOrInvalidHolds.map(h => h.seatId)
      await tx.seatStatus.updateMany({
        where: {
          screeningId,
          seatId: { in: seatIdsToRelease },
          status: 'HELD',
        },
        data: {
          status: 'AVAILABLE',
          orderId: null,
        },
      })
    }

    // Create SeatHold records
    const holds = await Promise.all(
      seatIds.map(async (seatId) => {
        // Verify seat exists
        const seat = await tx.seat.findUnique({
          where: { id: seatId },
        })

        if (!seat) {
          throw new Error(`Seat ${seatId} not found`)
        }

        // Create new SeatHold
        return await tx.seatHold.create({
          data: {
            screeningId,
            seatId,
            userId,
            status: 'HOLD',
            expiresAt,
          },
        })
      })
    )

    // Update SeatStatus to HELD for these seats
    await Promise.all(
      seatIds.map(async (seatId) => {
        // Find or create SeatStatus
        const existing = await tx.seatStatus.findFirst({
          where: {
            screeningId,
            seatId,
          },
          orderBy: { createdAt: 'desc' },
        })

        if (existing) {
          await tx.seatStatus.update({
            where: { id: existing.id },
            data: {
              status: 'HELD',
            },
          })
        } else {
          await tx.seatStatus.create({
            data: {
              screeningId,
              seatId,
              status: 'HELD',
            },
          })
        }
      })
    )

    return {
      holdIds: holds.map(h => h.id),
      expiresAt,
      screeningId,
    }
  })
}

/**
 * Claim holds to an order (link holds to order and update status)
 * @param {string[]} holdIds
 * @param {string} orderId
 * @param {Prisma.TransactionClient} tx - Optional transaction client (if called from within a transaction)
 * @returns {Promise<{claimed: number}>}
 */
exports.claimHoldsToOrder = async (holdIds, orderId, tx = null) => {
  if (!holdIds || !Array.isArray(holdIds) || holdIds.length === 0) {
    throw new Error('Missing required fields: holdIds')
  }

  if (!orderId) {
    throw new Error('Order ID is required')
  }

  const now = new Date()
  const prismaClient = tx || prisma

  // If called from within a transaction, use that transaction
  if (tx) {
    return await claimHoldsToOrderInternal(holdIds, orderId, now, prismaClient)
  }

  // Otherwise, create a new transaction
  return await prisma.$transaction(async (transactionTx) => {
    return await claimHoldsToOrderInternal(holdIds, orderId, now, transactionTx)
  })
}

/**
 * Internal function to claim holds (can be called from within a transaction)
 */
async function claimHoldsToOrderInternal(holdIds, orderId, now, tx) {
  // Verify all holds are valid and not expired
  const holds = await tx.seatHold.findMany({
    where: {
      id: { in: holdIds },
      status: 'HOLD',
      expiresAt: { gt: now },
    },
  })

  if (holds.length !== holdIds.length) {
    throw new Error('Some holds are invalid or expired')
  }

  // Update holds to CLAIMED and link to order
  await tx.seatHold.updateMany({
    where: {
      id: { in: holdIds },
    },
    data: {
      orderId,
      status: 'CLAIMED',
    },
  })

  // Update SeatStatus to HELD and link to order
  // Batch operations for better performance
  const seatStatusUpdates = []
  const seatStatusCreates = []
  
  for (const hold of holds) {
    const existing = await tx.seatStatus.findFirst({
      where: {
        screeningId: hold.screeningId,
        seatId: hold.seatId,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      seatStatusUpdates.push(
        tx.seatStatus.update({
          where: { id: existing.id },
          data: {
            status: 'HELD', // Keep HELD until payment succeeds
            orderId,
          },
        })
      )
    } else {
      seatStatusCreates.push(
        tx.seatStatus.create({
          data: {
            screeningId: hold.screeningId,
            seatId: hold.seatId,
            status: 'HELD',
            orderId,
          },
        })
      )
    }
  }
  
  // Execute all updates and creates
  await Promise.all([...seatStatusUpdates, ...seatStatusCreates])

  return {
    claimed: holds.length,
  }
}

/**
 * Release holds (set status to RELEASED and update SeatStatus to AVAILABLE)
 * @param {string[]} holdIds
 * @returns {Promise<{released: number}>}
 */
exports.releaseHolds = async (holdIds) => {
  if (!holdIds || !Array.isArray(holdIds) || holdIds.length === 0) {
    return { released: 0 }
  }

  return await prisma.$transaction(async (tx) => {
    // Get holds to release
    const holds = await tx.seatHold.findMany({
      where: {
        id: { in: holdIds },
        status: { in: ['HOLD', 'CLAIMED'] },
      },
    })

    if (holds.length === 0) {
      return { released: 0 }
    }

    // Update holds to RELEASED
    await tx.seatHold.updateMany({
      where: {
        id: { in: holds.map(h => h.id) },
      },
      data: {
        status: 'RELEASED',
      },
    })

    // Update SeatStatus to AVAILABLE
    const seatIds = holds.map(h => h.seatId)
    await Promise.all(
      holds.map(async (hold) => {
        const existing = await tx.seatStatus.findFirst({
          where: {
            screeningId: hold.screeningId,
            seatId: hold.seatId,
          },
          orderBy: { createdAt: 'desc' },
        })

        if (existing && existing.status === 'HELD') {
          await tx.seatStatus.update({
            where: { id: existing.id },
            data: {
              status: 'AVAILABLE',
              orderId: null,
            },
          })
        }
      })
    )

    return {
      released: holds.length,
    }
  })
}

/**
 * Get holds by user and screening
 * @param {string} userId
 * @param {string} screeningId
 * @returns {Promise<SeatHold[]>}
 */
exports.getHoldsByUserAndScreening = async (userId, screeningId) => {
  const now = new Date()
  
  return await prisma.seatHold.findMany({
    where: {
      userId,
      screeningId,
      status: { in: ['HOLD', 'CLAIMED'] },
      expiresAt: { gt: now },
    },
    include: {
      seat: {
        include: {
          seatType: true,
        },
      },
      order: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  })
}

/**
 * Cleanup expired holds
 * Releases holds that are expired and not claimed to a valid order
 * @returns {Promise<{released: number, expired: number}>}
 */
exports.cleanupExpiredHolds = async () => {
  const now = new Date()

  return await prisma.$transaction(async (tx) => {
    // Find expired holds
    const expiredHolds = await tx.seatHold.findMany({
      where: {
        status: { in: ['HOLD', 'CLAIMED'] },
        expiresAt: { lte: now },
      },
      include: {
        order: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    })

    if (expiredHolds.length === 0) {
      return { released: 0, expired: 0 }
    }

    // Separate holds by whether they have orders
    const holdsWithOrders = expiredHolds.filter(h => h.orderId && h.order)
    const holdsWithoutOrders = expiredHolds.filter(h => !h.orderId || !h.order)

    // Release holds without orders or with invalid orders
    const holdsToRelease = [
      ...holdsWithoutOrders,
      ...holdsWithOrders.filter(h => {
        // Release if order is not PAID or CONFIRMED
        return h.order.status !== 'PAID' && h.order.status !== 'CONFIRMED'
      }),
    ]

    if (holdsToRelease.length > 0) {
      // Update holds to EXPIRED
      await tx.seatHold.updateMany({
        where: {
          id: { in: holdsToRelease.map(h => h.id) },
        },
        data: {
          status: 'EXPIRED',
        },
      })

      // Update SeatStatus to AVAILABLE
      await Promise.all(
        holdsToRelease.map(async (hold) => {
          const existing = await tx.seatStatus.findFirst({
            where: {
              screeningId: hold.screeningId,
              seatId: hold.seatId,
            },
            orderBy: { createdAt: 'desc' },
          })

          if (existing && existing.status === 'HELD') {
            await tx.seatStatus.update({
              where: { id: existing.id },
              data: {
                status: 'AVAILABLE',
                orderId: null,
              },
            })
          }
        })
      )
    }

    return {
      released: holdsToRelease.length,
      expired: expiredHolds.length,
    }
  })
}

/**
 * Release holds for an order (when order is cancelled)
 * @param {string} orderId
 * @returns {Promise<{released: number}>}
 */
exports.releaseHoldsForOrder = async (orderId) => {
  return await prisma.$transaction(async (tx) => {
    // Find all holds for this order
    const holds = await tx.seatHold.findMany({
      where: {
        orderId,
        status: { in: ['HOLD', 'CLAIMED'] },
      },
    })

    if (holds.length === 0) {
      return { released: 0 }
    }

    // Update holds to RELEASED
    await tx.seatHold.updateMany({
      where: {
        id: { in: holds.map(h => h.id) },
      },
      data: {
        status: 'RELEASED',
        orderId: null,
      },
    })

    // Update SeatStatus to AVAILABLE
    await Promise.all(
      holds.map(async (hold) => {
        const existing = await tx.seatStatus.findFirst({
          where: {
            screeningId: hold.screeningId,
            seatId: hold.seatId,
          },
          orderBy: { createdAt: 'desc' },
        })

        if (existing && existing.status === 'HELD') {
          await tx.seatStatus.update({
            where: { id: existing.id },
            data: {
              status: 'AVAILABLE',
              orderId: null,
            },
          })
        }
      })
    )

    return {
      released: holds.length,
    }
  })
}

