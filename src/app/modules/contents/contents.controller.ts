import { Request, Response } from 'express';
import catchAsync from '../../utils/catchAsync';
import { contentsService } from './contents.service';
import sendResponse from '../../utils/sendResponse';
import pick from '../../utils/pick';
import { contentSearchableFields } from './contents.constants';

const createContents = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.createContents(req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content created successfully',
    data: result,
  });
});

// Get all contents
const getAllContents = catchAsync(async (req: Request, res: Response) => {
  const filters = pick(req.query, contentSearchableFields);
  const options = pick(req.query, ['limit', 'page', 'sortBy', 'sortOrder']);

  const result = await contentsService.getAllContents(filters, options);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Contents retrieved successfully',
    meta: result.meta,
    data: result.data,
  });
});

// Get contents by ID
const getContentsById = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.getContentsById(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content retrieved successfully',
    data: result,
  });
});

// Update contents
const updateContents = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.updateContents(req.params.id, req.body);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content updated successfully',
    data: result,
  });
});

// Delete contents
const deleteContents = catchAsync(async (req: Request, res: Response) => {
  const result = await contentsService.deleteContents(req.params.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: 'Content deleted successfully',
    data: result,
  });
});

export const contentsController = {
  createContents,
  getAllContents,
  getContentsById,
  updateContents,
  deleteContents,
};
