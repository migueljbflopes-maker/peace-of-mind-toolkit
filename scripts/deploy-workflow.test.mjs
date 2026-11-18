// Backlog A-07. The conditions of the steps in the Supabase deploy workflow.
//
// The last step deletes edge functions from the production project. It must
// run only from main, only after a full deploy whose functions booted, and
// never in a dry run. The dry run must do nothing but read.
//
// The workflow file is read, each step's `if:` is evaluated for every
// combination of event, branch and inputs, and the steps that would run are
// compared with what is allowed. GitHub's expression syntax for these
// conditions (==, !=, !, &&, ||, parentheses, 'strings') is also JavaScript,
// which is how they are evaluated here; a condition using anything else
// fails the test rather than being guessed at.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const FILE = path.resolve(".github/workflows/supabase-deploy.yml");
const text = fs.readFileSync(FILE, "utf8");

/** The steps of the job, in order: { label, if, body }. */
function readSteps(source) {
  const lines = source.split("\n");
  const start = lines.findIndex((line) => line === "    steps:");
  if (start < 0) throw new Error("no steps: in the workflow");
  const steps = [];
  for (const line of lines.slice(start + 1)) {
    if (/^ {6}- /.test(line)) steps.push([line.replace(/^ {6}- /, "        ")]);
    else if (/^ {6}#/.test(line) || line.trim() === "") continue;
    else if (/^ {8}/.test(line) && steps.length) steps.at(-1).push(line);
    else throw new Error(`unexpected line in steps: ${line}`);
  }
  return steps.map((stepLines) => {
    const body = stepLines.join("\n");
    const field = (key) => {
      const match = new RegExp(`^ {8}${key}: (.*)$`, "m").exec(body);
      if (!match) return undefined;
      const value = match[1].trim();
      return /^".*"$/.test(value) ? JSON.parse(value) : value;
    };
    const condition = field("if");
    if (condition !== undefined && /^[>|]/.test(condition)) throw new Error("multi-line if: is not supported here");
    return { label: field("name") ?? field("uses"), if: condition, body };
  });
}

const ALLOWED_IN_CONDITION = /^(?:\s|[()!]|&&|\|\||==|!=|'[^']*'|github\.event_name|github\.ref|inputs\.(?:functions|only|prune_dry_run))+$/;

/** Does the step run in this context? A step with no `if:` always does. */
function runs(step, context) {
  if (step.if === undefined) return true;
  if (!ALLOWED_IN_CONDITION.test(step.if)) throw new Error(`cannot evaluate: ${step.if}`);
  // GitHub compares loosely and treats '' and null as false, as JavaScript does.
  return Boolean(new Function("github", "inputs", `return (${step.if});`)(context.github, context.inputs));
}

const steps = readSteps(text);
const byLabel = (pattern) => {
  const found = steps.filter((step) => pattern.test(step.label));
  if (found.length !== 1) throw new Error(`${found.length} steps match ${pattern}`);
  return found[0];
};

const PRUNE = byLabel(/deleted from the project/);
const DRY = byLabel(/^Dry run/);
const DEPLOY = byLabel(/^Deploy edge functions$/);
const BOOT = byLabel(/^The deployed functions boot$/);
const MIGRATE = byLabel(/^Apply migrations$/);

const MAIN = "refs/heads/main";
const BRANCHES = [MAIN, "refs/heads/task/behind-main", "refs/heads/main-2", "refs/tags/main", "refs/pull/1/merge"];

/** Every way the workflow can be started. */
function contexts() {
  const all = [];
  // A push: only main triggers it, and a push has no inputs (GitHub reads
  // a missing input as an empty value).
  all.push({ github: { event_name: "push", ref: MAIN }, inputs: { functions: "", only: "", prune_dry_run: "" } });
  for (const ref of BRANCHES) {
    for (const functions of [true, false]) {
      for (const only of ["", "panic-trigger", "panic-trigger checkin-cron"]) {
        for (const prune_dry_run of [true, false]) {
          all.push({ github: { event_name: "workflow_dispatch", ref }, inputs: { functions, only, prune_dry_run } });
        }
      }
    }
  }
  return all;
}

const describeContext = (context) =>
  `${context.github.event_name} on ${context.github.ref} ${JSON.stringify(context.inputs)}`;

describe("the Supabase deploy workflow", () => {
  it("is read: the steps and their conditions", () => {
    expect(steps.map((step) => step.label)).toEqual([
      "actions/checkout@v4",
      "supabase/setup-cli@v1",
      "Read project ref",
      "Link project",
      "Apply migrations",
      "Docker is available to bundle the functions",
      "The functions asked for exist",
      "Deploy edge functions",
      "actions/setup-node@v4",
      "The deployed functions boot",
      "Functions removed from the repository are deleted from the project",
      "Dry run: which deployed functions have no directory in this branch",
    ]);
    expect(contexts()).toHaveLength(61);
    expect(text).toMatch(/^ {2}push:\n {4}branches: \[main\]$/m);
    expect(text).toMatch(/^ {6}prune_dry_run:\n(?: {8}.*\n)*? {8}type: boolean\n {8}default: false$/m);
  });

  it("the step that deletes runs the script without --dry-run, and the dry run with it", () => {
    expect(PRUNE.body).toMatch(/run: node scripts\/prune-deployed-functions\.mjs "\$\{\{ steps\.ref\.outputs\.ref \}\}"$/m);
    expect(PRUNE.body).not.toContain("--dry-run");
    expect(DRY.body).toMatch(/run: node scripts\/prune-deployed-functions\.mjs "\$\{\{ steps\.ref\.outputs\.ref \}\}" --dry-run$/m);
    // Only these two steps run the script.
    expect(steps.filter((step) => step.body.includes("prune-deployed-functions")).map((s) => s.label)).toEqual([
      PRUNE.label,
      DRY.label,
    ]);
  });

  it("the step that deletes runs only from main", () => {
    const ran = contexts().filter((context) => runs(PRUNE, context));
    expect(ran.length).toBeGreaterThan(0);
    expect(ran.filter((context) => context.github.ref !== MAIN).map(describeContext)).toEqual([]);
    // Said directly as well: the condition names the branch.
    expect(PRUNE.if).toContain("github.ref == 'refs/heads/main'");
    // A manual full deploy from a branch behind main, the case that deleted
    // what main had since gained:
    expect(
      runs(PRUNE, {
        github: { event_name: "workflow_dispatch", ref: "refs/heads/task/behind-main" },
        inputs: { functions: true, only: "", prune_dry_run: false },
      }),
    ).toBe(false);
  });

  it("the step that deletes never runs with `only` set, without the functions, or in a dry run", () => {
    const ran = contexts().filter((context) => runs(PRUNE, context));
    const wrong = ran.filter(
      (context) =>
        context.inputs.prune_dry_run === true ||
        (context.github.event_name !== "push" && (context.inputs.only !== "" || context.inputs.functions !== true)),
    );
    expect(wrong.map(describeContext)).toEqual([]);
  });

  it("the step that deletes comes after the deploy and the boot check, and runs only when both ran", () => {
    expect(steps.indexOf(DEPLOY)).toBeLessThan(steps.indexOf(BOOT));
    expect(steps.indexOf(BOOT)).toBeLessThan(steps.indexOf(PRUNE));
    // No `always()` or `failure()`: a failed deploy or boot check skips it.
    expect(PRUNE.if).not.toMatch(/always|failure|cancelled/);
    expect(PRUNE.body).not.toMatch(/continue-on-error/);
    expect(DEPLOY.body + BOOT.body).not.toMatch(/continue-on-error/);
    for (const context of contexts().filter((c) => runs(PRUNE, c))) {
      expect(runs(DEPLOY, context), describeContext(context)).toBe(true);
      expect(runs(BOOT, context), describeContext(context)).toBe(true);
    }
  });

  it("it does run where it should: a push to main, and a manual full deploy from main", () => {
    const ran = contexts().filter((context) => runs(PRUNE, context)).map(describeContext);
    expect(ran).toEqual([
      `push on ${MAIN} {"functions":"","only":"","prune_dry_run":""}`,
      `workflow_dispatch on ${MAIN} {"functions":true,"only":"","prune_dry_run":false}`,
    ]);
  });

  it("a dry run does nothing but check out, set up Node, read the project ref and run the script with --dry-run", () => {
    const dryRuns = contexts().filter((context) => context.inputs.prune_dry_run === true);
    expect(dryRuns).toHaveLength(30);
    for (const context of dryRuns) {
      expect(steps.filter((step) => runs(step, context)).map((step) => step.label), describeContext(context)).toEqual([
        "actions/checkout@v4",
        "Read project ref",
        "actions/setup-node@v4",
        DRY.label,
      ]);
    }
    // From any branch: that is what it is for.
    expect(new Set(dryRuns.filter((c) => runs(DRY, c)).map((c) => c.github.ref)).size).toBe(BRANCHES.length);
    // The three steps it shares with a deploy change nothing on the project.
    for (const label of ["actions/checkout@v4", "Read project ref", "actions/setup-node@v4"]) {
      const step = steps.find((candidate) => candidate.label === label);
      expect(step.body).not.toMatch(/supabase (link|db|functions)|prune-deployed|smoke-deployed/);
    }
  });

  it("the dry run step runs only when asked for, never on a push", () => {
    const ran = contexts().filter((context) => runs(DRY, context));
    expect(ran.filter((c) => c.inputs.prune_dry_run !== true || c.github.event_name !== "workflow_dispatch")).toEqual([]);
  });

  it("without the dry run, the other steps run as they did before", () => {
    const labels = (context) => steps.filter((step) => runs(step, context)).map((step) => step.label);
    const everything = steps.map((step) => step.label);

    // A push to main: all but the check of `only` and the dry run.
    expect(labels({ github: { event_name: "push", ref: MAIN }, inputs: { functions: "", only: "", prune_dry_run: "" } })).toEqual(
      everything.filter((label) => label !== "The functions asked for exist" && label !== DRY.label),
    );
    // One function from a branch: no migrations, no deletion.
    const one = labels({
      github: { event_name: "workflow_dispatch", ref: "refs/heads/task/behind-main" },
      inputs: { functions: true, only: "panic-trigger", prune_dry_run: false },
    });
    expect(one).toEqual(everything.filter((label) => ![MIGRATE.label, PRUNE.label, DRY.label].includes(label)));
    // Migrations only.
    expect(
      labels({ github: { event_name: "workflow_dispatch", ref: MAIN }, inputs: { functions: false, only: "", prune_dry_run: false } }),
    ).toEqual(["actions/checkout@v4", "supabase/setup-cli@v1", "Read project ref", "Link project", "Apply migrations", "actions/setup-node@v4"]);
  });
});
