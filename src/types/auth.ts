export interface UserPreferences {
  emailState?: 'active' | 'weekly' | 'stopped' | 'unsubscribed';
  notifyEvents?: boolean;
  notifyCards?: boolean;
  notifyOps?: boolean;
  notifyAnnounce?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  selfAsFriend?: string;
  idealFriend?: string;
  participationPlan?: string;
  coverImageUrl?: string;
  defaultHouseRules?: string;
  homeAddress?: string;
  hideEmail?: boolean;
  hideActivity?: boolean;
  hideStats?: boolean;
  hiddenTitleIds?: string[];
  googleId?: string;
  birthday?: string;
  hideBirthday?: boolean;
  hostCandidate?: boolean;
  consecutiveEvents?: number;
  preferences?: UserPreferences;
}

export interface RegisterPayload {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  coverImageUrl?: string;
}

export interface ApplyPayload {
  displayName: string;
  email: string;
  city: string;
  state?: string;
  zipCode?: string;
  bio: string;
  selfAsFriend: string;
  idealFriend: string;
  participationPlan: string;
  wechatId: string;
  referralSource?: string;
  coverImage?: File;
}
