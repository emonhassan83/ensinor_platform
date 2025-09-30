import { WishlistService } from './wishlist.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';
import { wishlistFilterableFields } from './wishlist.constant';

const insertIntoDB = catchAsync(async (req, res) => {
  const result = await WishlistService.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlist insert successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, wishlistFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await WishlistService.getAllFromDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlists data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getAllByUserFromDB = catchAsync(async (req, res) => {
  const filters = pick(req.query, wishlistFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await WishlistService.getAllFromDB(filters, options, req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlists data fetched!',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req, res) => {
  const result = await WishlistService.getByIdFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlist data fetched by id!',
    data: result,
  });
});

const updateIntoDB = catchAsync(async (req, res) => {
  const result = await WishlistService.updateIntoDB(
    req.params.id,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlist data updated!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await WishlistService.deleteFromDB(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlist data deleted!',
    data: result,
  });
});

const deleteByReferenceFromDB = catchAsync(async (req, res) => {
  const { courseId, bookId, courseBundleId } = req.body; // better in body for optional params
  const userId = req.user!.userId; // get from logged-in user

  const result = await WishlistService.deleteByReferenceFromDB({
    userId,
    courseId,
    bookId,
    courseBundleId,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Wishlist entry deleted successfully!',
    data: result,
  });
});

export const WishlistController = {
  insertIntoDB,
  getAllFromDB,
  getAllByUserFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
  deleteByReferenceFromDB
};
