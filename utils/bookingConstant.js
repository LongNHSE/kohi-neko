exports.bookingStatus = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  REFUND: 'refund',
};

exports.customerRefundPenalty = {
  MAX_TIME: 24 * 60 * 60 * 1000, // 24 hours
  PENALTY: 0.5,
};
