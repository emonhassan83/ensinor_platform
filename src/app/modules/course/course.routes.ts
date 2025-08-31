import express from 'express';
import { CourseController } from './course.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { CourseValidation } from './course.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(CourseValidation.createValidationSchema),
  CourseController.insertIntoDB,
);

router.get('/', CourseController.getAllFromDB);

router.get(
  '/my-Course',
  auth(UserRole.super_admin),
  CourseController.getMyCourseFromDB,
);

router.get('/:id', CourseController.getByIdFromDB);

router.put(
  '/:id',
  auth(UserRole.super_admin),
   upload.single('image'),
  parseData(),
  validateRequest(CourseValidation.updateValidationSchema),
  CourseController.updateIntoDB,
);

router.delete('/:id', auth(UserRole.super_admin), CourseController.deleteFromDB);

export const CourseRoutes = router;
