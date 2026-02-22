import type { NextConfig } from "next";
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

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

// Write version.json to public/ so it's served as a static asset.
// The app polls this to detect new deployments without a full-page reload.
const versionFile = path.join(process.cwd(), 'public', 'version.json');
fs.writeFileSync(versionFile, JSON.stringify({ sha }, null, 2));

const nextConfig: NextConfig = {
  output: 'export',
  env: {
    NEXT_PUBLIC_COMMIT_SHA: sha,
    NEXT_PUBLIC_COMMIT_MESSAGE: message,
  },
};

export default nextConfig;
