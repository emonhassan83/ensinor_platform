import { CompanyType, PaymentStatus, SubscriptionStatus, UserRole } from "@prisma/client";
import prisma from "./prisma";
import ApiError from "../errors/ApiError";

export const checkActiveSubscriptionForInstructor = async (
  author: {
    id: string;
    role: UserRole;
  },
  feature: string,
) => {
  // ✅ ONLY instructors need subscription
  if (author.role !== UserRole.instructor) return;

  const now = new Date();

  const subscription = await prisma.subscription.findFirst({
    where: {
      userId: author.id,
      status: SubscriptionStatus.active,
      paymentStatus: PaymentStatus.paid,
      isDeleted: false,
      isExpired: false,
      expiredAt: {
        gt: now,
      },
    },
  });

  if (!subscription) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `Instructors must have an active subscription to create ${feature}!`,
    );
  }

  return subscription;
};

// utils/companyCheck.ts
export const checkCompanyRestriction = async (author: any, feature: string) => {
  // Only for company_admin or business_instructors
  if (
    ![UserRole.company_admin, UserRole.business_instructors].includes(
      author.role,
    )
  )
    return;

  const company =
    author.role === UserRole.company_admin
      ? author.companyAdmin?.company
      : author.businessInstructor?.company;

  if (!company) throw new ApiError(httpStatus.NOT_FOUND, 'Company not found!');
  if (!company.isActive)
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Your company is not active now!',
    );

  // Block NGO (or add more types here if needed)
  if (company.industryType === CompanyType.ngo) {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      `NGO company admins or business instructors cannot create ${feature}!`,
    );
  }

  return company;
};