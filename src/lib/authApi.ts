import type { AuthUser, RegisterPayload } from '@/types/auth';
import { WALKTHROUGH_USER } from '@/auth/AuthContext';
import { getUserByEmail } from '@/lib/domainApi';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '';

function getApiUrl(path: string): string {
  if (!apiBaseUrl) {
    return path;
  }

  const normalizedBase = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
  return `${normalizedBase}${path}`;
}

export async function registerUser(payload: RegisterPayload): Promise<AuthUser> {
  const response = await fetch(getApiUrl('/api/users'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? '注册失败，请稍后再试');
  }

  return {
    id: data._id,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    bio: data.bio,
    role: data.role,
    coverImageUrl: data.cover_image_url,
  };
}

export async function loginUser(email: string): Promise<AuthUser> {
  const normalizedEmail = email.trim().toLowerCase();

  // Accept both the old test email and the real seeded email
  const walkthroughEmails = ['cm@gmail.com', 'yuan@chuanmen.app'];
  if (walkthroughEmails.includes(normalizedEmail)) {
    // Try to resolve from real DB first
    try {
      const dbUser = await getUserByEmail(WALKTHROUGH_USER.email);
      return {
        ...WALKTHROUGH_USER,
        id: dbUser.id,
        name: dbUser.name ?? WALKTHROUGH_USER.name,
        avatar: (dbUser.avatar as string) || WALKTHROUGH_USER.avatar,
        role: (dbUser.role as string) || WALKTHROUGH_USER.role,
      };
    } catch {
      // API unavailable — fall back to hardcoded user
      return WALKTHROUGH_USER;
    }
  }

  // Only the walkthrough account is allowed in demo mode
  throw new Error('当前仅支持测试账号 cm@gmail.com 登录');

  const response = await fetch(getApiUrl('/api/auth/login'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.message ?? '登录失败，请稍后再试');
  }

  return {
    id: data._id,
    name: data.name,
    email: data.email,
    avatar: data.avatar,
    bio: data.bio,
    role: data.role,
  };
}
