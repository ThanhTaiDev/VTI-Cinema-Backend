const express = require('express')
const router = express.Router()
const roomController = require('../controllers/room.controller')
const seatController = require('../controllers/seat.controller')
const { authenticate } = require('../middlewares/auth')
const { authorize } = require('../middlewares/authorize')
const PERMISSIONS = require('../config/permissions')

// Room routes
router.get(
  '/',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_VIEW),
  roomController.listRooms
)

router.get(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_VIEW),
  roomController.getRoomById
)

router.post(
  '/',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_CREATE),
  roomController.createRoom
)

router.put(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_UPDATE),
  roomController.updateRoom
)

router.delete(
  '/:id',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_DELETE),
  roomController.deleteRoom
)

// Seat routes (nested under rooms)
router.get(
  '/:roomId/seats',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_VIEW),
  seatController.getSeatsByRoom
)

router.post(
  '/:roomId/seats',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_UPDATE),
  seatController.saveSeats
)

router.delete(
  '/:roomId/seats',
  authenticate,
  authorize(PERMISSIONS.CINEMAS_DELETE),
  seatController.deleteSeatsByRoom
)

module.exports = router

