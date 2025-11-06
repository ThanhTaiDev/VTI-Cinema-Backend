const seatService = require('../services/seatService');

exports.getSeatMap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await seatService.getSeatMap(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

exports.holdSeats = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { seatIds } = req.body;
    const userId = req.user.id;

    const result = await seatService.holdSeats(id, seatIds, userId);
    res.json(result);
  } catch (err) {
    if (err.status === 409) {
      return res.status(409).json({
        message: err.message,
        conflictedSeats: err.conflictedSeats,
      });
    }
    next(err);
  }
};

exports.getSeatStatuses = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await seatService.getSeatStatuses(id);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

