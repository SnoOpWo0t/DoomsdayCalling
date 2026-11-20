// Vercel serverless function: every /api/* request is rewritten here (see
// vercel.json) and handled by the same Express app the server uses locally.
// The TypeScript server is compiled to server/dist during the build.
export { default } from '../server/dist/vercel.js';
