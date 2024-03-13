const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');
const app = require('./app');
const { frontendURL } = require('./utils/appConstant');
const bookingService = require('./services/bookingService');

app.use(cors({ origin: frontendURL }));
dotenv.config({ path: './config.env' });
const port = process.env.PORT || 8000;
// const DB = process.env.LOCAL_DATABASE_URI;
const DB = process.env.DATABASE_URI.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD,
);

mongoose
  .connect(DB)
  .then(() => console.log('DB connection successful!'))
  .then(async () => {
    await bookingService.updateAllBookingStatus();
  })
  .catch((err) => console.log(err));

// setInterval(async () => {
//   console.log('Job running');
//   const newDate = new Date().getTime();
//   console.log(new Date(newDate).toLocaleString());
//   await bookingService.updateAllBookingStatus();
// }, 5000);
// schedule.scheduleJob(cronExpress, async () => {
//   console.log('Cron job running');
//   const newDate = new Date().getTime();
//   console.log(new Date(newDate).toLocaleString());
//   await bookingService.updateAllBookingStatus();
// });
app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
