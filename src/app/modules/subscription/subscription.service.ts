import httpStatus from 'http-status'
import { Package } from '../package/package.model'

import { PAYMENT_STATUS } from './subscription.constants'
import ApiError from '../../errors/ApiError'

const createSubscription = async (payload: TSubscriptions) => {
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // Check if an unpaid subscription already exists for the user and package
    const isExist = await Subscription.findOne({
      user: payload.user,
      package: payload.package,
      paymentStatus: PAYMENT_STATUS.unpaid,
      status: 'pending',
    }).session(session)

    if (isExist) {
      return isExist
    }

    //  Find the user in the database
    const user = await User.findById(payload.user).session(session)
    if (!user) {
      throw new ApiError(httpStatus.NOT_FOUND, 'User not found!')
    }
    if (user.isDeleted) {
      throw new ApiError(httpStatus.FORBIDDEN, 'Your account is deleted!')
    }
    if (user.status === 'blocked') {
      throw new ApiError(httpStatus.FORBIDDEN, 'Your account is blocked!')
    }

    // Find the package in the database
    const packages = await Package.findById(payload.package).session(session)
    if (!packages) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Package not found')
    }
    if (packages.isDeleted) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Package is already deleted!')
    }

    // Set here subscription type
    if (packages.type == 'Gold') {
      payload.type = 'Gold'
    } else if (packages.type == 'Premium') {
      payload.type = 'Premium'
    }

    // set amount here
    payload.amount = packages.price

    // Determine the expiration date based on billing cycle
    let expiredAt
    const now = new Date()

    if (packages.billingCycle === 'yearly') {
      expiredAt = new Date(now.getTime())
      expiredAt.setFullYear(expiredAt.getFullYear() + 1) // Adds 1 year
    } else if (packages.billingCycle === 'monthly') {
      expiredAt = new Date(now.getTime())
      expiredAt.setMonth(expiredAt.getMonth() + 1) // Adds 1 month
    } else {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid billing cycle!')
    }

    payload.expiredAt = expiredAt

    // If the user's existing package expiry is still valid, extend it
    let finalExpiryDate = expiredAt
    if (user.packageExpiry && new Date(user.packageExpiry) > now) {
      finalExpiryDate = new Date(
        new Date(user.packageExpiry).getTime() +
          (expiredAt.getTime() - now.getTime()),
      )
    } else {
      finalExpiryDate = expiredAt
    }

    // Create a new subscription record in the database
    const result = await Subscription.create([payload], { session })
    if (!result || result.length === 0) {
      throw new Error('Failed to create subscription')
    }

    // // 📢 Notify the admin about the new subscription
    // await subscriptionNotifyToAdmin('ADDED', packages, result[0])

    // // 📩 Notify the user about their subscription purchase
    // await subscriptionNotifyToUser('ADDED', packages, result[0], user)

    // Commit the transaction if everything is successful
    await session.commitTransaction()
    session.endSession()

    return result[0]
  } catch (error) {
    await session.abortTransaction()
    session.endSession()
    throw error
  }
}

const getAllSubscription = async (query: Record<string, any>) => {
  const subscriptionsModel = new QueryBuilder(
    Subscription.find().populate([
      {
        path: 'package',
        select: '',
      },
      {
        path: 'user',
        select: 'firstName lastName email photoUrl occupation',
      },
    ]),
    query,
  )
    .search([])
    .filter()
    .paginate()
    .sort()
    .fields()

  const data = await subscriptionsModel.modelQuery
  const meta = await subscriptionsModel.countTotal()
  return {
    data,
    meta,
  }
}

const getSubscriptionById = async (id: string) => {
  const result = await Subscription.findById(id).populate([
    {
      path: 'package',
      select: '',
    },
    {
      path: 'user',
      select: 'firstName lastName email photoUrl occupation',
    },
  ])
  if (!result) {
    throw new Error('Subscription not found')
  }

  // if subscription is already deleted
  if (result?.isDeleted) {
    throw new Error('Subscription  already deleted!')
  }

  return result
}

const updateSubscription = async (
  id: string,
  payload: Partial<TSubscriptions>,
) => {
  const subscription = await Subscription.findById(id)
  if (!subscription) {
    throw new Error('Failed to update subscription')
  }

  // if subscription is already deleted
  if (subscription?.isDeleted) {
    throw new Error('Subscription  already deleted!')
  }

  const result = await Subscription.findByIdAndUpdate(id, payload, {
    new: true,
  })

  if (!result) {
    throw new Error('Failed to update subscription')
  }

  // if subscription is already deleted
  if (result?.isDeleted) {
    throw new Error('Subscription  already deleted!')
  }

  return result
}

const changeApprovalStatusFromDB = async (id: string, payload: {
  approveStatus: string
}) => {
  const { approveStatus } = payload

  //* if the user is is not exist
  const subscription = await Subscription.findById(id)
  if (!subscription) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Subscription not found!')
  }
  if (subscription?.isDeleted) {
    throw new Error('Subscription  already deleted!')
  }

  const updateSubscription = await Subscription.findByIdAndUpdate(
    id,
    { approveStatus },
    { new: true },
  )
  if (!updateSubscription) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      'Subscription not found and failed to update approve status!',
    )
  }

  return updateSubscription
}

const deleteSubscription = async (id: string) => {
  const subscription = await Subscription.findById(id)
  if (!subscription) {
    throw new Error('Failed to update subscription')
  }

  // if subscription is already deleted
  if (subscription?.isDeleted) {
    throw new Error('Subscription  already deleted!')
  }

  const result = await Subscription.findByIdAndUpdate(
    id,
    { isDeleted: true },
    { new: true },
  )

  if (!result) {
    throw new Error('Failed to delete subscription')
  }

  return result
}

export const subscriptionService = {
  createSubscription,
  getAllSubscription,
  getSubscriptionById,
  updateSubscription,
  changeApprovalStatusFromDB,
  deleteSubscription,
}
