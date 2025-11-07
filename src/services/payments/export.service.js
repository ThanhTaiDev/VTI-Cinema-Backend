const prisma = require('../../prismaClient');
const { toCSV, generateFilename } = require('../../utils/csv');

/**
 * Export payments to CSV
 */
async function exportPayments(params = {}) {
  const {
    from,
    to,
    status,
    gateway,
    orderId,
    providerTxId,
  } = params;

  const where = {};

  // Date filter
  if (from || to) {
    where.createdAt = {};
    if (from) {
      where.createdAt.gte = new Date(from);
    }
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Gateway filter
  if (gateway) {
    where.gateway = gateway;
  }

  // Order ID filter
  if (orderId) {
    where.orderId = orderId;
  }

  // Provider transaction ID filter
  if (providerTxId) {
    where.providerTxId = { contains: providerTxId };
  }

  // Get all payments (no pagination for export)
  const payments = await prisma.payment.findMany({
    where,
    include: {
      order: {
        include: {
          screening: {
            include: {
              movie: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Define columns
  const columns = [
    { key: 'createdAt', label: 'Thời gian' },
    { key: 'orderId', label: 'Mã đơn hàng' },
    { key: 'gateway', label: 'Cổng thanh toán' },
    { key: 'method', label: 'Phương thức' },
    { key: 'providerTxId', label: 'Mã giao dịch' },
    { key: 'amount', label: 'Số tiền' },
    { key: 'fee', label: 'Phí' },
    { key: 'net', label: 'Thực nhận' },
    { key: 'currency', label: 'Tiền tệ' },
    { key: 'status', label: 'Trạng thái' },
    { key: 'movieTitle', label: 'Tên phim' },
  ];

  // Transform data for CSV
  const csvData = payments.map(payment => ({
    createdAt: new Date(payment.createdAt).toLocaleString('vi-VN'),
    orderId: payment.orderId,
    gateway: payment.gateway,
    method: payment.method || '',
    providerTxId: payment.providerTxId || '',
    amount: payment.amount.toLocaleString('vi-VN'),
    fee: payment.fee.toLocaleString('vi-VN'),
    net: payment.net.toLocaleString('vi-VN'),
    currency: payment.currency,
    status: payment.status,
    movieTitle: payment.order?.screening?.movie?.title || '',
  }));

  // Generate CSV
  const csv = toCSV(csvData, columns);
  const filename = generateFilename('payments');

  return {
    csv,
    filename,
    count: payments.length,
  };
}

module.exports = {
  exportPayments,
};

