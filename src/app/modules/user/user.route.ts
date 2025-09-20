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

router.post(
  '/register',
  upload.single('image'),
  parseData(),
  validateRequest(UserValidation.registerAUser),
  UserController.registerAUser,
);

router.post(
  '/company-admin-invitation',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.createCompanyAdmin),
  UserController.invitationCompanyAdmin,
);

router.post(
  '/business-instructor-invitation',
  auth(UserRole.company_admin),
  validateRequest(UserValidation.createBusinessInstructor),
  UserController.createBusinessInstructor,
);

router.post(
  '/employee-invitation',
  auth(UserRole.company_admin),
  validateRequest(UserValidation.createEmployee),
  UserController.createEmployee,
);

router.post(
  '/instructor-request',
  validateRequest(UserValidation.createInstructor),
  UserController.createInstructor,
);

router.post(
  '/instructor-invitation',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.createInstructor),
  UserController.invitationInstructor,
);

router.post(
  '/student-invitation',
  validateRequest(UserValidation.createStudent),
  UserController.createStudent,
);

router.patch(
  '/status/:id',
  auth(UserRole.super_admin),
  validateRequest(UserValidation.changeProfileStatus),
  UserController.changeProfileStatus,
);

router.put(
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

router.put(
  '/:id',
  auth(UserRole.super_admin),
  upload.single('image'),
  parseData(),
  UserController.updateAProfile,
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

router.get('/:id', auth(UserRole.super_admin), UserController.getUserById);

router.get('/', auth(UserRole.super_admin), UserController.getAllUser);

export const userRoutes = router;
