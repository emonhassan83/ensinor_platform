import { Package, Prisma } from '@prisma/client';
import { paginationHelpers } from '../../helpers/paginationHelper';
import { IPaginationOptions } from '../../interfaces/pagination';
import { IPackage, IPackageFilterRequest } from './package.interface';
import { packageSearchAbleFields } from './package.constant';
import prisma from '../../utils/prisma';
import ApiError from '../../errors/ApiError';
import httpStatus from 'http-status';

const insertIntoDB = async (payload: IPackage) => {
  // --Prevent duplicate subscription type + billing cycle for same audience ---
  const existingPackage = await prisma.package.findFirst({
    where: {
      audience: payload.audience,
      type: payload.type,
      billingCycle: payload.billingCycle,
      isDeleted: false,
    },
  });

  if (existingPackage) {
    throw new ApiError(
      httpStatus.CONFLICT,
      `Package with subscription type '${payload.type}' and billing cycle '${payload.billingCycle}' for audience '${payload.audience}' already exists!`,
    );
  }

  const result = await prisma.package.create({
    data: payload,
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Package creation failed!');
  }
  return result;
};

const getAllFromDB = async (
  params: IPackageFilterRequest,
  options: IPaginationOptions,
) => {
  const { page, limit, skip } = paginationHelpers.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.PackageWhereInput[] = [{ isDeleted: false }];

  // 🔍 Search support
  if (searchTerm) {
    andConditions.push({
      OR: packageSearchAbleFields.map(field => ({
        [field]: {
          contains: searchTerm,
          mode: 'insensitive',
        },
      })),
    });
  }

  // 🎯 Apply filters
  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map(key => ({
        [key]: {
          equals: (filterData as any)[key],
        },
      })),
    });
  }

  const whereConditions: Prisma.PackageWhereInput = {
    AND: andConditions,
  };

  // 🗂 Fetch data
  const result = await prisma.package.findMany({
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

  const total = await prisma.package.count({
    where: whereConditions,
  });

  // 🧩 Map subscription type → level
  const typeToLevel: Record<string, string> = {
    basic: 'instructor-l1',
    standard: 'instructor-l2',
    premium: 'instructor-l3',
    ngo: 'company-l1',
    sme: 'company-l2',
    enterprise: 'company-l3',
  };

  const dataWithLevel = result.map(pkg => ({
    ...pkg,
    level: typeToLevel[pkg.type] ?? null,
  }));

  return {
    meta: {
      page,
      limit,
      total,
    },
    data: dataWithLevel,
  };
};

const getByIdFromDB = async (id: string): Promise<Package | null> => {
  const result = await prisma.package.findUnique({
    where: { id },
  });

  if (!result || result?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found!');
  }

  return result;
};

const updateIntoDB = async (
  id: string,
  payload: Partial<Package>,
): Promise<Package> => {
  const pkg = await prisma.package.findUnique({
    where: { id },
  });
  if (!pkg || pkg?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found!');
  }

  const result = await prisma.package.update({
    where: { id },
    data: payload,
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not updated!');
  }

  return result;
};

const deleteFromDB = async (id: string): Promise<Package> => {
  const pkg = await prisma.package.findUniqueOrThrow({
    where: { id },
  });
  if (!pkg || pkg?.isDeleted) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found!');
  }

  const result = await prisma.package.update({
    where: { id },
    data: {
      isDeleted: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Package not found!');
  }

  return result;
};

export const PackageService = {
  insertIntoDB,
  getAllFromDB,
  getByIdFromDB,
  updateIntoDB,
  deleteFromDB,
};
