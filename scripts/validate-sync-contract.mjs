import { execFileSync } from "node:child_process";
import { isDeepStrictEqual } from "node:util";
import { pathToFileURL } from "node:url";

const CATALOG_PATH = /^open-db\/[^/]+\/[^/]+\.json$/;
const SYNC_WORKFLOW = "on-commit-to-main.yaml";
const REPOSITORY = "buildcores/buildcores-open-db";

function git(args, cwd) {
  return execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
}

function readPart(ref, file, cwd) {
  const part = JSON.parse(git(["show", `${ref}:${file}`], cwd));
  if (
    !part ||
    typeof part !== "object" ||
    Array.isArray(part) ||
    typeof part.opendb_id !== "string"
  ) {
    throw new Error(`Invalid catalog object: ${file}`);
  }
  return part;
}

// Use Git objects, not working-tree files or whitespace-delimited shell lists.
export function catalogChanges(base, head, cwd = process.cwd()) {
  const fields = git(
    ["diff", "--name-status", "-z", "-M", base, head, "--", "open-db/"],
    cwd,
  ).split("\0");
  const changes = [];
  for (let i = 0; i < fields.length - 1; ) {
    const status = fields[i++];
    const oldPath = fields[i++];
    const newPath = status.startsWith("R") ? fields[i++] : oldPath;
    const before =
      status !== "A" && CATALOG_PATH.test(oldPath) ? readPart(base, oldPath, cwd) : null;
    const after =
      status !== "D" && CATALOG_PATH.test(newPath) ? readPart(head, newPath, cwd) : null;
    if (before || after) changes.push({ oldPath, newPath, before, after });
  }
  return changes;
}

function version(snapshot) {
  return typeof snapshot?.expected_version === "number"
    ? snapshot.expected_version
    : snapshot?.version;
}

export function validateChanges(changes) {
  const errors = [];
  let deletes = 0;
  for (const { oldPath, newPath, before, after } of changes) {
    if (before && !after) {
      deletes++;
      continue;
    }
    if (!before || !after) continue;
    if (oldPath === newPath && before.opendb_id !== after.opendb_id) {
      errors.push(
        `${newPath}: opendb_id cannot change in an update; use an explicit delete/create.`,
      );
      continue;
    }
    if (before.opendb_id !== after.opendb_id) {
      deletes++;
      continue; // The main importer treats this rename as create + delete.
    }
    if (oldPath.split("/")[1] !== newPath.split("/")[1]) {
      errors.push(
        `${newPath}: same-ID category moves are sent as updates to the new category, where the part may not exist.`,
      );
      continue;
    }
    const incoming = after.identifiers;
    const baseVersion = before.identifiers?.version;
    if (incoming != null) {
      const expected = version(incoming);
      if (!Number.isInteger(expected) || expected < 0) {
        errors.push(
          `${newPath}: update requires a non-negative integer identifiers.expected_version or identifiers.version.`,
        );
      } else if (!Number.isInteger(baseVersion) || baseVersion < 0) {
        errors.push(
          `${newPath}: base has no identity version; reconcile the base snapshot before editing identity.`,
        );
      } else if (expected !== baseVersion) {
        errors.push(
          `${newPath}: identity version differs from base: expected ${expected}, base ${baseVersion}. Refresh from main; do not guess or increment the version.`,
        );
      }
    } else if (
      !isDeepStrictEqual(before.metadata?.part_numbers ?? [], after.metadata?.part_numbers ?? [])
    ) {
      errors.push(
        `${newPath}: changing metadata.part_numbers requires the full identifiers snapshot and its current version.`,
      );
    }
  }
  return { errors, deletes };
}

export function validateSyncBaseline(runs, sha) {
  if (!Array.isArray(runs)) throw new Error("GitHub returned an invalid workflow-run response.");
  const matching = runs
    .filter((run) => run.head_sha === sha && run.event === "push" && run.head_branch === "main")
    .sort((a, b) => b.id - a.id);
  const latest = matching[0];
  if (!latest || latest.status !== "completed" || latest.conclusion !== "success") {
    const state = latest ? `${latest.status}/${latest.conclusion ?? "pending"}` : "missing";
    return `Main API sync for ${sha.slice(0, 12)} is ${state}. Repository presence and identity versions are not a confirmed sync baseline. Resolve the failed/pending main sync before merging catalog changes (including deletes).`;
  }
  return null;
}

export async function getSyncRuns(sha, request = fetch) {
  const url = new URL(
    `https://api.github.com/repos/${REPOSITORY}/actions/workflows/${SYNC_WORKFLOW}/runs`,
  );
  url.search = new URLSearchParams({
    head_sha: sha,
    branch: "main",
    event: "push",
    per_page: "100",
  });
  const response = await request(url, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "OpenDB-PR-sync-preflight",
      ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
    },
    redirect: "error",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok)
    throw new Error(
      `Cannot verify main sync: GitHub HTTP ${response.status}. Retry when GitHub is available.`,
    );
  const body = await response.json();
  if (body.total_count > 100)
    throw new Error("Too many matching sync runs to establish a baseline.");
  return body.workflow_runs;
}

export async function check({ base, head, cwd = process.cwd(), loadRuns = getSyncRuns }) {
  for (const ref of [base, head]) {
    if (!/^[a-f0-9]{40}$/.test(ref ?? ""))
      throw new Error("Base and head must be full commit SHAs.");
  }
  const changes = catalogChanges(base, head, cwd);
  if (changes.length === 0) return { errors: [], deletes: 0, count: 0 };
  const result = validateChanges(changes);
  // Check the import that established each touched file, not just the newest
  // workflow: a successful unrelated import must not hide a failed creation.
  const baselines = new Map();
  for (const change of changes) {
    if (!change.before) continue;
    const sha = git(
      ["log", "--first-parent", "-1", "--format=%H", base, "--", change.oldPath],
      cwd,
    ).trim();
    if (!sha) throw new Error("Cannot find the base catalog commit.");
    if (!baselines.has(sha)) baselines.set(sha, []);
    baselines.get(sha).push(change.oldPath);
  }
  if (baselines.size > 100)
    throw new Error("Split this PR: more than 100 distinct import baselines need verification.");
  for (const [sha, files] of baselines) {
    const baselineError = validateSyncBaseline(await loadRuns(sha), sha);
    if (baselineError)
      result.errors.push(
        `${baselineError} Affects ${files.length} touched base files, including ${files[0]}.`,
      );
  }
  return { ...result, count: changes.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await check({ base: process.argv[2], head: process.argv[3] });
    console.log(
      `Sync preflight: ${result.count} catalog changes, ${result.deletes} deletes, ${result.errors.length} errors.`,
    );
    for (const error of result.errors) console.log(JSON.stringify(error));
    if (result.count > 0) {
      console.log(
        "Repository/CI preflight only: no production API calls. Live existence, out-of-band identity changes and post-check races are not verified.",
      );
    }
    process.exitCode = result.errors.length ? 1 : 0;
  } catch {
    // Never print raw transport errors, headers, tokens, or untrusted response bodies.
    console.error(
      "Sync preflight could not complete. Check commit inputs, catalog JSON, and GitHub Actions availability; retry rather than bypassing this check.",
    );
    process.exitCode = 1;
  }
}
