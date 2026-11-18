// After a deploy: delete from the hosted project the edge functions that are
// no longer in supabase/functions (backlog A-07).
//
// `supabase functions deploy` only uploads. A function whose directory was
// removed from the repository stays deployed, and stays callable by anyone
// who knows its address, until it is deleted from the project.
//
//   SUPABASE_ACCESS_TOKEN=... node scripts/prune-deployed-functions.mjs <project-ref> [--dry-run]
//
// It uses the Supabase Management API, the one the CLI itself talks to:
//   GET    /v1/projects/{ref}/functions
//   DELETE /v1/projects/{ref}/functions/{slug}
//
// What it will not do:
//  - delete a function that has a directory under supabase/functions, whatever
//    is or is not inside that directory (every directory whose name does not
//    start with "_" is protected, with or without an index.ts);
//  - delete anything when a deployed name differs from a directory only by
//    upper and lower case: which of the two is meant cannot be known;
//  - delete anything when the list of deployed functions cannot be read, is
//    not the expected shape, or does not contain every function of the
//    repository (after a deploy it must: otherwise this is the wrong project
//    or a partial answer, and comparing against it proves nothing);
//  - delete anything when supabase/functions is empty or unreadable.
// In each of those cases it deletes nothing and exits with an error, so the
// run is red and somebody looks.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { listFunctions } from "./smoke-deployed-functions.mjs";

const API = "https://api.supabase.com";
const FUNCTIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../supabase/functions");

// The slugs the Management API accepts, upper case included (its reference
// gives ^[A-Za-z][A-Za-z0-9_-]*$; a leading digit is allowed here as well,
// since directory names may have one). Names are compared exactly. Anything
// else in the list (a flag, a path) means the list is not what it should be.
const NAME = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

/**
 * Every directory under supabase/functions that could be a function: all of
 * them but the shared code ("_shared"). A directory with no index.ts counts.
 */
export function listProtected(dir = FUNCTIONS_DIR) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("_"))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Which deployed functions to delete. Pure: no network, no file system.
 *
 *   deployed    the project's functions, as the Management API lists them
 *   local       the functions the deploy just uploaded (directories with an
 *               index.ts): each must be in the deployed list
 *   protectedNames  every directory under supabase/functions: none of them
 *               is ever deleted. Defaults to `local`.
 *
 * Returns { remove: string[] } or { refuse: string }.
 */
export function plan(deployed, local, protectedNames = local) {
  if (!Array.isArray(local) || local.length === 0) {
    return { refuse: "no function found in supabase/functions: refusing to compare against nothing" };
  }
  if (!Array.isArray(protectedNames)) {
    return { refuse: "the directories under supabase/functions could not be listed" };
  }
  const keep = new Set([...local, ...protectedNames]);
  if (!Array.isArray(deployed)) {
    return { refuse: "the list of deployed functions is not a list" };
  }
  const slugs = [];
  for (const entry of deployed) {
    if (!entry || typeof entry.slug !== "string" || !NAME.test(entry.slug)) {
      return { refuse: `an entry of the deployed list has no usable slug: ${JSON.stringify(entry)?.slice(0, 120)}` };
    }
    // A function already removed on the platform's side is not ours to delete again.
    if (entry.status === "REMOVED") continue;
    slugs.push(entry.slug);
  }
  const missing = local.filter((name) => !slugs.includes(name));
  if (missing.length) {
    return {
      refuse:
        `the deployed list lacks ${missing.length} function(s) of the repository (${missing.join(", ")}): ` +
        "it cannot be the project that was just deployed to, or the answer is partial",
    };
  }
  const remove = [...new Set(slugs)].filter((slug) => !keep.has(slug)).sort();
  const lowerKept = new Map([...keep].map((name) => [name.toLowerCase(), name]));
  const ambiguous = remove.filter((slug) => lowerKept.has(slug.toLowerCase()));
  if (ambiguous.length) {
    return {
      refuse:
        `deployed function(s) ${ambiguous.join(", ")} differ only by case from ` +
        `${ambiguous.map((slug) => lowerKept.get(slug.toLowerCase())).join(", ")} in supabase/functions`,
    };
  }
  return { remove };
}

async function api(method, path, token, fetchImpl) {
  const response = await fetchImpl(`${API}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(60_000),
  });
  const text = await response.text();
  return { status: response.status, text };
}

async function deployedFunctions(ref, token, fetchImpl) {
  const { status, text } = await api("GET", `/v1/projects/${ref}/functions`, token, fetchImpl);
  if (status !== 200) throw new Error(`listing the deployed functions answered ${status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

/**
 * Returns the process exit code. Everything it depends on can be passed in,
 * which is how scripts/prune-deployed-functions.test.mjs drives it.
 */
export async function prune({
  ref,
  token,
  dryRun = false,
  local = listFunctions(),
  protectedNames = listProtected(),
  fetchImpl = fetch,
  log = console.log,
}) {
  if (!/^[a-z0-9]{20}$/.test(ref ?? "")) {
    log("usage: prune-deployed-functions.mjs <project-ref> [--dry-run]");
    return 2;
  }
  if (!token) {
    log("SUPABASE_ACCESS_TOKEN is not set: nothing deleted");
    return 2;
  }

  // In a dry run nothing but a GET can leave this process, whatever the code
  // below does.
  const send = dryRun
    ? (url, init) => {
        if (init?.method !== "GET") throw new Error(`dry run: refusing to send ${init?.method}`);
        return fetchImpl(url, init);
      }
    : fetchImpl;

  let decision;
  try {
    decision = plan(await deployedFunctions(ref, token, send), local, protectedNames);
  } catch (error) {
    log(`could not read the deployed functions: ${error.message}\nnothing deleted`);
    return 1;
  }
  if (decision.refuse) {
    log(`${decision.refuse}\nnothing deleted`);
    return 1;
  }

  const { remove } = decision;
  log(`${local.length} functions in supabase/functions, ${remove.length} deployed function(s) not among them`);
  if (remove.length === 0) return 0;
  for (const slug of remove) log(`${dryRun ? "would delete" : "deleting"}  ${slug}`);
  // A dry run stops here: the only request it has made is the GET above.
  if (dryRun) return 0;

  let failed = 0;
  for (const slug of remove) {
    // Said twice on purpose: nothing with a directory in the repository goes.
    if (local.includes(slug) || protectedNames.includes(slug)) {
      throw new Error(`refusing to delete ${slug}: it is in supabase/functions`);
    }
    try {
      const { status, text } = await api("DELETE", `/v1/projects/${ref}/functions/${slug}`, token, send);
      if (status === 200 || status === 204) {
        log(`deleted   ${slug}`);
      } else {
        failed++;
        log(`FAILED    ${slug}: ${status} ${text.slice(0, 200)}`);
      }
    } catch (error) {
      failed++;
      log(`FAILED    ${slug}: ${error.message}`);
    }
  }

  // Believe the project, not the answers to the deletes.
  try {
    const after = plan(await deployedFunctions(ref, token, send), local, protectedNames);
    if (after.refuse) {
      log(`after deleting: ${after.refuse}`);
      return 1;
    }
    if (after.remove.length) {
      log(`still deployed and not in the repository: ${after.remove.join(", ")}`);
      return 1;
    }
    log(`the project now has exactly the ${local.length} functions of the repository`);
  } catch (error) {
    log(`could not read the deployed functions again: ${error.message}`);
    return 1;
  }
  return failed ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const [ref] = args.filter((arg) => !arg.startsWith("--"));
  process.exit(await prune({ ref, token: process.env.SUPABASE_ACCESS_TOKEN, dryRun }));
}
