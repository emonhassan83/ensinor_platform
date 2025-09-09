import { z } from 'zod';
import { UserStatus } from '@prisma/client';

// ----------------------
// Company Admin Creation
// ----------------------
const registerAUser = z.object({
  body: z.object({
    password: z.string({ required_error: 'Password is required!' }),
    confirmPassword: z.string({
      required_error: 'Confirm password is required!',
    }),
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
    }),
  }),
});

// ----------------------
// Company Admin Creation
// ----------------------
const createCompanyAdmin = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required!' }),
    organizationEmail: z
      .string()
      .email({ message: 'Invalid organization email!' }),
    companyType: z.string({ required_error: 'Company type is required!' }),
    phoneNumber: z.string({ required_error: 'Phone number is required!' }),
    role: z.string({ required_error: 'Role is required!' }),
    companySize: z.number({ required_error: 'Company size is required!' }),
    numberOfPeopleToTrain: z.number({
      required_error: 'Number of people to train is required!',
    }),
    trainingNeeds: z.number({ required_error: 'Training needs is required!' }),
    description: z.string({ required_error: 'Description is required!' }),
  }),
});

// ----------------------
// Business Instructor Creation
// ----------------------
const createBusinessInstructor = z.object({
  body: z.object({
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      bio: z.string({
        required_error: 'Business Instructors bio is required!',
      }),
    }),
    businessInstructor: z.object({
      company: z
        .string({ required_error: 'Company id is required!' })
        .uuid('company must be a valid UUID'),
      designation: z.string({
        required_error: 'Business Instructors designation is required!',
      }),
    }),
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
      company: z
        .string({ required_error: 'Company id is required!' })
        .uuid('company must be a valid UUID'),
      department: z
        .string({ required_error: 'Department id is required!' })
        .uuid('department must be a valid UUID'),
    }),
  }),
});

// ----------------------
// Instructor Creation
// ----------------------
const createInstructor = z.object({
  body: z.object({
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      contactNo: z.string({ required_error: 'Contact number is required!' }),
      bio: z.string({ required_error: 'Biography is required!' })
    }),
    instructor: z.object({
      designation: z.string({ required_error: 'Designation is required!' }),
      university: z.string({ required_error: 'University is required!' }),
      experience: z.number({ required_error: 'Experience is required!' })
    }),
  }),
});

// ----------------------
// Student Creation
// ----------------------
const createStudent = z.object({
  body: z.object({
    user: z.object({
      name: z.string({ required_error: 'Name is required!' }),
      email: z.string().email('Invalid email address'),
      contactNo: z.string({ required_error: 'Contact number is required!' }),
      bio: z.string({
        required_error: "Student bio is required!"
      }),
      dateOfBirth: z.string({
        required_error: "Student date of birth is required!"
      }),
      country: z.string({
        required_error: "Student country is required!"
      }),
    }),
    student: z.object({
      interests: z
        .array(z.string())
        .nonempty('At least one interest is required.'),
      subjects: z.string({
        required_error: "Student subjects is required!"
      }),
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
