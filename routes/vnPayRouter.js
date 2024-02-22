const express = require('express');

const vnPayRouter = express.Router({ mergeParams: true });
const vnPayController = require('../controllers/vnPayController');

vnPayRouter.route('/').post(vnPayController.createPaymentUrl);
// vnPayRouter.route('/vnpay_ipn').get(vnPayController.ipn);
vnPayRouter.route('/return').post(vnPayController.vnpay_return);

exports.path = '/vnPay';
exports.router = vnPayRouter;
