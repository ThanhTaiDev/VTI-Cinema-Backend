const seatService = require('../services/seatService')

exports.getSeatsByRoom = async (req, res, next) => {
  try {
    const seats = await seatService.getSeatsByRoom(req.params.roomId)
    res.json(seats)
  } catch (err) {
    next(err)
  }
}

exports.getSeatsByScreening = async (req, res, next) => {
  try {
    const seats = await seatService.getSeatsByScreening(req.params.screeningId)
    res.json(seats)
  } catch (err) {
    next(err)
  }
}

exports.saveSeats = async (req, res, next) => {
  try {
    const { seats } = req.body
    if (!Array.isArray(seats)) {
      return res.status(400).json({ message: 'seats must be an array' })
    }
    const result = await seatService.saveSeats(req.params.roomId, seats)
    res.json(result)
  } catch (err) {
    next(err)
  }
}

exports.deleteSeatsByRoom = async (req, res, next) => {
  try {
    await seatService.deleteSeatsByRoom(req.params.roomId)
    res.json({ success: true, message: 'Seats deleted successfully' })
  } catch (err) {
    next(err)
  }
}

