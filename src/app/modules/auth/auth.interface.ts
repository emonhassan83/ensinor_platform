export interface TLoginUser {
  email: string
  password: string
  fcmToken?: string
}

export type SocialLoginPayload = {
  name: string;
  email: string;
  photoUrl?: string;
  fcmToken?: string;
  token?: string;
};