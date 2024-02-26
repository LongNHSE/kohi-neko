// const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const schedule = require('node-schedule');
const cors = require('cors');
const cookieSession = require('cookie-session');
const passport = require('passport');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

const bookingService = require('./services/bookingService');

const globalErrorHandler = require('./controllers/errorController');
const AppError = require('./utils/appError');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/userRouter');
const vnPayRouter = require('./routes/vnPayRouter');
const itemTypesRouter = require('./routes/itemTypeRouter');
const itemRouter = require('./routes/itemRouter');
const catRouter = require('./routes/catRouter');
const coffeeShopRouter = require('./routes/coffeeShopRouter');
const areaRouter = require('./routes/areaRouter');
const areaCatRouter = require('./routes/areaCatRouter');
const invoiceItemsRouter = require('./routes/invoiceItemsRouter');
const invoiceRouter = require('./routes/invoiceRouter');
const tableTypeRouter = require('./routes/tableTypeRouter');
const tableRouter = require('./routes/tableRouter');
const bookingRouter = require('./routes/bookingRouter');
const statusRouter = require('./routes/statusRouter');
const catStatus = require('./routes/catStatusRouter');
const authRouter = require('./routes/authRouter');
const packageRouter = require('./routes/packageRouter');
const packageSubscriptionRouter = require('./routes/packageSubscriptionRouter');
const uploadRouter = require('./routes/uploadRouter');
const testRouter = require('./routes/testRouter');

// const app = require('./app');

const app = express();

// view engine setup

app.use(cors());
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET],
    maxAge: 24 * 60 * 60 * 1000,
  }),
);
app.use(passport.initialize());
app.use(passport.session());

const cronExpress = '0,30 * * * *';
schedule.scheduleJob(cronExpress, () => {
  console.log('Cron job running');
  const newDate = new Date().getTime();
  console.log(new Date(newDate).toLocaleString());
  bookingService.updateAllBookingStatus();
});
app.use('/test', testRouter);
app.use('/', indexRouter);
app.use('/auth', authRouter.router);
app.use('/users', usersRouter);
app.use(itemRouter.path, itemRouter.router);
app.use(itemTypesRouter.path, itemTypesRouter.router);
app.use(coffeeShopRouter.path, coffeeShopRouter.router);
app.use(invoiceItemsRouter.path, invoiceItemsRouter.router);
app.use(invoiceRouter.path, invoiceRouter.router);
app.use(bookingRouter.path, bookingRouter.router);
app.use(authRouter.path, authRouter.router);
app.use(catRouter.router);
app.use(areaRouter.router);
app.use('/areaCats', areaCatRouter.router);
app.use('/tableTypes', tableTypeRouter.router);
app.use('/tables', tableRouter.router);
app.use('/statuses', statusRouter.router);
app.use('/catStatuses', catStatus.router);
app.use('/packages', packageRouter.router);
app.use('/packageSubscriptions', packageSubscriptionRouter.router);
app.use('/bookings', bookingRouter.router);
app.use('/image', uploadRouter.router);
app.use(vnPayRouter.path, vnPayRouter.router);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);
const { frontendURL } = require('./utils/urlConstant');

app.use(cors({ origin: frontendURL }));
app.use(express.json());

app.use((req, res, next) => {
  console.log('Hello from the middleware 👋');
  next();
});

app.route('/').get((req, res) => {
  res.send('Hello from the server side');
});
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
  .catch((err) => console.log(err));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});

module.exports = app;
