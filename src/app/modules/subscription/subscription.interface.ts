import { TSubscriptionType } from './subscription.constants'

export interface ISubscription {
  user: string
  type: TSubscriptionType
  package: string
}
