import { client } from '../generated/client.gen.ts';
import type { BearerResponse } from '../generated/types.gen.ts';

client.setConfig({ baseUrl: import.meta.env.VITE_BASE_URL });

let cachedToken: string | null = null;

async function getToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const body = new URLSearchParams({
    username: import.meta.env.VITE_USERNAME,
    password: import.meta.env.VITE_PASSWORD,
  });
  const res = await fetch(`${import.meta.env.VITE_BASE_URL}/api/system/auth/jwt/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json = (await res.json()) as BearerResponse;
  if (!json.access_token) throw new Error('Authentication failed');
  cachedToken = json.access_token;
  return cachedToken;
}

client.interceptors.request.use(async (request) => {
  const token = await getToken();
  request.headers.set('Authorization', `Bearer ${token}`);
  return request;
});
