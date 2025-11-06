const revenueService = require('../services/revenueService');

exports.getStats = async (req, res, next) => {
  try {
    const stats = await revenueService.getStats(req.query);
    res.json(stats);
  } catch (err) {
    next(err);
  }
};

exports.getDailyRevenue = async (req, res, next) => {
  try {
    const dailyRevenue = await revenueService.getDailyRevenue(req.query);
    res.json(dailyRevenue);
  } catch (err) {
    next(err);
  }
};

exports.getComparison = async (req, res, next) => {
  try {
    const comparison = await revenueService.getComparisonStats(req.query);
    res.json(comparison);
  } catch (err) {
    next(err);
  }
};

exports.getDetailed = async (req, res, next) => {
  try {
    const data = await revenueService.getDetailedRevenue(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getSettlement = async (req, res, next) => {
  try {
    const settlement = await revenueService.getSettlement(req.query);
    res.json(settlement);
  } catch (err) {
    next(err);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const data = await revenueService.getDetailedRevenue(req.query);
    const format = req.query.format || 'csv';
    
    if (format === 'csv') {
      // CSV export
      const headers = ['Order ID', 'Payment ID', 'Movie', 'Cinema', 'Screening Time', 'Tickets', 'Gross (VND)', 'Fee (VND)', 'Net (VND)', 'Method', 'Status', 'Source', 'Created At'];
      const rows = data.map(d => [
        d.orderId,
        d.paymentId,
        d.movie,
        d.cinema,
        d.screeningTime ? new Date(d.screeningTime).toLocaleString('vi-VN') : 'N/A',
        d.ticketCount,
        d.gross,
        d.fee,
        d.net,
        d.method,
        d.status,
        d.source,
        new Date(d.createdAt).toLocaleString('vi-VN')
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n');
      
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="revenue-report-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\ufeff' + csv); // BOM for Excel UTF-8
    } else if (format === 'json') {
      res.json(data);
    } else {
      res.status(400).json({ message: 'Unsupported format. Use csv or json' });
    }
  } catch (err) {
    next(err);
  }
};
