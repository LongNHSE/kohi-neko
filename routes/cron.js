const router = require('express').Router();

router.get('/cron', (req, res) => {
  res.status(200).end('Hello Cron!');
});

module.exports = router;
