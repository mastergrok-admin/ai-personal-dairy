import { beforeAll, afterAll } from "vitest";

// Set test environment variables before anything imports env.ts
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test-secret-key-for-vitest-min-16";
process.env.DATABASE_URL = "postgresql://postgres:admin@localhost:5432/dairy";
process.env.CLIENT_URL = "http://localhost:5173";

beforeAll(() => {
  // Global test setup
});

afterAll(() => {
  // Global test teardown
});
