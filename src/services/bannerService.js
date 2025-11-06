const prisma = require('../prismaClient')

exports.getAll = async (params = {}) => {
  const where = {}
  
  // Chỉ lấy banner active
  if (params.active !== undefined) {
    where.isActive = params.active === 'true' || params.active === true
  } else {
    where.isActive = true
  }

  // Lọc theo thời gian (nếu có startDate/endDate)
  const now = new Date()
  if (params.checkDate !== 'false') {
    where.OR = [
      { startDate: null },
      { startDate: { lte: now } }
    ]
    where.AND = [
      {
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    ]
  }

  let orderBy = { order: 'asc' }
  if (params.orderBy === 'createdAt') {
    orderBy = { createdAt: 'desc' }
  }

  return await prisma.banner.findMany({
    where,
    orderBy
  })
}

exports.getById = async (id) => {
  return await prisma.banner.findUnique({
    where: { id }
  })
}

exports.create = async (data) => {
  const { title, imageUrl, linkUrl, linkType, order, isActive, startDate, endDate } = data
  
  if (!imageUrl) {
    throw new Error('Image URL is required')
  }

  return await prisma.banner.create({
    data: {
      title: title || null,
      imageUrl,
      linkUrl: linkUrl || null,
      linkType: linkType || null,
      order: order || 0,
      isActive: isActive !== undefined ? (isActive === true || isActive === 'true') : true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null
    }
  })
}

exports.update = async (id, data) => {
  const { title, imageUrl, linkUrl, linkType, order, isActive, startDate, endDate } = data
  
  const updateData = {}
  if (title !== undefined) updateData.title = title || null
  if (imageUrl !== undefined) updateData.imageUrl = imageUrl
  if (linkUrl !== undefined) updateData.linkUrl = linkUrl || null
  if (linkType !== undefined) updateData.linkType = linkType || null
  if (order !== undefined) updateData.order = order || 0
  if (isActive !== undefined) updateData.isActive = isActive === true || isActive === 'true'
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null
  if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null

  return await prisma.banner.update({
    where: { id },
    data: updateData
  })
}

exports.delete = async (id) => {
  return await prisma.banner.delete({
    where: { id }
  })
}

exports.updateOrder = async (banners) => {
  // banners: [{ id, order }, ...]
  const updates = banners.map(b => 
    prisma.banner.update({
      where: { id: b.id },
      data: { order: b.order }
    })
  )
  return await prisma.$transaction(updates)
}

