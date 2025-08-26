import { z } from "zod";
import { UserStatus } from "@prisma/client";

// ----------------------
// Company Admin Creation
// ----------------------
const createCompanyAdmin = z.object({
  body: z.object({
    password: z.string({ required_error: "Password is required!" }),
    companyAdmin: z.object({
      name: z.string({ required_error: "Name is required!" }),
      email: z.string().email("Invalid email address"),
      contactNo: z.string({ required_error: "Contact number is required!" }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
  }),
});

// ----------------------
// Business Instructor Creation
// ----------------------
const createBusinessInstructor = z.object({
  body: z.object({
    password: z.string({ required_error: "Password is required!" }),
    businessInstructor: z.object({
     name: z.string({ required_error: "Name is required!" }),
      email: z.string().email("Invalid email address"),
      contactNo: z.string({ required_error: "Contact number is required!" }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
  }),
});

// ----------------------
// Employee Creation
// ----------------------
const createEmployee = z.object({
  body: z.object({
    password: z.string({ required_error: "Password is required!" }),
    employee: z.object({
      name: z.string({ required_error: "Name is required!" }),
      email: z.string().email("Invalid email address"),
      contactNo: z.string({ required_error: "Contact number is required!" }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
    }),
  }),
});

// ----------------------
// Instructor Creation
// ----------------------
const createInstructor = z.object({
  body: z.object({
    password: z.string({ required_error: "Password is required!" }),
    instructor: z.object({
      name: z.string({ required_error: "Name is required!" }),
      email: z.string().email("Invalid email address"),
      contactNo: z.string({ required_error: "Contact number is required!" }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
      designation: z.string({ required_error: "Designation is required!" }),
      university: z.string().optional(),
      session: z.string().optional(),
      subjects: z.string({ required_error: "Subjects are required!" }),
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
    password: z.string({ required_error: "Password is required!" }),
    student: z.object({
      name: z.string({ required_error: "Name is required!" }),
      email: z.string().email("Invalid email address"),
      contactNo: z.string({ required_error: "Contact number is required!" }),
      bio: z.string().optional(),
      dateOfBirth: z.string().optional(),
      city: z.string().optional(),
      country: z.string().optional(),
      photoUrl: z.string().optional(),
      interests: z.array(z.string()).nonempty("At least one interest is required."),
      university: z.string().optional(),
      session: z.string().optional(),
      subjects: z.string({ required_error: "Subjects are required!" }),
    }),
  }),
});

// ----------------------
// Status Update
// ----------------------
const updateStatus = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus),
  }),
});

export const UserValidation = {
  createCompanyAdmin,
  createBusinessInstructor,
  createEmployee,
  createInstructor,
  createStudent,
  updateStatus,
};
