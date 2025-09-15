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
import { QuizAttemptRoutes } from '../modules/quizAttempt/quizAttempt.routes';
import { EnrolledCourseRoutes } from '../modules/enrolledCourse/enrolledCourse.routes';
import { CertificateRequestRoutes } from '../modules/certificateRequest/certificateRequest.routes';
import { CertificateRoutes } from '../modules/certificate/certificate.routes';
import { EventRoutes } from '../modules/event/event.routes';
import { EventScheduleRoutes } from '../modules/eventSchedule/eventSchedule.routes';
import { EventSpeakerRoutes } from '../modules/eventSpeaker/eventSpeaker.routes';
import { EventBookingRoutes } from '../modules/eventBooking/eventBooking.routes';
import { CouponRoutes } from '../modules/coupon/coupon.routes';
import { BatchRoutes } from '../modules/batch/batch.routes';
import { ReviewRoutes } from '../modules/review/review.routes';
import { ReviewRefRoutes } from '../modules/reviewRef/reviewRef.routes';
import { WithdrawRequestRoutes } from '../modules/withdrawRequest/withdrawRequest.routes';
import { CVRoutes } from '../modules/cv/cv.routes';
import { EducationRoutes } from '../modules/education/education.routes';
import { ExperienceRoutes } from '../modules/experience/experience.routes';
import { CVCertificateRoutes } from '../modules/cvCertificate/cvCertificate.routes';
import { WishlistRoutes } from '../modules/wishlist/wishlist.routes';
import { ResourceRoutes } from '../modules/resources/resources.routes';
import { GradingSystemRoutes } from '../modules/gradingSystem/gradingSystem.routes';
import { PromoCodeRoutes } from '../modules/promoCode/promoCode.routes';
import { AffiliateRoutes } from '../modules/affiliates/affiliates.routes';
import { AffiliateSaleRoutes } from '../modules/affiliateSales/affiliateSales.routes';
import { ChatRoutes } from '../modules/chat/chat.routes';
import { MessageRoutes } from '../modules/messages/messages.routes';
import { ZoomRoutes } from '../modules/zoom/zoom.routes';
import { MeetingAssignmentRoutes } from '../modules/meetingAssignment/meetingAssignment.routes';
import { CoInstructorRoutes } from '../modules/coInstructors/coInstructors.routes';
import { AssignmentRoutes } from '../modules/assignment/assignment.routes';
import { AssignmentSubmissionRoutes } from '../modules/assignmentSubmission/assignmentSubmission.routes';

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
    path: '/co-instructors',
    route: CoInstructorRoutes,
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
    path: '/quiz-attempts',
    route: QuizAttemptRoutes,
  },
  {
    path: '/enrolled-courses',
    route: EnrolledCourseRoutes,
  },
  {
    path: '/assignments',
    route: AssignmentRoutes,
  },
  {
    path: '/assignment-submission',
    route: AssignmentSubmissionRoutes,
  },
  {
    path: '/certificate-requests',
    route: CertificateRequestRoutes,
  },
  {
    path: '/certificate',
    route: CertificateRoutes,
  },
  {
    path: '/events',
    route: EventRoutes,
  },
  {
    path: '/event-schedules',
    route: EventScheduleRoutes,
  },
  {
    path: '/event-speaker',
    route: EventSpeakerRoutes,
  },
  {
    path: '/event-bookings',
    route: EventBookingRoutes,
  },
  {
    path: '/orders',
    route: OrdersRoutes,
  },
  {
    path: '/coupons',
    route: CouponRoutes,
  },
  {
    path: '/promo-code',
    route: PromoCodeRoutes,
  },
  {
    path: '/affiliates',
    route: AffiliateRoutes,
  },
  {
    path: '/affiliate-sales',
    route: AffiliateSaleRoutes,
  },
  {
    path: '/batch',
    route: BatchRoutes,
  },
  {
    path: '/reviews',
    route: ReviewRoutes,
  },
  {
    path: '/reviews-ref',
    route: ReviewRefRoutes,
  },
  {
    path: '/withdraw-requests',
    route: WithdrawRequestRoutes,
  },
  {
    path: '/cv',
    route: CVRoutes,
  },
  {
    path: '/cv-educations',
    route: EducationRoutes,
  },
  {
    path: '/cv-experiences',
    route: ExperienceRoutes,
  },
  {
    path: '/cv-certificate',
    route: CVCertificateRoutes,
  },
  {
    path: '/grading-system',
    route: GradingSystemRoutes,
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
    path: '/chats',
    route: ChatRoutes,
  },
  {
    path: '/messages',
    route: MessageRoutes,
  },
  {
    path: '/contents',
    route: ContentsRoutes,
  },
  {
    path: '/zoom',
    route: ZoomRoutes,
  },
  {
    path: '/meeting-assignments',
    route: MeetingAssignmentRoutes,
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
  {
    path: '/wishlist',
    route: WishlistRoutes,
  },
  {
    path: '/resource',
    route: ResourceRoutes,
  },
];

moduleRoutes.forEach(route => router.use(route.path, route.route));
export default router;
