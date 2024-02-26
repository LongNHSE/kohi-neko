const areaService = require('../services/areaService');
const catchAsync = require('../utils/catchAsync/catchAsync');
const { upload } = require('../utils/firebaseDB');
const ApiResponse = require('../dto/ApiResponse');

exports.getAllAreas = catchAsync(async (req, res) => {
  const { coffeeShopId } = req.params;
  const areas = await areaService.getAllAreas(coffeeShopId);
  res.send(ApiResponse.success('Get all areas successfully', areas));
});

exports.getAreaById = catchAsync(async (req, res) => {
  const { areaId } = req.params;
  const area = await areaService.getAreaById(areaId);
  if (!area) {
    res.status(404).send(new ApiResponse(404, 'Area not found', null));
  } else {
    res.send(ApiResponse.success('Get area by id successfully', area));
  }
});

exports.createArea = catchAsync(async (req, res) => {
  const area = await areaService.createArea(req.body);
  res.send(ApiResponse.success('Create area successfully', area));
});

exports.updateArea = catchAsync(async (req, res) => {
  const { areaId } = req.params;
  const updatedArea = await areaService.updateArea(areaId, req.body);
  if (!updatedArea) {
    res.status(404).send(new ApiResponse(404, 'Area not found', null));
  } else {
    res.send(ApiResponse.success('Update area successfully', updatedArea));
  }
});

exports.deleteArea = catchAsync(async (req, res) => {
  const { areaId } = req.params;
  const deletedArea = await areaService.deleteArea(areaId);
  if (!deletedArea) {
    res.status(404).send(new ApiResponse(404, 'Area not found', null));
  } else {
    res.send(ApiResponse.success('Delete area successfully', deletedArea));
  }
});

exports.addImage = [
  upload.single('image'),
  catchAsync(async (req, res) => {
    const { areaId } = req.params;
    const image = req.file;

    if (!image) {
      res.status(400).send(new ApiResponse(400, 'Image is required', null));
      return;
    }
    const updatedArea = await areaService.addImage(areaId, image);
    res.send(ApiResponse.success('Add image successfully', updatedArea));
  }),
];

exports.deleteImage = catchAsync(async (req, res) => {
  const { areaId, imageId } = req.params;
  const updatedCat = await areaService.deleteImage(areaId, imageId);
  res.send(new ApiResponse(200, 'Delete image successfully', updatedCat));
});

exports.getTableTypeInArea = catchAsync(async (req, res) => {
  const { areaId } = req.params;
  const tableTypes = await areaService.getTableTypesInArea(areaId);
  res.send(
    ApiResponse.success('Get table types in area successfully', tableTypes),
  );
});
