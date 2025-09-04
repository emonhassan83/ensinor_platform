import { z } from 'zod';
import { UserStatus } from '@prisma/client';

// ----------------------
// Company Admin Creation
// ----------------------
const registerAUser = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required!' }),
    confirmPassword: z.string({ required_error: 'Confirm password is required!' }),
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address')
    })
  }),
});

// ----------------------
// Company Admin Creation
// ----------------------
const createCompanyAdmin = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required!' }),
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      contactNo: z.string({ required_error: 'Contact number is required!' }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
    company: z.object({
      name: z.string({ required_error: 'Company name is required!' }),
      industryType: z.string().email('Industry type is required!'),
      logo: z.string().optional(),
      color: z.string().optional(),
    }),
  }),
});

// ----------------------
// Business Instructor Creation
// ----------------------
const createBusinessInstructor = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required!' }),
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      contactNo: z.string({ required_error: 'Contact number is required!' }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
    businessInstructor: z.object({
      company: z.string({ required_error: 'Company id is required!' }),
    })
  }),
});

// ----------------------
// Employee Creation
// ----------------------
const createEmployee = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required!' }),
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      contactNo: z.string({ required_error: 'Contact number is required!' }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
    employee: z.object({
      company: z.string({ required_error: 'Company id is required!' })
    }),
  }),
});

// ----------------------
// Instructor Creation
// ----------------------
const createInstructor = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required!' }),
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      contactNo: z.string({ required_error: 'Contact number is required!' }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
    instructor: z.object({
      designation: z.string({ required_error: 'Designation is required!' }),
      university: z.string().optional(),
      session: z.string().optional(),
      subjects: z.string({ required_error: 'Subjects are required!' }),
      linkedIn: z.string().url().optional(),
      facebook: z.string().url().optional(),
      twitter: z.string().url().optional(),
      instagram: z.string().url().optional(),
      website: z.string().url().optional(),
    }),
  }),
});

// ----------------------
// Student Creation
// ----------------------
const createStudent = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required!' }),
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      contactNo: z.string({ required_error: 'Contact number is required!' }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
    student: z.object({
      interests: z
        .array(z.string())
        .nonempty('At least one interest is required.'),
      university: z.string().optional(),
      session: z.string().optional(),
      subjects: z.string({ required_error: 'Subjects are required!' }),
    }),
  }),
});

// ----------------------
// Status Update
// ----------------------
const changeProfileStatus = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});

export const UserValidation = {
  registerAUser,
  createCompanyAdmin,
  createBusinessInstructor,
  createEmployee,
  createInstructor,
  createStudent,
  changeProfileStatus,
};
