import { execSync } from "node:child_process";
import type { NextConfig } from "next";

// Resolve the current git commit so the Settings page can show and link the
// exact build. Falls back to a manually provided NEXT_PUBLIC_GIT_COMMIT (e.g.
// set by CI without git metadata); empty when neither is available, in which
// case the UI shows a non-linked "development build" label.
function gitSha(): string {
  try {
    return execSync("git rev-parse HEAD").toString().trim();
  } catch {
    return process.env.NEXT_PUBLIC_GIT_COMMIT ?? "";
  }
}

const sha = gitSha();

const nextConfig: NextConfig = {
  env: {
    // Inlined into the client bundle at build time (NEXT_PUBLIC_* convention).
    ...(sha
      ? {
          NEXT_PUBLIC_GIT_COMMIT: sha,
          NEXT_PUBLIC_GIT_COMMIT_SHORT: sha.slice(0, 7),
        }
      : {}),
    NEXT_PUBLIC_REPO_URL: process.env.NEXT_PUBLIC_REPO_URL ?? "https://github.com/duckida/ideas",
  },
};

export default nextConfig;
