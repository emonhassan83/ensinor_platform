import catchAsync from '../../utils/catchAsync';
import httpStatus from 'http-status';
import sendResponse from '../../utils/sendResponse';
import { ReportsService } from './achievements.service';

const myAchievements = catchAsync(async (req, res) => {
  const result = await ReportsService.myAchievementsIntoDB(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My achievements retrieval successfully!',
    data: result,
  });
});

const earnBadges = catchAsync(async (req, res) => {
  const result = await ReportsService.earnBadgesIntoDB(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'My earn badges retrieval successfully!',
    data: result,
  });
});

const availableBadges = catchAsync(async (req, res) => {
  const result = await ReportsService.availableBadgesIntoDB(req.user!.userId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Available badges retrieval successfully!',
    data: result,
  });
});

const assignBadges = catchAsync(async (req, res) => {
  const result = await ReportsService.assignBadgesIntoDB(req.params.badgeId, req.body);

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
  assignBadges
};
