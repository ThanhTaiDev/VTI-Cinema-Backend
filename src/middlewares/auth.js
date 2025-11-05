const jwt = require('jsonwebtoken');
const prisma = require('../prismaClient');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'ADMIN') {
    next();
  } else {
    return res.status(403).json({ message: 'Forbidden - Admin access required' });
  }
};

module.exports = { authenticate, requireAdmin };

