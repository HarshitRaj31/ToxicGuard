const express = require("express");
const { execFile } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const execFileAsync = promisify(execFile);
const router = express.Router();
const REPO_ROOT = path.resolve(__dirname, "../..");

async function runGit(args, options = {}) {
  const { stdout, stderr } = await execFileAsync("git", args, {
    cwd: REPO_ROOT,
    env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    ...options,
  });
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

router.get("/status", protect, adminOnly, async (req, res) => {
  try {
    let branch = "main";
    let lastCommit = "No commits yet";
    let remoteUrl = "";
    let modifiedFiles = 0;

    try {
      const branchRes = await runGit(["rev-parse", "--abbrev-ref", "HEAD"]);
      branch = branchRes.stdout || "main";
    } catch {
      branch = "main";
    }

    try {
      const logRes = await runGit(["log", "-1", "--pretty=format:%h — %s (%cr)"]);
      lastCommit = logRes.stdout || "No commits yet";
    } catch {
      lastCommit = "No commits yet";
    }

    try {
      const remoteRes = await runGit(["remote", "get-url", "origin"]);
      remoteUrl = remoteRes.stdout || "";
    } catch {
      remoteUrl = "";
    }

    try {
      const statusRes = await runGit(["status", "--porcelain"]);
      modifiedFiles = statusRes.stdout
        ? statusRes.stdout.split("\n").filter(Boolean).length
        : 0;
    } catch {
      modifiedFiles = 0;
    }

    return res.json({
      initialized: true,
      branch,
      lastCommit,
      remoteUrl,
      modifiedFiles,
    });
  } catch (error) {
    console.error("Git status error:", error.message);
    return res.status(500).json({
      message: "Unable to read Git status.",
    });
  }
});

router.post("/push", protect, adminOnly, async (req, res) => {
  try {
    const {
      repoUrl,
      token,
      branch = "main",
      commitMessage = "Update ToxicGuard full-stack application and fix CORS/API routing",
      force = false,
    } = req.body || {};

    if (typeof repoUrl !== "string" || !repoUrl.trim()) {
      return res.status(400).json({
        message: "Please enter a valid GitHub repository URL.",
      });
    }

    const cleanRepoUrl = repoUrl.trim().replace(/\/+$/, "");
    if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+(\.git)?$/i.test(cleanRepoUrl)) {
      return res.status(400).json({
        message:
          "Repository URL must be a valid HTTPS GitHub URL (e.g., https://github.com/username/repo.git).",
      });
    }

    if (typeof token !== "string" || !token.trim()) {
      return res.status(400).json({
        message: "A GitHub Personal Access Token is required to authenticate the push.",
      });
    }

    const targetBranch =
      typeof branch === "string" && /^[\w./-]+$/.test(branch.trim())
        ? branch.trim()
        : "main";

    // Ensure git user config exists
    try {
      await runGit(["config", "user.name", "ToxicGuard Admin"]);
      await runGit(["config", "user.email", "iamharshit106@gmail.com"]);
    } catch {
      // ignore
    }

    // Stage and commit any pending changes
    const statusRes = await runGit(["status", "--porcelain"]);
    if (statusRes.stdout) {
      await runGit(["add", "-A"]);
      await runGit([
        "commit",
        "-m",
        String(commitMessage || "Update ToxicGuard application").slice(0, 200),
      ]);
    }

    // Configure clean remote URL (never store token in remote URL)
    try {
      await runGit(["remote", "set-url", "origin", cleanRepoUrl]);
    } catch {
      await runGit(["remote", "add", "origin", cleanRepoUrl]);
    }

    const basicAuth = Buffer.from(`x-access-token:${token.trim()}`).toString(
      "base64"
    );

    const pushArgs = [
      "-c",
      `http.https://github.com/.extraheader=AUTHORIZATION: basic ${basicAuth}`,
      "push",
      "-u",
      "origin",
      `HEAD:refs/heads/${targetBranch}`,
    ];

    if (force) {
      pushArgs.push("--force");
    }

    const pushResult = await runGit(pushArgs);

    const logRes = await runGit(["log", "-1", "--pretty=format:%h — %s (%cr)"]);

    return res.status(200).json({
      message: `Successfully pushed to ${cleanRepoUrl} (${targetBranch}).`,
      branch: targetBranch,
      remoteUrl: cleanRepoUrl,
      lastCommit: logRes.stdout,
      details: pushResult.stderr || pushResult.stdout || "Push completed.",
    });
  } catch (error) {
    console.error("Git push error:", error.message);
    const rawErr = String(error.stderr || error.message || "");
    const safeErr = rawErr.replace(/basic\s+[A-Za-z0-9+/=]+/gi, "basic [REDACTED]");

    return res.status(400).json({
      message: safeErr.includes("non-fast-forward")
        ? "Remote contains commits not present locally. Enable 'Force push' to overwrite remote branch."
        : `Git push failed: ${safeErr.slice(0, 300)}`,
    });
  }
});

module.exports = router;
