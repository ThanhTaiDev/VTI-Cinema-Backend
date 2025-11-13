const adminAccountService = require('../services/adminAccount.service');

/**
 * List accounts with pagination and filters
 */
exports.listAccounts = async (req, res, next) => {
  try {
    const result = await adminAccountService.listAccounts(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * Get account by ID
 */
exports.getAccountById = async (req, res, next) => {
  try {
    const account = await adminAccountService.getAccountById(req.params.id);
    if (!account) {
      return res.status(404).json({ message: 'Account not found' });
    }
    res.json(account);
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk actions on accounts
 */
exports.bulkAction = async (req, res, next) => {
  try {
    const { action, userIds, roleCode } = req.body;

    if (!action || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'Invalid request: action and userIds array required' });
    }

    if ((action === 'assignRole' || action === 'removeRole') && !roleCode) {
      return res.status(400).json({ message: 'roleCode required for assignRole/removeRole actions' });
    }

    const results = await adminAccountService.bulkAction(action, userIds, { roleCode });
    res.json({ results });
  } catch (err) {
    next(err);
  }
};

/**
 * Export accounts to CSV
 */
exports.exportAccountsCSV = async (req, res, next) => {
  try {
    const csv = await adminAccountService.exportAccountsCSV(req.query);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="accounts_${Date.now()}.csv"`);
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

/**
 * Get account statistics
 */
exports.stats = async (req, res, next) => {
  try {
    const stats = await adminAccountService.stats();
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

