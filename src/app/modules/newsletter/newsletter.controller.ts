import { Request, Response } from 'express';
import httpStatus from 'http-status';
import catchAsync from '../../utils/catchAsync';
import sendResponse from '../../utils/sendResponse';
import { NewsletterServices } from './newsletter.service';
import { newsletterFilterableFields } from './newsletter.constant';
import pick from '../../utils/pick';

const subscribeUser = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.subscribeUser(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter subscribe successfully!',
    data: result,
  });
});

const unsubscribeUser = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.unsubscribeUser(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter unsubscribe successfully!',
    data: result,
  });
});

const getAllSubscribeUser = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, newsletterFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await NewsletterServices.getAllSubscribeFromDB(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter subscriber retrieve successfully!',
    data: result,
  });
});

const changeStatusIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.changeStatusIntoDB(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter subscriber status changed successfully!',
    data: result,
  });
});

const insertIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.insertIntoDB(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter created successfully!',
    data: result,
  });
});

const getAllFromDB = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, newsletterFilterableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await NewsletterServices.getAllFromDB(filters, options);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter retrieval successfully',
    meta: result.meta,
    data: result.data,
  });
});

const getByIdFromDB = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.getByIdFromDB(req.params.id)
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter fetched successfully',
    data: result,
  })
})

const updateIntoDB = catchAsync(async (req: Request, res: Response) => {
  const result = await NewsletterServices.updateIntoDB(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Newsletter data updated successfully!',
    data: result,
  });
});

const deleteFromDB = catchAsync(async (req, res) => {
  const result = await NewsletterServices.deleteFromDB(req.params.id)

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: 'Newsletter delete successfully!',
    data: result,
  })
})

export const NewsletterController = {
  subscribeUser,
  unsubscribeUser,
  getAllSubscribeUser,
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  changeStatusIntoDB,
  deleteFromDB
};
