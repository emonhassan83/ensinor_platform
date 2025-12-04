import { RegisterWith, UserRole, UserStatus, ChatType, ChatStatus, ChatRole } from '@prisma/client';
import config from '../config';
import prisma from '../utils/prisma';
import { findAdmin } from '../utils/findAdmin';
import { hashedPassword } from '../helpers/hashPasswordHelper';

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


export const seeder = {
  seedAdmin,
  seedContents,
  seedInitialChats
};
