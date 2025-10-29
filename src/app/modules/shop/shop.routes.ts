import express from 'express';
import { ShopController } from './shop.controller';
import validateRequest from '../../middlewares/validateRequest';
import auth from '../../middlewares/auth';
import { UserRole } from '@prisma/client';
import { ShopValidation } from './shop.validation';
import parseData from '../../middlewares/parseData';
import multer, { memoryStorage } from 'multer';
import checkCompanyAdminSubscription from '../../middlewares/checkCompanySubscription';

const router = express.Router();
const storage = memoryStorage();
const upload = multer({ storage });

router.post(
  '/',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  parseData(),
  validateRequest(ShopValidation.createValidationSchema),
  ShopController.insertIntoDB,
);

router.get(
  '/author/my-shop',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  ShopController.getMyShopFromDB,
);

router.get('/categories', ShopController.getAllCategoriesFromDB);

router.get('/trending', ShopController.getTrendingBooks);

router.get('/', ShopController.getAllFromDB);

router.get(
  '/company/:companyId',
  auth(UserRole.company_admin),
  checkCompanyAdminSubscription(),
  ShopController.getByCompanyFromDB,
);

router.get('/:id', ShopController.getByIdFromDB);

router.patch(
  '/status/:id',
  auth(UserRole.super_admin, UserRole.company_admin),
  checkCompanyAdminSubscription(),
  ShopController.changeStatusIntoDB,
);

router.put(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  upload.fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'file', maxCount: 1 },
  ]),
  parseData(),
  validateRequest(ShopValidation.updateValidationSchema),
  ShopController.updateIntoDB,
);

router.delete(
  '/:id',
  auth(
    UserRole.super_admin,
    UserRole.company_admin,
    UserRole.business_instructors,
    UserRole.instructor,
  ),
  checkCompanyAdminSubscription(),
  ShopController.deleteFromDB,
);

export const ShopRoutes = router;
