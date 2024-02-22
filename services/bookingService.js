const mongoose = require('mongoose');
const BookingModel = require('../models/bookingModel');
const AppError = require('../utils/appError');
const vnpayController = require('../controllers/vnPayController');
const constants = require('../utils/constant');
const userService = require('./userService');
const {
  bookingStatus,
  customerRefundPenalty,
} = require('../utils/bookingConstant');
const { error } = require('../dto/ApiResponse');
// const TableModel = require('../models/tableModel');
// const catchAsync = require('../utils/catchAsync/catchAsync');

// exports.bookedTableInTime = catchAsync(
//   async (tableTypeId, startTime, endTime) => {
//     const numberOfTable = await TableModel.countDocuments({
//       tableType: tableTypeId,
//     });
//   },
// );
exports.createBooking = (bookingModel) => BookingModel.create(bookingModel);
exports.updateInvoiceBooking = (invoice) =>
  BookingModel.findByIdAndUpdate(
    { _id: invoice.bookingId },
    { $push: { invoices: invoice } },
    { new: true },
  );

exports.getAllBookingInDate = (startTime, endTime) =>
  BookingModel.find({
    $or: [
      { startTime: { $gte: startTime, $lte: endTime } },
      { endTime: { $gte: startTime, $lte: endTime } },
    ],
  });
exports.getAllBooking = () => BookingModel.find({}).populate('invoices');

exports.getAllBookingInDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return BookingModel.find({
    startTime: { $gte: start, $lte: end },
  });
};

exports.getBookingById = (id) =>
  BookingModel.findById(id)
    .populate({
      path: 'invoices',
      populate: {
        path: 'invoiceItems',
        populate: { path: 'itemId', select: 'name -_id' },
      },
      select: 'invoiceItems totalPrice',
    })
    .populate({
      path: 'tableId',
      populate: [
        { path: 'tableTypeId', select: 'name -_id' },
        { path: 'areaId', select: 'name -_id' },
      ],
      select: 'tableTypeId areaId -_id ', // select tableTypeId from tableId
    })
    .populate('coffeeShopId', 'shopName address -_id')
    .select('-__v -updatedAt -createdAt -isDeleted');

exports.getBookingByUserId = (userId, page, perPage, status, sort) => {
  let query = { customerId: userId };
  if (status !== '') {
    query = {
      $and: [{ customerId: userId }, { status: { $ne: 'unpaid' }, status }],
    };
  } else {
    query.status = { $ne: 'unpaid' };
  }
  if (sort === 'asc') {
    return BookingModel.find(query)
      .populate('coffeeShopId', '-_id shopName images address')
      .populate({
        path: 'tableId',
        populate: [
          { path: 'tableTypeId', select: 'name -_id' },
          { path: 'areaId', select: 'name -_id' },
        ],
        select: 'tableTypeId areaId -_id ', // select tableTypeId from tableId
      })
      .populate({
        path: 'invoices',
        populate: {
          path: 'invoiceItems',
          populate: { path: 'itemId', select: 'name images -_id' },
        },
        select: 'invoiceItems totalPrice',
      })
      .sort({ startTime: 1 })
      .skip((page - 1) * perPage)
      .limit(perPage);
  }

  return BookingModel.find(query)
    .populate('coffeeShopId', '-_id shopName images address')
    .populate({
      path: 'tableId',
      populate: [
        { path: 'tableTypeId', select: 'name -_id' },
        { path: 'areaId', select: 'name -_id' },
      ],
      select: 'tableTypeId areaId -_id ', // select tableTypeId from tableId
    })
    .populate({
      path: 'invoices',
      populate: {
        path: 'invoiceItems',
        populate: { path: 'itemId', select: 'name images -_id' },
      },
      select: 'invoiceItems totalPrice',
    })
    .sort({ startTime: -1 })
    .skip((page - 1) * perPage)
    .limit(perPage);
};

exports.updateStatus = (id, status) =>
  BookingModel.findByIdAndUpdate(id, { status }, { new: true });

const handleRefund = async (bookingId, userId, refundAmount) => {
  const booking = await BookingModel.findById(bookingId).populate('invoices');
  if (!booking) throw new AppError('Booking not found', 404);
  booking.status = bookingStatus.REFUND;
  booking.refundMakerId = userId;
  booking.refundAmount = refundAmount;
  const user = await userService.findOne({ _id: userId });
  if (!user) throw new AppError('User not found', 404);
  const { invoices } = booking;

  const session = await mongoose.startSession();
  session.startTransaction();
  //update booking status to refund
  try {
    await Promise.all(
      invoices.map(async (invoice) => {
        invoice.status = bookingStatus.REFUND;
        await invoice.save();
      }),
    );

    //plus refund amount to user wallet
    const oldWallet = user.wallet;
    user.wallet += refundAmount;
    await userService.updateUser(user._id, user);

    session.endSession();
    await booking.save();
    return {
      refundMakerId: user._id,
      bookingCustomerId: booking.customerId,
      refundAmount: refundAmount,
      oldWallet: oldWallet,
      wallet: user.wallet,
      bookingId: booking._id,
      bookingStatus: booking.status,
    };
  } catch (err) {
    console.log(err);
    await session.abortTransaction();
    session.endSession();
    throw new AppError(`Refund failed: ${error.message}`, 500);
  } finally {
    session.endSession();
  }
};

const getRefundAmount = async (booking, user) => {
  const now = new Date();
  const differ = booking.startTime - now;
  if (differ < 0)
    throw new AppError(
      `Refund duration expired: Your booking since ${booking.startTime}`,
      400,
    );

  const { invoices } = booking;
  let total = booking.price;
  //if refund maker is user and booking time is less than 24 hours, then refund 50% of booking total amount
  if (
    user.role === constants.CUSTOMER_ROLE &&
    differ < customerRefundPenalty.MAX_TIME
  )
    total *= customerRefundPenalty.PENALTY;
  invoices.forEach((invoice) => {
    total += invoice.totalPrice;
  });
  return total;
};

const isBookingOwnerOrShopManager = async (bookingId, user) => {
  const booking = await BookingModel.findById(bookingId);
  if (!booking) throw new AppError('Booking not found', 404);
  if (user.role === constants.ADMIN_ROLE) return true;
  if (
    user.role === constants.SHOP_MANAGER ||
    user.role === constants.STAFF_ROLE
  )
    return booking.coffeeShopId === user.shopId;
  return booking.customerId === user._id;
};

exports.refundBooking = async (id, req) => {
  const booking = await BookingModel.findById(id).populate('invoices');
  if (!booking) throw new AppError('Booking not found', 404);
  if (!isBookingOwnerOrShopManager(id, req.user))
    throw new AppError('You are not the owner of this booking', 403);
  if (booking.status === bookingStatus.REFUND)
    throw new AppError('Booking already refunded', 400);
  const refundAmount = await getRefundAmount(booking, req.user);
  const vnPayResponse = await vnpayController.createRefundUrl(
    req,
    id,
    refundAmount,
  );
  console.log(vnPayResponse.status);
  return handleRefund(id, req.user._id, refundAmount);
};

exports.getTotalBookingByUserId = (userId, status) => {
  const query = { customerId: userId };
  if (status !== '') {
    query.status = status;
  }
  query.status = { $ne: 'unpaid' };

  return BookingModel.countDocuments(query);
};

exports.removeBooking = (id) => BookingModel.findByIdAndDelete(id);
