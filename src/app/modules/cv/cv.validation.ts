import { z } from 'zod';

// Create validation
const createValidationSchema = z.object({
  body: z.object({
    userId: z
      .string({ required_error: 'User id is required' })
      .uuid('user id must be a valid UUID'),
    name: z
      .string({ required_error: 'CV name is required' }),
    designation: z.string({
      required_error: 'CV designation is required!',
    }),
    photo: z.string({
      required_error: 'CV photo is required!',
    }).optional(),
    phone: z.string({
      required_error: 'CV phone is required!',
    }),
    email: z.string({
      required_error: 'CV email is required!',
    }),
    linkedin: z.string({
      required_error: 'CV linkedin is required!',
    }),
    website: z.string({
      required_error: 'CV website is required!',
    }),
    location: z.string({
      required_error: 'CV location is required!',
    }),
    aboutMe: z
    .string({
      required_error: 'CV aboutMe is required!',
    }),
    skills: z.array(
      z.string({
        required_error: 'CV skills is required!',
      })
    ).optional(),
  }),
});

// Update validation
const updateValidationSchema = z.object({
  body: z.object({
    name: z
      .string({ required_error: 'CV name is required' }),
    designation: z.string({
      required_error: 'CV designation is required!',
    }).optional(),
    photo: z.string({
      required_error: 'CV photo is required!',
    }).optional(),
    phone: z.string({
      required_error: 'CV phone is required!',
    }).optional(),
    email: z.string({
      required_error: 'CV email is required!',
    }).optional(),
    linkedin: z.string({
      required_error: 'CV linkedin is required!',
    }).optional(),
    website: z.string({
      required_error: 'CV website is required!',
    }),
    location: z.string({
      required_error: 'CV location is required!',
    }).optional(),
    aboutMe: z
    .string({
      required_error: 'CV aboutMe is required!',
    })
    .optional(),
    skills: z.array(
      z.string({
        required_error: 'CV skills is required!',
      }).optional(),
    ),
  }),
});

export const CVValidation = {
  createValidationSchema,
  updateValidationSchema,
};
