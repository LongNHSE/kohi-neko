const CoffeeShop = require('../models/coffeeShopModel');
const { filterObj, changeDayNumberToDayString } = require('../utils/util');
const { uploadImage } = require('../utils/firebaseDB');
const AppError = require('../utils/appError');
const userService = require('./userService');
const constant = require('../utils/constant');
const User = require('../models/userModel');

exports.saveCoffeeShop = async (managerId, coffeeShop) => {
  const manager = await userService.findOne({ _id: managerId });
  if (!manager) throw new AppError('User not found', 400);
  if (manager.role !== constant.SHOP_MANAGER) {
    throw new AppError('User is not a manager', 400);
  }
  if (manager.coffeeShopId) {
    const previousCoffeeShop = await CoffeeShop.findOne({
      _id: manager.coffeeShopId,
    });
    if (previousCoffeeShop)
      throw new AppError('User already has a coffee shop', 400);
  }
  const newCoffeeShop = await CoffeeShop.create(coffeeShop);
  manager.coffeeShopId = newCoffeeShop._id;
  await User.findByIdAndUpdate(managerId, { coffeeShopId: newCoffeeShop._id });
  return newCoffeeShop;
};
exports.getAllCoffeeShops = (page, sort, keyword, perPage) =>
  CoffeeShop.find({
    $or: [{ shopName: { $regex: keyword, $options: 'i' } }],
  })
    .skip((page - 1) * perPage)
    .limit(perPage)
    .sort(sort);
exports.getCoffeeShopById = (id) => CoffeeShop.findById(id);
exports.getCoffeeShopByUserId = async (userId) => {
  const user = await userService.getUserById(userId);
  if (!user.coffeeShopId) {
    throw new AppError('User has no coffee shop', 404);
  }
  return this.getCoffeeShopById(user.coffeeShopId);
};
exports.deleteCoffeeShopById = async (id) => {
  const deletedCoffeeShop = await CoffeeShop.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );
  const manager = await userService.findOne({ coffeeShopId: id });
  manager.coffeeShopId = null;
  await manager.save();
  return deletedCoffeeShop;
};
exports.addItemToCoffeeShop = (id, item) =>
  CoffeeShop.findByIdAndUpdate(id, { $push: { items: item } }, { new: true });
exports.deleteItemFromCoffeeShop = (id, itemId) =>
  CoffeeShop.findByIdAndUpdate(id, { $pull: { items: itemId } }, { new: true });
exports.getOpenTimeAndCloseTime = (id) =>
  CoffeeShop.findById(id, { openTime: 1, closeTime: 1 });
exports.updateCoffeeShopById = (id, coffeeShop) => {
  const filterCoffeeShop = filterObj(
    coffeeShop,
    'shopName',
    'address',
    'contact',
    'images',
    'openTime',
    'description',
    'status',
  );
  return CoffeeShop.findByIdAndUpdate(id, filterCoffeeShop, { new: true });
};

exports.isChildAllow = async (id) => {
  const coffeeShop = await CoffeeShop.findById(id);
  return coffeeShop.isChildAllow;
};

exports.addImages = async (id, images) => {
  if (!images) throw new AppError('images is undefined', 400);
  const coffeeShop = await CoffeeShop.findById(id);
  if (!coffeeShop) throw new AppError('Coffee shop not found', 404);
  const folder = `coffeeShops/${id}`;
  if (images.images) {
    // eslint-disable-next-line node/no-unsupported-features/es-builtins
    const imageURLs = await Promise.allSettled(
      images.images.map((image) => uploadImage(image, folder)),
    );
    imageURLs.forEach((result) => {
      if (result.status === 'fulfilled') {
        coffeeShop.images.push({ name: 'image', url: result.value });
      }
    });
  }
  if (images.placeholder) {
    const imageURL = await uploadImage(images.placeholder[0], folder);
    coffeeShop.images.push({ name: 'placeholder', url: imageURL });
  }
  await coffeeShop.save();
  return coffeeShop.images;
};

exports.deleteImages = async (id, imageIds) => {
  const coffeeShop = await CoffeeShop.findById(id);
  if (!coffeeShop) throw new AppError('Coffee shop not found', 404);
  imageIds.forEach((imageId) => {
    coffeeShop.images.pull(imageId);
  });
  coffeeShop.save();
  return coffeeShop.images;
};

exports.getCoffeeShopOpenTimeAndCloseTime = async (id, date) => {
  const day = changeDayNumberToDayString(new Date(date).getDay());
  console.log(day, date, id, 'day');
  return CoffeeShop.findOne(
    { _id: id },
    { openTime: { $elemMatch: { day: day } } },
  );
};

exports.getTotalCoffeeShops = (keyword) =>
  CoffeeShop.countDocuments({
    $or: [{ shopName: { $regex: keyword, $options: 'i' } }],
  });
