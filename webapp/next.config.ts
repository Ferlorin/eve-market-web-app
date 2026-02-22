import type { NextConfig } from "next";
import { execSync } from 'child_process';

function getGitInfo(): { sha: string; message: string } {
  try {
    const sha = execSync('git rev-parse --short HEAD').toString().trim();
    const message = execSync('git log -1 --pretty=%s').toString().trim();
    return { sha, message };
  } catch {
    return { sha: 'dev', message: 'local build' };
  }
}

const { sha, message } = getGitInfo();

const nextConfig: NextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_COMMIT_SHA: sha,
    NEXT_PUBLIC_COMMIT_MESSAGE: message,
  },
};

export default nextConfig;
