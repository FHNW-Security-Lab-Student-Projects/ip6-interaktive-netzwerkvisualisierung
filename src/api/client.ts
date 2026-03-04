import { client } from '../generated/client.gen.ts';
import { authJwtLogin } from '../generated/sdk.gen.ts';

client.setConfig({ baseUrl: import.meta.env.VITE_BASE_URL });

async function getToken(): Promise<string> {
  const { data } = await authJwtLogin({
    body: {
      username: import.meta.env.VITE_USERNAME,
      password: import.meta.env.VITE_PASSWORD,
    },
  });
  if (!data?.access_token) throw new Error('Authentication failed');
  return data.access_token;
}

client.interceptors.request.use(async (request) => {
  const token = await getToken();
  request.headers.set('Authorization', `Bearer ${token}`);
  return request;
});
