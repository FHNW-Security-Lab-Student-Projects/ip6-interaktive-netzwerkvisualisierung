import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'https://fastapi1.cybersec-fhnw.org/api/openapi.json',
  output: {
    path: 'src/generated',
    postProcess: ['prettier'],
  },
  plugins: ['@hey-api/client-fetch'],
});
