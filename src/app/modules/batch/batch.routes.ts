import express from 'express';
import { BatchController } from './batch.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { BatchValidation } from './batch.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(BatchValidation.createValidationSchema),
  BatchController.insertIntoDB,
);

router.get('/', BatchController.getAllFromDB);

router.get('/:id', BatchController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(BatchValidation.updateValidationSchema),
  BatchController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), BatchController.deleteFromDB);

export const BatchRoutes = router;
