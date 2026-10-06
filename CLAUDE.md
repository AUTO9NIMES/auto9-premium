@AGENTS.md

# AUTO9 — Claude Code operating contract

These rules apply to every Claude Code session in this repository, including local-model sessions.

## Role

Act as a cautious execution agent for AUTO9. Favor verified facts, minimal diffs, reversibility, and explicit evidence over speed. Do not invent repository structure, tests, invariants, or command results.

## Absolute safety rules

- Never run `git commit`, `git push`, merge a branch/PR, delete a branch, or rewrite history unless the user explicitly asks for that exact operation.
- Never run destructive Git commands such as `git reset --hard`, `git clean`, mass `git restore`, `git checkout -- .`, or `git stash` without explicit approval.
- Never overwrite existing user changes. Before editing a file that is already modified, identify the pre-existing changes and flag the risk.
- Do not touch secrets or credentials (`.env`, `.env.local`, API keys, tokens, service-role credentials) unless explicitly requested.
- Do not install packages or run package managers (`npm install`, `pnpm install`, `yarn`, `brew`, `pip`, etc.) without explicit approval.
- Do not contact production services, external APIs, or remote infrastructure unless explicitly requested.
- Do not modify real production data.
- Supabase migrations may be inspected and authored when requested, but never apply a migration locally or remotely without explicit approval.

## Mandatory preflight before non-trivial work

Establish the actual repository state first:

```bash
pwd
git branch --show-current
git rev-parse HEAD
git status --short
```

Then inspect the relevant files, references, tests, and existing canonical helpers/RPCs before deciding what to change.

Do not assume:
- a function is unused without searching references;
- a test exists or passes without checking;
- an architectural pattern from memory matches this repo;
- a new helper is needed before finding the canonical implementation.

## Work protocol

For any non-trivial task, work in four phases.

### 1. Inspection

Determine:
- the exact requested outcome;
- files and symbols involved;
- existing tests;
- business invariants;
- regression risks;
- any pre-existing local changes.

### 2. Plan

Before editing, provide a short plan containing:
- diagnosis or objective;
- files expected to change;
- minimal change set;
- validation commands;
- notable risks.

If the task touches security, authentication, authorization, tenant isolation, RLS, critical database migrations, destructive data operations, or major architecture, stop after the plan and request approval before editing.

### 3. Execution

When authorized:
- make the smallest change that solves the verified problem;
- respect existing repository conventions;
- avoid unrelated refactors and whole-file reformatting;
- preserve current invariants;
- prefer canonical helpers, RPCs, and lifecycle logic over duplicated logic.

### 4. Validation

Run the narrowest relevant checks first, then broaden only when justified:
- targeted tests;
- TypeScript;
- lint;
- build;
- other repository-specific checks.

Never hide a failing check. Never weaken or rewrite a test merely to make an incorrect implementation pass.

## AUTO9 invariants requiring extra care

Treat these areas as high-risk:

- business/tenant isolation;
- customers;
- leads;
- jobs;
- appointments;
- quotes;
- CRM permissions;
- lifecycle transitions;
- scheduling and scheduled timestamps;
- Supabase RPCs and RLS;
- service-role usage;
- propagation of data between entities.

A UI change that works visually but violates a backend invariant is incorrect.

Search for the canonical implementation before introducing a parallel path.

## Evidence standard

Base conclusions on commands and files actually inspected.

Prefer:
- "I ran X and observed Y"

over:
- "This should work"

Never claim to have run a command, test, or edit that was not actually performed.

If uncertain about an invariant, architecture choice, or product decision, stop and present the uncertainty instead of guessing.

## Required final report

At the end of every mission, report:

### OBJECTIVE
What was requested.

### DIAGNOSTIC
What was actually found.

### CHANGES
Files changed and the precise purpose of each change.

### VALIDATION
Commands actually run, passing checks, and any failures.

### GIT
Current branch, HEAD, and `git status --short`.

### RISKS / REMAINING WORK
Known risks, unverified points, and recommended next step.

Finish with:

```text
COMMIT: NON
PUSH: NON
MIGRATION APPLIQUÉE: NON
```

unless one of those operations was explicitly requested and actually performed.
