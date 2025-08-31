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
import { InvitationRoutes } from '../modules/invitation/invitation.routes';
import { PackageRoutes } from '../modules/package/package.routes';
import { uploadRouter } from '../modules/uploads/route';
import { ArticleRoutes } from '../modules/article/article.route';
import { FaqRoutes } from '../modules/faq/faq.route';
import { SupportRoutes } from '../modules/support/support.route';
import { NewsletterRoutes } from '../modules/newsletter/newsletter.route';
import { SubscriptionRoutes } from '../modules/subscription/subscription.route';
import { ShopRoutes } from '../modules/shop/shop.routes';
import { OrdersRoutes } from '../modules/orders/orders.route';
import { CourseRoutes } from '../modules/course/course.routes';
import { CourseContentRoutes } from '../modules/courseContent/courseContent.routes';
import { CourseBundleRoutes } from '../modules/courseBundle/courseBundle.routes';
import { QuizRoutes } from '../modules/quiz/quiz.routes';
import { QuestionRoutes } from '../modules/question/question.routes';

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
    path: '/invitations',
    route: InvitationRoutes,
  },
  {
    path: '/shop',
    route: ShopRoutes,
  },
  {
    path: '/courses',
    route: CourseRoutes,
  },
  {
    path: '/course-contents',
    route: CourseContentRoutes,
  },
  {
    path: '/course-bundle',
    route: CourseBundleRoutes,
  },
  {
    path: '/quiz',
    route: QuizRoutes,
  },
  {
    path: '/quiz-questions',
    route: QuestionRoutes,
  },
  {
    path: '/orders',
    route: OrdersRoutes,
  },
  {
    path: '/packages',
    route: PackageRoutes,
  },
  {
    path: '/subscriptions',
    route: SubscriptionRoutes,
  },
  {
    path: '/uploads',
    route: uploadRouter,
  },
  {
    path: '/articles',
    route: ArticleRoutes,
  },
  {
    path: '/contents',
    route: ContentsRoutes,
  },
  {
    path: '/faq',
    route: FaqRoutes,
  },
  {
    path: '/supports',
    route: SupportRoutes,
  },
  {
    path: '/newsletter',
    route: NewsletterRoutes,
  },
  {
    path: '/notification',
    route: NotificationRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
