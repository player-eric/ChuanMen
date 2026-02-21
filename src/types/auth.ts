export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  role?: string;
}

export interface RegisterPayload {
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
}
