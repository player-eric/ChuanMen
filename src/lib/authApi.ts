import type { AuthUser, RegisterPayload } from '@/types/auth';

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
  };
}

export async function loginUser(email: string): Promise<AuthUser> {
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
