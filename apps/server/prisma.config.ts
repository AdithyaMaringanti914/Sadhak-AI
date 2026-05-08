import { defineConfig } from '@prisma/sdk';

export default defineConfig({
  schema: './prisma/schema.prisma',
  datasource: {
    url: process.env.DATABASE_URL || 'file:./dev.db'
  }
});
