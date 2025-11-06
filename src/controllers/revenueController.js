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

exports.getTopMovies = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const data = await revenueService.getTopMovies(req.query, limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.getRevenueByCinema = async (req, res, next) => {
  try {
    const data = await revenueService.getRevenueByCinema(req.query);
    res.json(data);
  } catch (err) {
    next(err);
  }
};

exports.exportReport = async (req, res, next) => {
  try {
    const data = await revenueService.getDetailedRevenue(req.query);
    const format = req.query.format || 'csv';
    
    if (format === 'csv') {
      // CSV export with detailed structure
      const headers = ['Ngày', 'Phim', 'Rạp', 'Vé bán', 'Gross (VND)', 'Fee (VND)', 'Net (VND)', 'Refund (VND)', 'Phương thức', 'Trạng thái', 'Nguồn', 'Order ID', 'Payment ID', 'Thời gian suất chiếu', 'Ngày tạo'];
      const rows = data.map(d => [
        d.date || new Date(d.createdAt).toISOString().split('T')[0],
        d.movie,
        d.cinema,
        d.ticketCount,
        d.gross,
        d.fee,
        d.net,
        d.status === 'REFUNDED' ? d.gross : 0,
        d.method,
        d.status,
        d.source,
        d.orderId,
        d.paymentId,
        d.screeningTime ? new Date(d.screeningTime).toLocaleString('vi-VN') : 'N/A',
        new Date(d.createdAt).toLocaleString('vi-VN')
      ]);
      
      const csv = [headers.join(','), ...rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
      
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
