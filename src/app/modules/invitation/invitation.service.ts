import {
  Invitation,
  Prisma,
  RegisterWith,
  SubscriptionStatus,
  SubscriptionType,
  UserRole,
  UserStatus,
} from '@prisma/client';
import httpStatus from 'http-status';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import {
  IGroupInvitation,
  IInvitation,
  IInvitationFilterRequest,
} from './invitation.interface';
import { invitationSearchAbleFields } from './invitation.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import { generateDefaultPassword } from '../../utils/passwordGenerator';
import { hashedPassword } from '../user/user.utils';
import { sendEmployeeInvitationEmail } from '../../utils/email/sentEmployeeInvitation';

const insertIntoDB = async (payload: IInvitation) => {
  const { userId, departmentId, name, email } = payload;

  return await prisma.$transaction(async tx => {
    // 1. Get inviter
    const inviter = await tx.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.active,
        isDeleted: false,
      },
      include: {
        companyAdmin: {
          include: {
            company: {
              include: {
                author: {
                  include: {
                    user: {
                      include: {
                        subscription: {
                          where: {
                            isExpired: false,
                            status: SubscriptionStatus.active,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        businessInstructor: {
          include: {
            company: {
              include: {
                author: {
                  include: {
                    user: {
                      include: {
                        subscription: {
                          where: {
                            isExpired: false,
                            status: SubscriptionStatus.active,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!inviter) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter not found!');
    }

    // ✅ ROLE BASED COMPANY RESOLVE
    let company;
    let activeSubscription;

    if (inviter.role === UserRole.company_admin) {
      company = inviter.companyAdmin?.company;
      activeSubscription =
        inviter.companyAdmin?.company?.author?.user?.subscription?.[0];
    } else if (inviter.role === UserRole.business_instructors) {
      company = inviter.businessInstructor?.company;
      activeSubscription =
        inviter.businessInstructor?.company?.author?.user?.subscription?.[0];
    } else {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You are not allowed to invite employees!',
      );
    }

    // ✅ Validate company
    if (!company) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'User is not linked to any company!',
      );
    }

    if (!company.isActive) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Company is inactive!',
      );
    }

    // ✅ Subscription check
    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'No active subscription found!',
      );
    }

    const subscriptionLimits: Partial<Record<SubscriptionType, number>> = {
      ngo: 500,
      sme: 1000,
      enterprise: 3000,
    };

    const maxAllowed = subscriptionLimits[activeSubscription.type];

    if (company.size >= maxAllowed!) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Your subscription (${activeSubscription.type}) allows max ${maxAllowed} members`,
      );
    }

    // 3. Department validation
    const department = await tx.department.findFirst({
      where: {
        id: departmentId,
        isDeleted: false,
        companyId: company.id, // ✅ FIXED (important)
      },
    });

    if (!department) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found!');
    }

    // 4. Email check
    const existingUser = await tx.user.findUnique({
      where: { email },
    });

    let newUser;
    const generatedPassword = generateDefaultPassword(12);

    if (existingUser) {
      if (!existingUser.isDeleted) {
        throw new ApiError(
          httpStatus.CONFLICT,
          `Email ${email} already exists`,
        );
      }

      // Reactivate
      newUser = await tx.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          password: await hashedPassword(generatedPassword),
          role: UserRole.employee,
          status: UserStatus.active,
          isDeleted: false,
          needsPasswordChange: true,
        },
      });
    } else {
      newUser = await tx.user.create({
        data: {
          name,
          email,
          password: await hashedPassword(generatedPassword),
          role: UserRole.employee,
          status: UserStatus.active,
          registerWith: RegisterWith.credentials,
          verification: {
            create: { otp: '', status: true },
          },
        },
      });
    }

    // 5. Employee create
    const employeeExists = await tx.employee.findUnique({
      where: { userId: newUser.id },
    });

    if (!employeeExists) {
      await tx.employee.create({
        data: {
          userId: newUser.id,
          authorId: inviter.id,
          companyId: company.id,
          departmentId,
        },
      });
    }

    // 6. Counters
    await tx.department.update({
      where: { id: departmentId },
      data: { joined: { increment: 1 } },
    });

    await tx.company.update({
      where: { id: company.id },
      data: {
        employee: { increment: 1 },
        size: { increment: 1 },
      },
    });

    // 7. Send email
    await sendEmployeeInvitationEmail(
      newUser.email,
      newUser.name,
      generatedPassword,
      inviter.name,
      company.name,
    );

    return { user: newUser };
  });
};

const bulkInsertIntoDB = async (payload: IGroupInvitation) => {
  const { userId, departmentId, emails, groupName } = payload;

  return await prisma.$transaction(async tx => {
    // 1. Get inviter with both roles
    const inviter = await tx.user.findFirst({
      where: {
        id: userId,
        status: UserStatus.active,
        isDeleted: false,
      },
      include: {
        companyAdmin: {
          include: {
            company: {
              include: {
                author: {
                  include: {
                    user: {
                      include: {
                        subscription: {
                          where: {
                            isExpired: false,
                            status: SubscriptionStatus.active,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        businessInstructor: {
          include: {
            company: {
              include: {
                author: {
                  include: {
                    user: {
                      include: {
                        subscription: {
                          where: {
                            isExpired: false,
                            status: SubscriptionStatus.active,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!inviter) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Inviter not found!');
    }

    // ✅ ROLE BASED RESOLVE
    let company;
    let activeSubscription;

    if (inviter.role === UserRole.company_admin) {
      company = inviter.companyAdmin?.company;
      activeSubscription =
        inviter.companyAdmin?.company?.author?.user?.subscription?.[0];
    } else if (inviter.role === UserRole.business_instructors) {
      company = inviter.businessInstructor?.company;
      activeSubscription =
        inviter.businessInstructor?.company?.author?.user?.subscription?.[0];
    } else {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        'You are not allowed to invite employees!',
      );
    }

    if (!company) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'User is not linked to any company!',
      );
    }

    if (!company.isActive) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'Company is inactive!',
      );
    }

    if (!activeSubscription) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        'No active subscription found!',
      );
    }

    // 2. Subscription limit check
    const subscriptionLimits: Partial<Record<SubscriptionType, number>> = {
      standard: 0,
      ngo: 50,
      sme: 200,
      enterprise: 3000,
    };

    const maxAllowed = subscriptionLimits[activeSubscription.type];
    const newInvites = emails.length;

    if (company.size + newInvites > maxAllowed!) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Your subscription (${activeSubscription.type}) allows only ${maxAllowed} members. You can invite only ${
          maxAllowed! - company.size
        } more.`,
      );
    }

    // 3. Department validation (FIXED)
    const department = await tx.department.findFirst({
      where: {
        id: departmentId,
        companyId: company.id,
        isDeleted: false,
      },
    });

    if (!department) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Department not found!');
    }

    // 4. Existing users check
    const existingUsers = await tx.user.findMany({
      where: { email: { in: emails } },
      select: { id: true, email: true, isDeleted: true },
    });

    const activeEmails = existingUsers
      .filter(u => !u.isDeleted)
      .map(u => u.email);

    if (activeEmails.length > 0) {
      throw new ApiError(
        httpStatus.CONFLICT,
        `Already registered emails: ${activeEmails.join(', ')}`,
      );
    }

    const invitedEmployees: any[] = [];

    // 5. Process each email
    for (const email of emails) {
      const existingUser = existingUsers.find(u => u.email === email);

      const generatedPassword = generateDefaultPassword(12); // ✅ once per user

      let newUser;

      if (existingUser && existingUser.isDeleted) {
        newUser = await tx.user.update({
          where: { id: existingUser.id },
          data: {
            name: groupName || 'Group Member',
            password: await hashedPassword(generatedPassword),
            role: UserRole.employee,
            status: UserStatus.active,
            isDeleted: false,
            needsPasswordChange: true,
          },
          select: { id: true, name: true, email: true },
        });
      } else {
        newUser = await tx.user.create({
          data: {
            name: groupName || 'Group Member',
            email,
            password: await hashedPassword(generatedPassword),
            role: UserRole.employee,
            status: UserStatus.active,
            registerWith: RegisterWith.credentials,
            verification: {
              create: { otp: '', status: true },
            },
          },
          select: { id: true, name: true, email: true },
        });
      }

      // Employee create
      const existingEmployee = await tx.employee.findUnique({
        where: { userId: newUser.id },
      });

      if (!existingEmployee) {
        await tx.employee.create({
          data: {
            userId: newUser.id,
            authorId: inviter.id,
            companyId: company.id,
            departmentId,
          },
        });
      }

      invitedEmployees.push({ user: newUser });

      // async email (non-blocking)
      sendEmployeeInvitationEmail(
        newUser.email,
        newUser.name,
        generatedPassword,
        inviter.name,
        company.name,
      ).catch(console.error);
    }

    // 6. Counters
    await tx.department.update({
      where: { id: departmentId },
      data: { joined: { increment: emails.length } },
    });

    await tx.company.update({
      where: { id: company.id },
      data: {
        employee: { increment: emails.length },
        size: { increment: emails.length },
      },
    });

    return invitedEmployees;
  });
};

const getAllFromDB = async (
  params: IInvitationFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.InvitationWhereInput[] = [];

  // Search across Invitation and nested User fields
  if (searchTerm) {
    andConditions.push({
      OR: invitationSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // Filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.InvitationWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.invitation.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: 'desc',
          },
  });

  const total = await prisma.invitation.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: result,
  };
};

const getByIdFromDB = async (id: string): Promise<Invitation | null> => {
  const result = await prisma.invitation.findUnique({
    where: { id },
    include: { user: true },
  });

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<IInvitation>,
): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUniqueOrThrow({
    where: { id },
  });
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found!');
  }

  const result = await prisma.invitation.update({
    where: { id },
    data: payload,
    include: { user: true, department: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Invitation> => {
  const invitation = await prisma.invitation.findUniqueOrThrow({
    where: { id },
  });
  if (!invitation) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found!');
  }

  const result = await prisma.invitation.delete({
    where: { id },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Invitation not found!');
  }

  return result;
};

export const InvitationService = {
  insertIntoDB,
  bulkInsertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
