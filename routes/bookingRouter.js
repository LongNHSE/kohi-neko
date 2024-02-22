const express = require('express');
const bookingController = require('../controllers/bookingController');
const authMiddleware = require('../middlewares/authMiddleware');
const InvoiceRouter = require('./invoiceRouter');
const constant = require('../utils/constant');
const vnPayRouter = require('./vnPayRouter');

const router = express.Router({ mergeParams: true });

router
  .route('/')
  .post(authMiddleware.verifyToken, bookingController.createBooking)
  .get(bookingController.getAllBooking);
router.get(
  '/my',
  authMiddleware.verifyToken,
  authMiddleware.restrictTo(constant.CUSTOMER_ROLE),
  bookingController.getBookingByUserId,
);
router.patch('/booking-status/', bookingController.changeBookingStatus);
router.get(
  '/my/total',
  authMiddleware.verifyToken,
  bookingController.getTotalBookingByUserId,
);
router.route('/:id').get(bookingController.getBookingById);

router.route('/available-time').post(bookingController.getAllAvailableTime);
router.route('/day').get(bookingController.getAllBookingInDay);
router
  .route('/payment')
  .post(authMiddleware.verifyToken, bookingController.purchaseBooking);

router
  .route('/payment/:bookingId')
  .post(
    authMiddleware.verifyToken,
    bookingController.purchaseBookingByUserWallet,
  );

router.use('/:bookingId/vnpay', vnPayRouter.router);
router.use('/:bookingId/invoices', InvoiceRouter.router);
router.post(
  '/refund/:id',
  authMiddleware.verifyToken,
  authMiddleware.restrictTo(constant.CUSTOMER_ROLE),
  bookingController.refundBooking,
);

exports.router = router;
exports.path = '/bookings';
