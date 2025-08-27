import express from 'express';
import { UserController } from './user.controller';
import validateRequest from '../../middlewares/validateRequest';
import { UserValidation } from './user.validations';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import multer, { memoryStorage } from 'multer';
import parseData from '../../middlewares/parseData';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.get('/', auth(UserRole.super_admin), UserController.getAllUser);

router.get(
  '/my-profile',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  UserController.getMyProfile,
);

router.post(
  '/company-admin',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(UserValidation.createCompanyAdmin),
  UserController.createCompanyAdmin,
);

router.post(
  '/business-instructor',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(UserValidation.createBusinessInstructor),
  UserController.createBusinessInstructor,
);

router.post(
  '/employee',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(UserValidation.createEmployee),
  UserController.createEmployee,
);

router.post(
  '/instructor',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  validateRequest(UserValidation.createInstructor),
  UserController.createInstructor,
);

router.post(
  '/student',
  upload.single('image'),
  parseData(),
  validateRequest(UserValidation.createStudent),
  UserController.createStudent,
);

router.patch(
  '/:id',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.changeProfileStatus),
  UserController.changeProfileStatus,
);

router.put(
  '/:id',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  UserController.updateAProfile,
);

router.patch(
  '/my-profile',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  upload.single('image'),
  parseData(),
  UserController.updateMyProfile,
);

router.delete('/:id', auth(UserRole.super_admin), UserController.deleteAUser);

router.delete(
  '/my-profile',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.employee,
    UserRole.instructor,
    UserRole.student,
  ),
  UserController.deleteMyProfile,
);
export const userRoutes = router;
