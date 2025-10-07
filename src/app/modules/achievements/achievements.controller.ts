import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { ReportsService } from './achievements.service';
import pick from '../../utils/pick';
import {
  courseSearchableFields,
  studentSearchableFields,
} from './achievements.constant';

const myAchievements = catchAsync(async (req, res) => {
  const filters = pick(req.query, studentSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.myAchievementsIntoDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My achievements retrieval successfully!',
    data: result,
  });
});

const earnBadges = catchAsync(async (req, res) => {
  const filters = pick(req.query, courseSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.earnBadgesIntoDB(filters, options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My earn badges retrieval successfully!',
    meta: result.meta,
    data: result.data,
  });
});

const availableBadges = catchAsync(async (req, res) => {
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);
  const result = await ReportsService.availableBadgesIntoDB(options);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Available badges retrieval successfully!',
    data: result,
  });
});

export const AchievementsController = {
  myAchievements,
  earnBadges,
  availableBadges,
};
