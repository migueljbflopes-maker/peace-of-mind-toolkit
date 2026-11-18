// TEMPORARY (backlog A-13). Reads the Playwright traces of an old, failed CI
// run (its playwright-report artifact) and prints, for the frozen-features
// test, which page it was on when `networkidle` never came and what the
// network log holds for that page.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
const lines = (file) =>
  fs
    .readFileSync(file, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
const isLocal = (url) => /^https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(url) || /^(data|blob):/.test(url);

for (const root of process.argv.slice(2)) {
  if (!fs.existsSync(root)) {
    console.log(`A13T ${root}: not downloaded`);
    continue;
  }
  const zips = walk(root).filter((file) => file.endsWith(".zip"));
  console.log(`A13T ${root}: ${zips.length} zip files`);
  for (const zip of zips) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "a13-"));
    try {
      execFileSync("unzip", ["-o", "-q", zip, "-d", dir]);
    } catch {
      continue;
    }
    const files = fs.readdirSync(dir);
    for (const traceFile of files.filter((file) => /^\d+-trace\.trace$/.test(file))) {
      const events = lines(path.join(dir, traceFile));
      const options = events.find((event) => event.type === "context-options");
      if (!options?.title || !/before buying/.test(options.title) || !options.browserName) continue;
      console.log(`\nA13T TRACE ${zip} ${traceFile}: ${options.title} (Playwright ${options.playwrightVersion})`);
      const toWall = (monotonic) => options.wallTime + (monotonic - options.monotonicTime);

      const ends = new Map(events.filter((event) => event.type === "after").map((event) => [event.callId, event]));
      const calls = events.filter(
        (event) => event.type === "before" && ["goto", "waitForLoadState", "waitForEventInfo"].includes(event.method),
      );
      let lastGoto = null;
      for (const call of calls) {
        const end = ends.get(call.callId);
        const took = end ? `${Math.round(end.endTime - call.startTime)} ms` : "NEVER ENDED";
        const failed = end?.error ? ` ERROR ${JSON.stringify(end.error).slice(0, 160)}` : "";
        console.log(
          `A13T   +${Math.round(call.startTime - options.monotonicTime)} ms ${call.method} ${JSON.stringify(call.params).slice(0, 120)}: ${took}${failed}`,
        );
        if (call.method === "goto") lastGoto = call;
      }
      const lastEvent = events.reduce((max, event) => Math.max(max, event.time ?? event.endTime ?? event.startTime ?? 0), 0);
      console.log(`A13T   last event of the trace at +${Math.round(lastEvent - options.monotonicTime)} ms`);
      if (!lastGoto) continue;

      const from = toWall(lastGoto.startTime);
      const network = lines(path.join(dir, traceFile.replace(".trace", ".network")))
        .filter((entry) => entry.type === "resource-snapshot")
        .map((entry) => entry.snapshot)
        .map((snapshot) => ({
          start: Date.parse(snapshot.startedDateTime) - from,
          time: Math.round(snapshot.time),
          status: snapshot.response?.status,
          failure: snapshot.response?._failureText ?? "",
          method: snapshot.request?.method,
          url: String(snapshot.request?.url).slice(0, 130),
          worker: snapshot._serviceWorker ? " (service worker)" : "",
        }));
      const during = network.filter((entry) => entry.start >= -50).sort((a, b) => a.start - b.start);
      console.log(
        `A13T   network log after the last goto (${lastGoto.params.url}): ${during.length} entries, ${during.filter((entry) => !isLocal(entry.url)).length} outside; whole trace ${network.length}`,
      );
      for (const entry of during) {
        console.log(
          `A13T     ${Math.round(entry.start)}..${entry.time < 0 ? "?" : Math.round(entry.start + entry.time)} ${entry.status} ${entry.failure} ${entry.method} ${entry.url}${entry.worker}`,
        );
      }
      const odd = network.filter((entry) => entry.time < 0 || !(entry.status > 0));
      console.log(`A13T   entries of the whole trace with no status or no duration: ${odd.length}`);
      for (const entry of odd.slice(0, 40)) {
        console.log(`A13T     ${Math.round(entry.start)} ${entry.status} ${entry.failure} ${entry.method} ${entry.url}${entry.worker}`);
      }
      const frames = events
        .filter((event) => event.type === "frame-snapshot" && event.snapshot?.frameUrl)
        .map((event) => event.snapshot.frameUrl.slice(0, 90));
      console.log(`A13T   frames snapshotted: ${[...new Set(frames)].join(" | ")}`);
    }
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
