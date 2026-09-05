import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  catalogChanges,
  check,
  getSyncRuns,
  validateChanges,
  validateSyncBaseline,
} from "./validate-sync-contract.mjs";

const SHA = "a".repeat(40);
const FILE = "open-db/Monitor/part.json";
function part(version = 1) {
  return {
    opendb_id: "part",
    metadata: { part_numbers: ["model-a"] },
    identifiers: { version, identifiers: [], retailer_listings: [] },
  };
}
function update(before, after) {
  return [{ oldPath: FILE, newPath: FILE, before, after }];
}
function run(sha = SHA, conclusion = "success", status = "completed") {
  return { id: 1, head_sha: sha, head_branch: "main", event: "push", status, conclusion };
}

test("rejects regressed and prematurely incremented versions; accepts the base version", () => {
  for (const incoming of [1, 3])
    assert.match(validateChanges(update(part(2), part(incoming))).errors[0], /differs from base/);
  assert.deepEqual(validateChanges(update(part(2), part(2))).errors, []);
});

test("expected_version takes precedence, matching the importer", () => {
  const after = part(1);
  after.identifiers.expected_version = 2;
  assert.deepEqual(validateChanges(update(part(2), after)).errors, []);
  after.identifiers.expected_version = 1;
  assert.match(validateChanges(update(part(2), after)).errors[0], /differs from base/);
});

test("missing/invalid versions and part-number changes without identity fail", () => {
  for (const invalid of [undefined, -1, 1.5, "2"]) {
    assert.match(
      validateChanges(update(part(2), part(invalid === undefined ? null : invalid))).errors[0],
      /non-negative integer/,
    );
  }
  const before = part();
  const after = { opendb_id: "part", metadata: { part_numbers: ["model-b"] } };
  assert.match(validateChanges(update(before, after)).errors[0], /full identifiers snapshot/);
  after.metadata.part_numbers = ["model-a"];
  assert.deepEqual(validateChanges(update(before, after)).errors, []);
});

test("rejects identity replacement and same-ID category moves", () => {
  assert.match(
    validateChanges(update(part(), { ...part(), opendb_id: "other" })).errors[0],
    /cannot change/,
  );
  const changes = update(part(), part());
  changes[0].newPath = "open-db/Mouse/part.json";
  assert.match(validateChanges(changes).errors[0], /category moves/);
});

test("failed/missing/pending sync blocks a repo baseline even when versions match", () => {
  assert.deepEqual(validateChanges(update(part(), part())).errors, []);
  for (const runs of [
    [],
    [run(SHA, "failure")],
    [run(SHA, null, "in_progress")],
    [run("b".repeat(40))],
  ]) {
    assert.match(validateSyncBaseline(runs, SHA), /not a confirmed sync baseline/);
  }
  assert.equal(validateSyncBaseline([run()], SHA), null);
  assert.match(validateSyncBaseline([run(), { ...run(SHA, "failure"), id: 2 }], SHA), /failure/);
  assert.throws(() => validateSyncBaseline({}, SHA));
});

test("GitHub lookup is a bounded read of the fixed workflow and fails closed", async () => {
  const runs = await getSyncRuns(SHA, async (url, options) => {
    assert.equal(url.origin, "https://api.github.com");
    assert.match(
      url.pathname,
      /buildcores\/buildcores-open-db\/actions\/workflows\/on-commit-to-main.yaml\/runs$/,
    );
    assert.equal(url.searchParams.get("head_sha"), SHA);
    assert.equal(options.method, undefined); // fetch defaults to GET; no catalog writes.
    assert.equal(options.redirect, "error");
    return { ok: true, json: async () => ({ total_count: 1, workflow_runs: [run()] }) };
  });
  assert.equal(validateSyncBaseline(runs, SHA), null);
  await assert.rejects(
    getSyncRuns(SHA, async () => ({ ok: false, status: 403 })),
    /GitHub HTTP 403/,
  );
  await assert.rejects(
    getSyncRuns(SHA, async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});

test("real Git diff handles deletes/renames and unrelated successful imports cannot hide failed creates", async () => {
  const cwd = mkdtempSync(path.join(tmpdir(), "opendb-sync-test-"));
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
  const write = (file, value) => {
    mkdirSync(path.dirname(path.join(cwd, file)), { recursive: true });
    writeFileSync(path.join(cwd, file), JSON.stringify(value));
  };
  const commit = () => {
    git("add", ".");
    git(
      "-c",
      "user.name=Test",
      "-c",
      "user.email=test@example.invalid",
      "commit",
      "-qm",
      "fixture",
    );
    return git("rev-parse", "HEAD");
  };
  git("init", "-q");
  write(FILE, part(2));
  write("open-db/Monitor/delete me.json", { ...part(), opendb_id: "deleted" });
  const catalogBase = commit();
  write("open-db/Mouse/unrelated.json", { ...part(), opendb_id: "unrelated" });
  commit();
  write("notes.json", {});
  const base = commit();
  write("open-db/Monitor/renamed part.json", part(2));
  unlinkSync(path.join(cwd, FILE));
  unlinkSync(path.join(cwd, "open-db/Monitor/delete me.json"));
  const head = commit();
  const changes = catalogChanges(base, head, cwd);
  assert.equal(changes.length, 2);
  assert.equal(validateChanges(changes).deletes, 1);
  const result = await check({
    base,
    head,
    cwd,
    loadRuns: async (sha) => {
      assert.equal(sha, catalogBase);
      return [run(sha, "failure")];
    },
  });
  assert.equal(result.errors.length, 1);
  assert.match(result.errors[0], /including deletes/);
  const noChanges = await check({
    base: head,
    head,
    cwd,
    loadRuns: () => {
      throw new Error("must not call GitHub");
    },
  });
  assert.equal(noChanges.count, 0);

  // Keep the ID but replace enough content that Git cannot infer a rename.
  write("open-db/Keyboard/reclassified.json", {
    ...part(2),
    metadata: { part_numbers: ["different-model"], description: "changed content ".repeat(300) },
  });
  unlinkSync(path.join(cwd, "open-db/Monitor/renamed part.json"));
  const movedHead = commit();
  const splitMove = catalogChanges(head, movedHead, cwd);
  assert.equal(splitMove.length, 2);
  assert.ok(splitMove.every((change) => !change.before || !change.after));
  const flagged = validateChanges(splitMove);
  assert.equal(flagged.errors.length, 1);
  assert.match(flagged.errors[0], /same-ID category moves require review/);
  assert.match(flagged.errors[0], /deletion of the original/);
  assert.equal(flagged.deletes, 1);

  // Independent additions/deletions must not be mistaken for a move.
  const independent = splitMove.map((change) =>
    change.after
      ? { ...change, after: { ...change.after, opendb_id: "unrelated-new-id" } }
      : change,
  );
  assert.deepEqual(validateChanges(independent).errors, []);
});
