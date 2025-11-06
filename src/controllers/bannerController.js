const bannerService = require('../services/bannerService')

exports.getAll = async (req, res, next) => {
  try {
    const banners = await bannerService.getAll(req.query)
    res.json(banners)
  } catch (err) {
    next(err)
  }
}

exports.getById = async (req, res, next) => {
  try {
    const banner = await bannerService.getById(req.params.id)
    if (!banner) {
      return res.status(404).json({ message: 'Banner not found' })
    }
    res.json(banner)
  } catch (err) {
    next(err)
  }
}

exports.create = async (req, res, next) => {
  try {
    const banner = await bannerService.create(req.body)
    res.status(201).json(banner)
  } catch (err) {
    next(err)
  }
}

exports.update = async (req, res, next) => {
  try {
    const banner = await bannerService.update(req.params.id, req.body)
    res.json(banner)
  } catch (err) {
    next(err)
  }
}

exports.delete = async (req, res, next) => {
  try {
    await bannerService.delete(req.params.id)
    res.json({ message: 'Banner deleted successfully' })
  } catch (err) {
    next(err)
  }
}

exports.updateOrder = async (req, res, next) => {
  try {
    await bannerService.updateOrder(req.body.banners || [])
    res.json({ message: 'Banner order updated successfully' })
  } catch (err) {
    next(err)
  }
}

