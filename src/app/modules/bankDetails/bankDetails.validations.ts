import { z } from 'zod';

const createValidationSchema = z.object({
  body: z.object({
    authorId: z
      .string({ required_error: 'BankDetails name is required' })
      .uuid('receiver must be a valid UUID'),
    accountNumber: z.string({
      required_error: 'BankDetails accountNumber is required',
    }),
    routingNumber: z.string({
      required_error: 'BankDetails routingNumber is required',
    }),
    bankName: z.string({ required_error: 'BankDetails bankName is required' }),
    bankHolderName: z.string({
      required_error: 'BankDetails bankHolderName is required',
    }),
    bankAddress: z.string({
      required_error: 'BankDetails bankAddress is required',
    }),
  }),
});

const updateValidationSchema = z.object({
  body: z.object({
    accountNumber: z
      .string({
        required_error: 'BankDetails accountNumber is required',
      })
      .optional(),
    routingNumber: z
      .string({
        required_error: 'BankDetails routingNumber is required',
      })
      .optional(),
    bankName: z
      .string({ required_error: 'BankDetails bankName is required' })
      .optional(),
    bankHolderName: z
      .string({
        required_error: 'BankDetails bankHolderName is required',
      })
      .optional(),
    bankAddress: z
      .string({
        required_error: 'BankDetails bankAddress is required',
      })
      .optional(),
  }),
});

export const BankDetailsValidation = {
  createValidationSchema,
  updateValidationSchema,
};
