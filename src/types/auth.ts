export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: string;
  location?: string;
  selfAsFriend?: string;
  idealFriend?: string;
  participationPlan?: string;
  coverImageUrl?: string;
  defaultHouseRules?: string;
  homeAddress?: string;
  hideEmail?: boolean;
  googleId?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}

export interface ApplyPayload {
  displayName: string;
  email: string;
  location: string;
  bio: string;
  selfAsFriend: string;
  idealFriend: string;
  participationPlan: string;
  wechatId: string;
  referralSource?: string;
  coverImage?: File;
}
