import express from 'express';
import { BusinessInstructorController } from './businessInstructor.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { BusinessInstructorValidation } from './businessInstructor.validation';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.get(
  '/',
  auth(UserRole.company_admin),
  BusinessInstructorController.getAllFromDB,
);

router.get(
  '/:id',
  auth(UserRole.company_admin),
  BusinessInstructorController.getByIdFromDB,
);

router.put(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
  ),
  upload.single('image'),
  parseData(),
  validateRequest(BusinessInstructorValidation.updateValidationSchema),
  BusinessInstructorController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.company_admin,
    UserRole.business_instructors,
  ),
  BusinessInstructorController.deleteFromDB,
);

export const BusinessInstructorRoutes = router;
