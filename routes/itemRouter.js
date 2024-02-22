const express = require('express');

const itemRouter = express.Router({ mergeParams: true });
const itemController = require('../controllers/itemController');

// itemRouter
//   .route('/')
//   .get(itemController.getAllItems)
//   .post(itemController.saveItem);

itemRouter
  .route('/:id')
  .get(itemController.getItemById)
  .delete(itemController.deleteItem)
  .patch(itemController.updateItem);

itemRouter.route('/:id/images').post(itemController.addImage);

itemRouter
  .route('/')
  .get(itemController.getAllItemByShopId)
  .post(itemController.saveItem);

exports.path = '/items';
exports.router = itemRouter;
