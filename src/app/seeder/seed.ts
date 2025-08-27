import { RegisterWith, UserRole } from '@prisma/client'
import config from '../config'
import prisma from '../utils/prisma'

const seedAdmin = async () => {
  // check if super_admin already exists
  const isAdminExists = await prisma.user.findFirst({
    where: { role: UserRole.super_admin },
  })

  if (!isAdminExists) {
    await prisma.user.create({
      data: {
        name: 'Ensinor',
        email: 'ensinor@example.gmail.com',
        password: config.admin_pass,
        role: UserRole.super_admin,
        contactNo: '87623456778',
        registerWith: RegisterWith.credentials,
        verification: {
          create: {
            otp: '0',
            status: true,
            expiresAt: null, // since super admin doesn’t need OTP expiration
          },
        },
        expireAt: null, // since super admin doesn’t expire
      },
    })

    console.log('\n✅ Super admin User Seeded Successfully!')
  } else {
    console.log('\nℹ️ Super admin already exists, skipping seeding.')
  }
}


// // Function to seed Contents
// const seedContents = async () => {
//   const admin = await findAdmin()
//   const existingContents = await Contents.countDocuments()

//   if (existingContents === 0) {
//     await Contents.create({
//       aboutUs: '',
//       termsAndConditions: '',
//       privacyPolicy: '',
//       supports: '',
//       faq: '',
//       createdBy: admin?._id,
//     })

//     console.log(('\n✅Default Contents seeded successfully!'))
//   }
// }

export const seeder = {
  seedAdmin,
  // seedContents,
}
