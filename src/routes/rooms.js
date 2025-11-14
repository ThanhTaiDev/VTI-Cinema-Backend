const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const seatController = require('../controllers/seat.controller');
const { authenticate } = require('../middlewares/auth');
const { authorize } = require('../middlewares/authorize');
const PERMISSIONS = require('../config/permissions');

// Admin routes - all require authentication
// Using CINEMAS permissions as rooms are part of cinema management
router.get('/', authenticate, authorize(PERMISSIONS.CINEMAS_VIEW), roomController.listRooms);
router.post('/', authenticate, authorize(PERMISSIONS.CINEMAS_CREATE), roomController.createRoom);

// Seat management routes for rooms (must come before /:id to avoid route conflicts)
router.get('/:roomId/seats', authenticate, authorize(PERMISSIONS.CINEMAS_VIEW), seatController.getSeatsByRoom);
router.post('/:roomId/seats', authenticate, authorize(PERMISSIONS.CINEMAS_UPDATE), seatController.saveSeats);
router.delete('/:roomId/seats', authenticate, authorize(PERMISSIONS.CINEMAS_DELETE), seatController.deleteSeatsByRoom);

// Room CRUD routes
router.get('/:id', authenticate, authorize(PERMISSIONS.CINEMAS_VIEW), roomController.getRoomById);
router.put('/:id', authenticate, authorize(PERMISSIONS.CINEMAS_UPDATE), roomController.updateRoom);
router.delete('/:id', authenticate, authorize(PERMISSIONS.CINEMAS_DELETE), roomController.deleteRoom);

module.exports = router;

