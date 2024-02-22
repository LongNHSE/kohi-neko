const { areaCatModel } = require('../models/areaCatModel');
const catModel = require('../models/catModel');

exports.getAllAreaCats = () => areaCatModel.find().populate('areaId');

exports.searchAreaCat = (areaId, catId) => {
  if (!areaId)
    return areaCatModel
      .find({ catId })
      .populate('areaId')
      .populate('catId')
      .sort({ startTime: -1 });
  if (!catId)
    return areaCatModel
      .find({ areaId })
      .populate('areaId')
      .populate('catId')
      .sort({ startTime: -1 });
  return areaCatModel
    .find({ $and: [{ areaId }, { catId }] })
    .populate('areaId')
    .sort({ startTime: -1 });
};

exports.getAreaCatByAreaIdNow = (areaId) => {
  const now = Date.now();
  return areaCatModel
    .find({
      $and: [
        { 'areaCats.areaId': areaId },
        {
          'areaCats.isDeleted': false,
        },
        { 'areaCats.startTime': { $lte: now } },
        {
          $or: [
            { 'areaCats.endTime': { $gte: now } },
            { 'areaCats.endTime': null },
          ],
        },
      ],
    })
    .populate('areaId');
};

exports.getAreaCatByCatIdNow = (catId) => {
  const now = Date.now();
  return areaCatModel
    .find({
      $and: [
        { 'areaCats.catId': catId },
        {
          'areaCats.isDeleted': false,
        },
        { 'areaCats.startTime': { $lte: now } },
        {
          $or: [
            { 'areaCats.endTime': { $gte: now } },
            { 'areaCats.endTime': null },
          ],
        },
      ],
    })
    .populate('areaId');
};

exports.createAreaCat = async (areaCat) => {
  if (areaCat.startTime === null) areaCat.startTime = Date.now();

  const lastAreaCat = await areaCatModel
    .findOne({ catId: areaCat.catId })
    .sort({ startTime: -1 });
  if (lastAreaCat && !lastAreaCat.endTime) {
    lastAreaCat.endTime = areaCat.startTime;
    lastAreaCat.save();
    console.log('lastAreaCat', lastAreaCat);
  }

  const creatingAreaCat = await areaCatModel.create(areaCat);
  if (creatingAreaCat) {
    const cat = await catModel.findByIdAndUpdate(
      areaCat.catId,
      {
        $push: {
          areaCats: creatingAreaCat._id,
        },
      },
      { new: true },
    );
    console.log(cat);
  }
  return creatingAreaCat;
};
