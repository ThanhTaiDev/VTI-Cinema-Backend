const roomService = require('../services/roomService')

exports.listRooms = async (req, res, next) => {
  try {
    const { cinemaId, page, limit } = req.query
    const result = await roomService.listRooms({ cinemaId, page, limit })
    res.json(result)
  } catch (err) {
    next(err)
  }
}

exports.getRoomById = async (req, res, next) => {
  try {
    const room = await roomService.getRoomById(req.params.id)
    if (!room) {
      return res.status(404).json({ message: 'Room not found' })
    }
    res.json(room)
  } catch (err) {
    next(err)
  }
}

exports.createRoom = async (req, res, next) => {
  try {
    const room = await roomService.createRoom(req.body)
    res.status(201).json(room)
  } catch (err) {
    next(err)
  }
}

exports.updateRoom = async (req, res, next) => {
  try {
    const room = await roomService.updateRoom(req.params.id, req.body)
    res.json(room)
  } catch (err) {
    next(err)
  }
}

exports.deleteRoom = async (req, res, next) => {
  try {
    await roomService.deleteRoom(req.params.id)
    res.json({ success: true, message: 'Room deleted successfully' })
  } catch (err) {
    next(err)
  }
}

