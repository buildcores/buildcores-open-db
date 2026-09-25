# PR sync preflight

The existing **Validate JSON Against Schemas** workflow now checks the sync contract before schema validation. It reads Git objects for the PR base and proposed merge commit, plus GitHub Actions metadata. It never calls the production catalog API or uses the OpenDB write token.

For catalog changes it checks:

- Updates retain the base identity version, using `expected_version` ahead of `version`, as the importer does. Do not increment versions speculatively: the API owns version increments.
- Part-number edits include the full identity snapshot and version.
- An update does not replace its OpenDB ID. Same-ID category moves are flagged across the complete diff, including heavily edited moves that Git represents as separate additions and deletions. The current importer does not guarantee a successful destination create before deleting the original.
- For each updated, deleted, or renamed base file, the latest run of the main import workflow for its last change on main completed successfully. Failed, canceled, pending, missing, malformed, or inaccessible run evidence blocks the PR. A later documentation-only commit or successful import of unrelated parts cannot hide an earlier failed creation. Checks are deduplicated by commit.

This last check catches the unsafe baseline behind the September 4 rollback: the repository contained parts whose imports had failed, and matching repository version `1` did not prove that the API was still on version `1`. Deleting a file in Git does not establish that the corresponding API part exists. Updates, renames and deletes are blocked while their baseline is unconfirmed; additions still receive schema validation but have no prior import to check. Errors identify the base commit and an affected path so a maintainer can inspect **Detect JSON File Changes and Call API** and reconcile its failed operations before retrying the PR check. A missing run (including an export committed with `[skip ci]`) is deliberately not treated as successful import evidence.

## Limits

This is a conservative repository/CI guard, not an API dry run. A successful main workflow is not a complete repository-to-database parity audit: earlier partial imports, out-of-band changes, and changes after the check can still cause failures. A version difference is rejected conservatively even though the API can accept an identical identity snapshot as an idempotent no-op. The check cannot identify an absent live part from file contents alone, and does not silently turn failed deletes into successes. Merge-time writes keep their existing validation and retry behavior.

No new workflow, environment, service, or secret is required. The existing job uses only read access to contents and Actions; its unused PR-write permission is removed. Catalog-free PRs run the regression tests and skip the baseline lookup. Catalog PRs make one bounded GitHub metadata request per distinct base import, sequentially, with at most 100 imports per PR. The script uses fixed GitHub repository/workflow URLs, a timeout, no redirects, and no response-body or credential logging. Check failures cannot be bypassed through a PR-provided flag.

Run the regression tests with `node --test scripts/validate-sync-contract.test.mjs`. To check a diff, run `node scripts/validate-sync-contract.mjs BASE_SHA HEAD_SHA` with full commit SHAs; `GH_TOKEN` is optional for public metadata reads. Branch protection must require this workflow's `validate-json` job if merges must be blocked; this PR does not modify repository settings.
