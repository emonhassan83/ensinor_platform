import express from 'express';
import { userRoutes } from '../modules/user/user.route';
import { AuthRoutes } from '../modules/auth/auth.route';
import { otpRoutes } from '../modules/otp/otp.route';
import { ContentsRoutes } from '../modules/contents/contents.route';
import { NotificationRoutes } from '../modules/notification/notification.route';
import { CompanyAdminRoutes } from '../modules/companyAdmin/companyAdmin.routes';
import { BusinessInstructorRoutes } from '../modules/businessInstructor/businessInstructor.routes';
import { EmployeeRoutes } from '../modules/employee/employee.routes';
import { InstructorRoutes } from '../modules/instructors/instructors.routes';
import { StudentRoutes } from '../modules/student/student.routes';
import { DepartmentRoutes } from '../modules/departments/departments.route';
import { CompanyRequestRoutes } from '../modules/companyRequest/companyRequest.routes';

const router = express.Router();

const moduleRoutes = [
  {
    path: '/users',
    route: userRoutes,
  },
  {
    path: '/auth',
    route: AuthRoutes,
  },
  {
    path: '/otp',
    route: otpRoutes,
  },
  {
    path: '/company-admins',
    route: CompanyAdminRoutes,
  },
  {
    path: '/business-instructors',
    route: BusinessInstructorRoutes,
  },
  {
    path: '/employees',
    route: EmployeeRoutes,
  },
  {
    path: '/instructors',
    route: InstructorRoutes,
  },
  {
    path: '/students',
    route: StudentRoutes,
  },
  {
    path: '/departments',
    route: DepartmentRoutes,
  },
  {
    path: '/company-requests',
    route: CompanyRequestRoutes,
  },
  {
    path: '/contents',
    route: ContentsRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
