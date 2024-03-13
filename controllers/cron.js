const bookingService = require('../services/bookingService');

async function handler(req, res) {
  console.log('Cron job running');
  const newDate = new Date().getTime();
  console.log(new Date(newDate).toLocaleString());
  await bookingService.updateAllBookingStatus();
}

module.exports = handler;
