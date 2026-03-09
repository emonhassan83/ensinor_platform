import {
  RegisterWith,
  UserRole,
  UserStatus,
  ChatType,
  ChatStatus,
  ChatRole,
  CourseGrade
} from '@prisma/client';
import config from '../config';
import prisma from '../utils/prisma';
import { findAdmin } from '../utils/findAdmin';
import { hashedPassword } from '../helpers/hashPasswordHelper';
import { batchData, packageData } from '../utils/initialSeedData';

const seedAdmin = async () => {
  // check if super_admin already exists
  const isAdminExists = await prisma.user.findFirst({
    where: { role: UserRole.super_admin },
  });
  const hashPassword = await hashedPassword(config.admin_pass!);

  if (!isAdminExists) {
    await prisma.user.create({
      data: {
        name: 'Ensinor',
        email: 'ensinor@example.gmail.com',
        password: hashPassword,
        role: UserRole.super_admin,
        contactNo: '87623456778',
        registerWith: RegisterWith.credentials,
        status: UserStatus.active,
        verification: {
          create: {
            otp: '0',
            status: true,
            expiresAt: null, // since super admin doesn’t need OTP expiration
          },
        },
        expireAt: null, // since super admin doesn’t expire
      },
    });

    console.log('\n✅ Super admin User Seeded Successfully!');
  }
};

const seedContents = async () => {
  const admin = await findAdmin();
  if (!admin) {
    console.log('\n❌ No admin found. Cannot seed contents.');
    return;
  }

  // Check if content already exists
  const existingContents = await prisma.content.count();

  if (existingContents === 0) {
    await prisma.content.create({
      data: {
        createdById: admin.id,
        aboutUs: '',
        termsAndConditions: '',
        privacyPolicy: '',
        supports: '',
        customerLocation: '',
        customerNumber: '',
        customerEmail: '',
        contractLocation: '',
        contractNumber: '',
        contractEmail: '',
        officeLocation: '',
        officeNumber: '',
        officeEmail: '',
      },
    });

    console.log('\n✅ Default Contents seeded successfully!');
  }
};

const seedInitialChats = async () => {
  console.log('\n📨 Checking initial chat setup...');

  // Prevent duplication: only seed if announcement chat does NOT exist.
  const announcementExists = await prisma.chat.findFirst({
    where: { type: ChatType.announcement },
  });

  if (announcementExists) {
    console.log('ℹ️ Initial chats already exist. Skipping chat seeding...');
    return;
  }

  console.log('🚀 Seeding initial chats...');

  const superAdmin = await prisma.user.findFirst({
    where: { role: UserRole.super_admin, isDeleted: false },
  });

  if (!superAdmin) {
    console.log('❌ Super Admin not seeded yet. Cannot seed chats.');
    return;
  }

  // Fetch users by roles
  const admins = await prisma.user.findMany({
    where: { role: UserRole.company_admin, isDeleted: false },
  });

  const instructors = await prisma.user.findMany({
    where: { role: UserRole.instructor, isDeleted: false },
  });

  const students = await prisma.user.findMany({
    where: { role: UserRole.student, isDeleted: false },
  });

  /* ======================================================
      1️⃣ Company Announcement Chat
     ====================================================== */
  const announcementChat = await prisma.chat.create({
    data: {
      type: ChatType.announcement,
      groupName: 'Company Announcements',
      isReadOnly: true,
      status: ChatStatus.accepted,
      participants: {
        create: [
          {
            userId: superAdmin.id,
            role: ChatRole.admin,
          },
          ...admins.map(admin => ({
            userId: admin.id,
            role: ChatRole.member,
          })),
        ],
      },
    },
  });

  /* ======================================================
      2️⃣ Instructor Group Chat
     ====================================================== */
  const instructorGroupChat = await prisma.chat.create({
    data: {
      type: ChatType.announcement,
      groupName: 'Instructor Announcements',
      isReadOnly: false,
      status: ChatStatus.accepted,
      participants: {
        create: [
          {
            userId: superAdmin.id,
            role: ChatRole.admin,
          },
          ...instructors.map(instructor => ({
            userId: instructor.id,
            role: ChatRole.member,
          })),
        ],
      },
    },
  });

  /* ======================================================
      3️⃣ Student Group Chat
     ====================================================== */
  const studentGroupChat = await prisma.chat.create({
    data: {
      type: ChatType.announcement,
      groupName: 'Student Announcements',
      isReadOnly: false,
      status: ChatStatus.accepted,
      participants: {
        create: [
          {
            userId: superAdmin.id,
            role: ChatRole.admin,
          },
          ...students.map(student => ({
            userId: student.id,
            role: ChatRole.member,
          })),
        ],
      },
    },
  });

  console.log('\n✅ Initial Chats Seeded Successfully!');
  console.table({
    announcementChat: announcementChat.id,
    instructorGroupChat: instructorGroupChat.id,
    studentGroupChat: studentGroupChat.id,
  });
};

const seedDefaultGradingSystem = async () => {
  console.log('\n📊 Checking default grading system...');
  const adminExists = await prisma.user.findFirst({
    where: { role: UserRole.super_admin },
  });

  // Check if any default grading system already exists
  const defaultGradingExists = await prisma.gradingSystem.findFirst({
    where: { isDefault: true, isDeleted: false },
  });

  if (defaultGradingExists) {
    console.log('ℹ️ Default grading system already exists. Skipping...');
    return;
  }

  console.log('🚀 Creating default grading system...');

  // Create default GradingSystem
  const defaultGrading = await prisma.gradingSystem.create({
    data: {
      authorId: adminExists?.id,
      isDefault: true,
      isDeleted: false,
    },
  });

  // Default Grade ranges (you can adjust minScore/maxScore as needed)
  await prisma.grade.createMany({
    data: [
      {
        gradingSystemId: defaultGrading.id,
        minScore: 90,
        maxScore: 100,
        gradeLabel: CourseGrade.A_PLUS,
      },
      {
        gradingSystemId: defaultGrading.id,
        minScore: 80,
        maxScore: 89.99,
        gradeLabel: CourseGrade.A,
      },
      {
        gradingSystemId: defaultGrading.id,
        minScore: 70,
        maxScore: 79.99,
        gradeLabel: CourseGrade.B,
      },
      {
        gradingSystemId: defaultGrading.id,
        minScore: 60,
        maxScore: 69.99,
        gradeLabel: CourseGrade.C,
      },
      {
        gradingSystemId: defaultGrading.id,
        minScore: 50,
        maxScore: 59.99,
        gradeLabel: CourseGrade.D,
      },
      {
        gradingSystemId: defaultGrading.id,
        minScore: 0,
        maxScore: 49.99,
        gradeLabel: CourseGrade.FAIL,
      },
    ],
  });

  console.log('✅ Default Grading System seeded with A, B, C, D, FAIL grades!');
};

// Batch seed function (duplication prevent)
const seedBatches = async () => {
  console.log('\n🚀 Seeding Batches...');

  let seededCount = 0;
  let skippedCount = 0;

  for (const batch of batchData) {
    // Check batch title exist or not
    const existing = await prisma.batch.findFirst({
      where: { title: batch.title, isDeleted: false },
    });

    if (existing) {
      skippedCount++;
      // console.log(`ℹ️ Batch "${batch.title}" already exists. Skipping...`);
      continue;
    }

    // super_admin
    const admin = await prisma.user.findFirst({
      where: { role: UserRole.super_admin, isDeleted: false },
    });

    if (!admin) {
      // console.error('❌ No super_admin found. Cannot seed batches.');
      return;
    }

    await prisma.batch.create({
      data: {
        authorId: admin.id,
        title: batch.title,
        description: batch.description,
        logo: batch.logo,
        category: batch.category,
        rarity: batch.rarity,
        popularity: 0,
        isDeleted: false,
      },
    });

    seededCount++;
    // console.log(`✅ Batch "${batch.title}" seeded successfully!`);
  }

  // console.log(
  //   `\n📊 Batch Seeding Summary: ${seededCount} new, ${skippedCount} skipped`,
  // );
};

// Package seed function (duplication prevent)
const seedPackages = async () => {
  console.log('\n🚀 Seeding Packages...');

  let seededCount = 0;
  let skippedCount = 0;

  for (const pkg of packageData) {
    // Check title + type + audience
    const existing = await prisma.package.findFirst({
      where: {
        title: pkg.title,
        type: pkg.type,
        audience: pkg.audience,
        billingCycle: pkg.billingCycle,
        isDeleted: false,
      },
    });

    if (existing) {
      skippedCount++;
      // console.log(
      //   `ℹ️ Package "${pkg.title}" (${pkg.type}, ${pkg.audience}) already exists. Skipping...`,
      // );
      continue;
    }

    await prisma.package.create({
      data: {
        title: pkg.title,
        type: pkg.type,
        audience: pkg.audience,
        features: pkg.features,
        billingCycle: pkg.billingCycle,
        price: pkg.price,
        popularity: pkg.popularity || 0,
        isDeleted: false,
      },
    });

    seededCount++;
    // console.log(`✅ Package "${pkg.title}" (${pkg.type}) seeded successfully!`);
  }

  // console.log(
  //   `\n📊 Package Seeding Summary: ${seededCount} new, ${skippedCount} skipped`,
  // );
};

export const seeder = {
  seedAdmin,
  seedContents,
  seedInitialChats,
  seedDefaultGradingSystem,
  seedBatches,
  seedPackages
};
