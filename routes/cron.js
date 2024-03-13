const router = require('express').Router();
const bookingService = require('../services/bookingService');

router.get('/cron', async (req, res) => {
  console.log('Cron job running');
  const newDate = new Date().getTime();
  console.log(new Date(newDate).toLocaleString());
  await bookingService.updateAllBookingStatus();
  res.status(200).end('Cron job running');
});

module.exports = router;
