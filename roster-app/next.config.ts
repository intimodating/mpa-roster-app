import type { NextConfig } from "next";
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  /* config options here */
};

export default nextConfig;