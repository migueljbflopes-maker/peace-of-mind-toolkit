---
description: Take the next unblocked backlog task through implement, verify and commit
---

Run one iteration of the delivery loop. Argument, if given, is a task ID:
$ARGUMENTS

1. Read `CLAUDE.md` and `docs/backlog.md`. Pick the task: the ID given, or the
   first `todo` task whose "Needs" are all `done`. Skip tasks tagged `[HUMAN]`
   or `[DECISION]` that are waiting on the owner, and list them at the end.
   If nothing is unblocked, say what is blocking and stop.
2. Create a branch `task/<id>-<short-name>` from `main`. Set the task to
   `doing`.
3. Give the task to the `implementer` agent.
4. If the task is tagged `[PRIVACY]` or touches storage, sync, edge functions,
   AI calls or privacy claims, give the diff to the `privacy-reviewer` agent.
5. Give the diff to the `verifier` agent.
6. On any `REJECT`, send the findings back to the `implementer` and repeat
   from step 4. After three rejections, set the task to `blocked` with the
   reason, and stop.
7. On `PASS`: set the task to `done`, commit, push the branch and open a pull
   request whose description lists each acceptance criterion with the test
   that proves it.
8. Report in a few lines: the task, the result, the pull request, and which
   tasks are now unblocked.

Do one task per run. Independent unblocked tasks may be run in parallel, each
in its own git worktree.
