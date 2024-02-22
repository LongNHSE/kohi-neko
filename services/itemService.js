const Item = require('../models/itemModel');
const { filterObj } = require('../utils/util');
const { uploadImage } = require('../utils/firebaseDB');
const AppError = require('../utils/appError');
const CoffeeShop = require('../models/coffeeShopModel');

exports.saveItem = (item) => {
  const newItem = new Item(item);
  return newItem.save();
};
exports.getAllItems = () =>
  Item.find({ isDeleted: false }, { __v: 0, isDeleted: 0 }).populate(
    'itemTypeId',
  );

exports.deleteItemById = (id) =>
  Item.findByIdAndUpdate(id, { isDeleted: true }, { new: true });

exports.updateItemById = (id, item) => {
  const filteredBody = filterObj(
    item,
    'name',
    'price',
    'status',
    'description',
    'image',
  );
  return Item.findByIdAndUpdate(id, filteredBody, { new: true });
};

exports.getAllItemsByShopId = (shopId) =>
  CoffeeShop.findById(shopId)
    .populate({
      path: 'items',
      match: { isDeleted: false },
      select: '-__v -isDeleted -createdAt -updatedAt -coffeeShopId',
      populate: {
        path: 'itemTypeId',
        select: 'itemTypeName -_id',
      },
    })
    .select('items');

exports.addItemImages = async (id, images) => {
  const item = await Item.findById(id);
  console.log(item.images);
  if (!item) throw new AppError('Item not found', 404);
  const folder = `items/${id}`;
  if (images.images) {
    // eslint-disable-next-line node/no-unsupported-features/es-builtins
    const imageURLs = await Promise.allSettled(
      images.images.map((image) => uploadImage(image, folder)),
    );
    imageURLs.forEach((result) => {
      if (result.status === 'fulfilled') {
        item.images.push({ name: 'image', url: result.value });
      }
    });
  }
  await item.save({ validateBeforeSave: false });
  return item.images;
};
