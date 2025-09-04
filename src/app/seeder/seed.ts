import { RegisterWith, UserRole, UserStatus } from '@prisma/client';
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

export const seeder = {
  seedAdmin,
  seedContents,
};
