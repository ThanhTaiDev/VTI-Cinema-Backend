const authService = require('../services/authService');

exports.register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const token = await authService.login(req.body);
    res.json(token);
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    await authService.forgotPassword(req.body);
    res.json({ message: 'Reset link sent if email exists' });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    await authService.resetPassword(req.body);
    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
};

exports.getCurrentUser = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);
    
    // Include permissions from RBAC
    const rbacService = require('../services/rbac.service');
    let permissions = [];
    try {
      permissions = await rbacService.getUserPermissions(req.user.id);
    } catch (rbacErr) {
      console.error('Error getting permissions:', rbacErr);
    }
    
    res.json({
      ...user,
      permissions: permissions.map(p => p.code),
    });
  } catch (err) {
    next(err);
  }
};