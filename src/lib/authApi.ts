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

  // Walkthrough emails get special handling (fallback to hardcoded user)
  const walkthroughEmails = ['cm@gmail.com', 'yuan@chuanmen.app'];
  if (walkthroughEmails.includes(normalizedEmail)) {
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
      return WALKTHROUGH_USER;
    }
  }

  // All other emails — look up in real DB
  try {
    const dbUser = await getUserByEmail(normalizedEmail);
    return {
      id: dbUser.id,
      name: dbUser.name ?? '',
      email: dbUser.email ?? normalizedEmail,
      avatar: (dbUser.avatar as string) || undefined,
      bio: (dbUser.bio as string) || undefined,
      role: (dbUser.role as string) || 'member',
    };
  } catch (err: unknown) {
    // Distinguish 404 (not registered) from network errors
    if (err && typeof err === 'object' && 'status' in err && (err as any).status === 404) {
      throw new Error('该邮箱未注册，请先申请加入');
    }
    throw new Error('网络错误，请稍后重试');
  }
}
