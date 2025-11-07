const paymentService = require('./payment.service');
const exportService = require('./export.service');
const { validateListPayments } = require('../../middlewares/validate');

/**
 * List payments
 */
async function listPayments(req, res, next) {
  try {
    const params = {
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      gateway: req.query.gateway,
      orderId: req.query.orderId,
      providerTxId: req.query.providerTxId,
      page: parseInt(req.query.page) || 1,
      pageSize: parseInt(req.query.pageSize) || 20,
    };

    const result = await paymentService.listPayments(params);
    res.json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Get payment detail
 */
async function getPaymentDetail(req, res, next) {
  try {
    const payment = await paymentService.getPaymentById(req.params.id);
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    res.json(payment);
  } catch (error) {
    next(error);
  }
}

/**
 * Initialize payment
 */
async function initPayment(req, res, next) {
  try {
    const { orderId, method } = req.body;
    const userId = req.user.id;

    const result = await paymentService.initPayment({
      orderId,
      userId,
      method,
    });

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * Export payments to CSV
 */
async function exportCSV(req, res, next) {
  try {
    const params = {
      from: req.query.from,
      to: req.query.to,
      status: req.query.status,
      gateway: req.query.gateway,
      orderId: req.query.orderId,
      providerTxId: req.query.providerTxId,
    };

    const result = await exportService.exportPayments(params);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.csv);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listPayments,
  getPaymentDetail,
  initPayment,
  exportCSV,
};

