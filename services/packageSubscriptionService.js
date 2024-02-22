const packageSubscriptionModel = require('../models/packageSubscriptionModel');
const packageService = require('./packageService');
const coffeeShopService = require('./coffeeShopService');
const AppError = require('../utils/appError');

exports.getAllPackageSubscriptions = () =>
  packageSubscriptionModel.find({ isDeleted: false }).populate('packageId');

exports.getPackageSubscriptionById = (id) =>
  packageSubscriptionModel.findOne({ _id: id, isDeleted: false });

exports.createPackageSubscription = async (packageSubscription, user) => {
  const lastestSub = await packageSubscriptionModel
    .find({ isDeleted: false })
    .sort({ endTime: -1 })
    .limit(1);

  //check if package exists
  const package = await packageService.getPackageById(
    packageSubscription.packageId,
  );
  if (!package) throw new AppError('Package not found', 404);

  //check if user has a coffee shop
  const coffeeShop = await coffeeShopService.getCoffeeShopById(
    user.coffeeShopId,
  );
  if (!coffeeShop) throw new AppError('User has no coffee shop', 404);

  //startTime
  let startTime = Date.now();
  if (lastestSub.length > 0 && lastestSub[0].endTime > Date.now()) {
    startTime = lastestSub[0].endTime;
  }
  packageSubscription.startTime = startTime;

  //endTime
  const durationMilis = package.duration * 24 * 60 * 60 * 1000;
  packageSubscription.endTime = new Date();
  packageSubscription.endTime.setTime(
    packageSubscription.startTime.getTime() + durationMilis,
  );

  packageSubscription.coffeeShopId = user.coffeeShopId;
  return packageSubscriptionModel.create(packageSubscription);
};

exports.getCurrentPackageSubscriptionByCoffeeShopId = (coffeeShopId) =>
  packageSubscriptionModel.findOne({
    coffeeShopId,
    startTime: { $lte: Date.now() },
    endTime: { $gte: Date.now() },
    isDeleted: false,
  });

exports.updatePackageSubscription = (id, packageSubscription) =>
  packageSubscriptionModel.findByIdAndUpdate(id, packageSubscription, {
    new: true,
  });

exports.deletePackageSubscription = (id) =>
  packageSubscriptionModel.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  );

exports.getPackageSubscriptionByPackageId = (packageId) =>
  packageSubscriptionModel.findOne({
    packageId,
    isDeleted: false,
  });

exports.getAllPackageSubscriptionByCoffeeShopId = (coffeeShopId) =>
  packageSubscriptionModel
    .find({ coffeeShopId, isDeleted: false })
    .populate('packageId');

exports.getPackageSubscriptionByCoffeeShopIdAndPackageId = (
  packageId,
  coffeeShopId,
) =>
  packageSubscriptionModel.find({
    coffeeShopId,
    packageId,
    isDeleted: false,
  });
