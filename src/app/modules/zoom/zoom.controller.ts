import { ZoomService } from './zoom.service';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import pick from '../../utils/pick';
import sendResponse from '../../utils/sendResponse';

// Connect Zoom Account
const connectZoom = catchAsync(async (req, res) => {
  const result = await ZoomService.connectZoomAccount(req.body)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom account connected successfully!',
    data: result,
  })
})

// Refresh Token
const refreshToken = catchAsync(async (req, res) => {
  const result = await ZoomService.refreshAccessToken(req.body.userId)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom access token refreshed!',
    data: result,
  })
})

// Create Meeting
const createMeeting = catchAsync(async (req, res) => {
  const result = await ZoomService.createMeeting(req.body)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom meeting created!',
    data: result,
  })
})

// Get All Meetings
const getMeetings = catchAsync(async (req, res) => {
  const result = await ZoomService.getMeetings(req.query.userId as string)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom meetings fetched!',
    data: result,
  })
})

// Get Single Meeting
const getMeeting = catchAsync(async (req, res) => {
  const result = await ZoomService.getMeeting(req.params.id)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom meeting fetched!',
    data: result,
  })
})

// Update Meeting
const updateMeeting = catchAsync(async (req, res) => {
  const result = await ZoomService.updateMeeting(req.params.id, req.body)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom meeting updated!',
    data: result,
  })
})

// Delete Meeting
const deleteMeeting = catchAsync(async (req, res) => {
  const result = await ZoomService.deleteMeeting(req.params.id)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom meeting deleted!',
    data: result,
  })
})

// Sync Meetings
const syncMeetings = catchAsync(async (req, res) => {
  const result = await ZoomService.syncMeetings(req.body.userId)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Zoom meetings synced!',
    data: result,
  })
})

export const ZoomController = {
  connectZoom,
  refreshToken,
  createMeeting,
  getMeetings,
  getMeeting,
  updateMeeting,
  deleteMeeting,
  syncMeetings
};
