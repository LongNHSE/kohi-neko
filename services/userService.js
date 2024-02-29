const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const constant = require('../utils/constant');
const { sendEmail } = require('../utils/email');
const AppError = require('../utils/appError');
const coffeeShopService = require('./coffeeShopService');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) {
      newObj[el] = obj[el];
    }
  });
  return newObj;
};

const generateAccessToken = (user) =>
  jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, res) => {
  const token = generateAccessToken(user);
  return token;
};

exports.findOne = (query) => User.findOne(query);

exports.findOneWithHashedToken = (resetToken) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  const user = User.findOne({
    passwordResetToken: hashedToken,
    passwordResetTokenExpires: { $gt: Date.now() },
  });
  return user;
};

exports.checkDuplicate = async (user) => {
  const duplicateFields = [];

  const userWithSameUsernameOrEmailOrPhone = await User.findOne({
    $or: [
      { username: { $regex: new RegExp(`^${user.username}$`, 'i') } },
      { email: { $regex: new RegExp(`^${user.email}$`, 'i') } },
      { phoneNumber: user.phoneNumber }, // assuming phone number is not case-sensitive
    ],
  });

  if (userWithSameUsernameOrEmailOrPhone) {
    if (user.username === userWithSameUsernameOrEmailOrPhone.username) {
      duplicateFields.push('username');
    }
    if (user.email === userWithSameUsernameOrEmailOrPhone.email) {
      duplicateFields.push('email');
    }
    if (user.phoneNumber === userWithSameUsernameOrEmailOrPhone.phoneNumber) {
      duplicateFields.push('phoneNumber');
    }
  }

  return duplicateFields;
};

exports.createUser = (user) => {
  if (user.role === constant.STAFF_ROLE) {
    if (!user.coffeeShopId) {
      throw new Error('Manager/Staff should have a correct shopId');
    }
  } else {
    user.coffeeShopId = null;
  }
  return User.create(user);
};
exports.getAllUsers = () => User.find();

exports.login = async (username, password) => {
  const user = await User.findOne({ username }).select('+password');
  if (!user || !(await user.comparePassword(password, user.password))) {
    return null;
  }
  return user;
};

exports.generateAccessToken = (user) =>
  jwt.sign({ userId: user._id }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

exports.forgotPassword = async (email, protocol, host) => {
  const user = await User.findOne({ email });
  if (!user) {
    return null;
  }
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });
  const resetURL = `${protocol}://${host}/resetPassword/${resetToken}`;
  console.log(resetURL);
  const message = `Forgot your password? Submit a PATCH request with your new password and passwordConfirm to: ${resetURL}.\nIf you didn't forget your password, please ignore this email!`;

  try {
    await sendEmail({
      email: user.email,
      subject: 'Your password reset token (valid for 10 min)',
      message,
    });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpires = undefined;
    await user.save({ validateBeforeSave: false });
    return null;
  }
  return resetToken;
};

exports.resetPassword = async (password, passwordConfirm, user) => {
  user.password = password;
  user.passwordResetToken = undefined;
  user.passwordConfirm = passwordConfirm;
  user.passwordResetTokenExpires = undefined;

  return user.save();
};

exports.updatePassword = async (
  user,
  password,
  passwordConfirm,
  passwordCurrent,
) => {
  const freshUser = await User.findById(user._id).select('+password');
  if (!freshUser) {
    return null;
  }
  if (!(await freshUser.comparePassword(passwordCurrent, freshUser.password))) {
    return null;
  }
  freshUser.password = password;
  freshUser.passwordConfirm = passwordConfirm;
  await freshUser.save();
  const token = createSendToken(freshUser, 200);
  return { token, user: freshUser };
};

exports.updateUser = async (id, data) => {
  // const filteredBody = filterObj(data, 'firstName', 'lastName', 'wallet');
  // console.log(filteredBody);
  console.log(id, 'id');
  const freshUser = await User.findByIdAndUpdate({ _id: id }, data, {
    new: true,
    runValidators: true,
  });
  console.log(freshUser, 'freshUser');
  return freshUser;
};

exports.getUserById = (id) => User.findById(id);

exports.deleteUser = (id) => User.findByIdAndUpdate(id, { isDeleted: true });

//manager
exports.getAllManagers = () => User.find({ role: constant.SHOP_MANAGER });
exports.getManagerByShopId = (shopId) =>
  User.findOne({ role: constant.SHOP_MANAGER, coffeeShopId: shopId });

//staff
exports.getAllStaffs = () => User.find({ role: 'staff' });
exports.getAllStaffsByShopId = (shopId) =>
  User.find({ role: constant.STAFF_ROLE, coffeeShopId: shopId });
exports.managerInviteStaff = async (managerId, email) => {
  const manager = await User.findById(managerId);
  if (!manager) {
    throw new AppError('Manager not found', 400);
  }
  const coffeeShop = coffeeShopService.getCoffeeShopByUserId(managerId);
  if (!coffeeShop) {
    throw new AppError('Coffee shop not found', 400);
  }
  let imgUrl = coffeeShop.images[0].url;
  if (!imgUrl) {
    imgUrl = 'https://via.placeholder.com/150';
  }
  const htmlContent = `
      <h1 style="color: #6B240C; font-size: 24px;">${manager.firstName} invite you to his/her cat coffee shop</h1>
      <h1 style="color: #6B240C; font-size: 20px;">Shop name: ${coffeeShop.shopName}</h1>
      <img src="${imgUrl}" alt="coffee shop image" />
      <p style="color: #F5CCA0; font-size: 16px;">Please click the button below to join as staff.</p>
      <a href="http://your-register-page-url" style="background-color: #994D1C; color: white; padding: 15px 32px; text-align: center; text-decoration: none; display: inline-block; font-size: 16px; margin: 4px 2px; cursor: pointer;">Join Shop</a>
    `;
  try {
    const result = await sendEmail({
      email: email,
      subject: `${manager.firstName} invite you to join ${coffeeShop.shopName}`,
      html: htmlContent,
    });
    return result;
  } catch (error) {
    console.error(error);
    throw new AppError(`Send email failed due to :${error}`, 200);
  }
};

exports.getUserWallet = async (userId) => {
  const users = await User.findOne({ _id: userId }, 'wallet');
  return users;
};
