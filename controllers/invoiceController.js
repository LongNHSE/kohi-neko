const InvoiceService = require('../services/invoiceService');
const catchAsync = require('../utils/catchAsync/catchAsync');
const ApiResponse = require('../dto/ApiResponse');
const BookingService = require('../services/bookingService');

// create invoice
exports.createInvoice = catchAsync(async (req, res) => {
  // console.log(req.params, req.body);
  // console.log(req.params, req.body, req.user);
  const { bookingId, coffeeShopId } = req.params;
  const invoice = req.body;
  invoice.userId = req.user._id;
  invoice.coffeeShopId = coffeeShopId;
  invoice.bookingId = bookingId;

  const invoiceResult = await InvoiceService.createInvoice(invoice);
  if (invoiceResult) {
    await BookingService.updateInvoiceBooking(invoiceResult);
  }
  res
    .status(201)
    .send(ApiResponse.success('Create invoice successfully', invoiceResult));
});

// get invoice by booking ids
exports.getInvoiceByBookingIds = catchAsync(async (req, res) => {
  console.log(req.params.bookingId);
  const invoice = await InvoiceService.getInvoiceByBookingIds(
    req.params.bookingId,
  );
  res
    .status(200)
    .send(ApiResponse.success('Get invoice successfully', invoice));
});
exports.getAllInvoices = catchAsync(async (req, res) => {
  const invoices = await InvoiceService.getAllInvoices();
  res
    .status(200)
    .send(ApiResponse.success('Get all invoices successfully', invoices));
});

exports.getInvoiceById = catchAsync(async (req, res) => {
  const invoice = await InvoiceService.getInvoiceById(req.params.id);
  res
    .status(200)
    .send(ApiResponse.success('Get invoice successfully', invoice));
});

exports.purchaseInvoices = catchAsync(async (req, res) => {
  const { bookingId, coffeeShopId } = req.params;
  const invoice = req.body;
  invoice.userId = req.user._id;
  invoice.coffeeShopId = coffeeShopId;
  invoice.bookingId = bookingId;
  invoice.status = 'paid';

  const invoiceResult = await InvoiceService.createInvoice(invoice);
  if (invoiceResult) {
    await BookingService.updateInvoiceBooking(invoiceResult);
  }
  res
    .status(201)
    .send(ApiResponse.success('Create invoice successfully', invoiceResult));
});
