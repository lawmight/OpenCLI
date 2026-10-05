# OpenCLI suited-build research

throughput checkpoint: n/a, read-only investigation.

## Overview

A suited build is one git pin, a version string other than bare 1.8.7 or bare 1.8.8, and a patch queue that stays unapplied until Tom approves it. The GitHub tag `v1.8.8` is commit `8271afc67e8504bda94c147f446ee29775d08274` from 2026-08-30. The npm dist-tag `latest` is also labeled 1.8.8 and was published 2026-09-23 with no `gitHead`. Upstream `main` is `24136945847afbfad266c6c46a8cd335377f9112` from 2026-09-24. The fork `lawmight/OpenCLI` branch `lawmight/fb-chrome-stack` is `0eac2994f7234151763e38b038d89ab73d21361c` from 2026-09-10. Tag `v1.8.8`, the fork, and upstream `main` each have 179 sites and 1366 commands, and they remain different pins.

## Key concepts

A pin is the exact artifact a later install would use. A tag pin is a git commit on `jackwener/OpenCLI`. A registry pin is an npm pack of `@jackwener/opencli`. A main pin is the upstream branch tip. A fork pin is `lawmight/fb-chrome-stack` on `lawmight/OpenCLI`.

Feed identity is the sha256 of `feed.js`. Registry 1.8.8 has no `gitHead`, and its `feed.js` sha256 equals GitHub tag `v1.8.7`. That hash is `d7b4ddb725891743e62a83959859023dabe57497d0df800490984b72564f644c`. Tag `v1.8.7` is `87b60a36590c3e2a466c37266c3348d73d7f68fe` from 2026-08-23.

Adapter counts are a weak identity. Tag `v1.8.7` has 176 sites and 1332 commands. Tag `v1.8.8`, the fork, and upstream `main` each have 179 sites and 1366 commands. The fork adds zero sites. Upstream `main` still differs, because commit `#2539` deletes 4 sitemaps, 2 sitemap skills, and 13 external CLIs.

Bare 1.8.7 names GitHub tag `v1.8.7`. Bare 1.8.8 names both the git tag and the npm dist-tag, and those two artifacts differ.

## How it works

Choose the registry pin only when the npm pack is the intended bytes. Check `feed.js`, because that pack has no `gitHead`. The published 1.8.8 pack fails that check for Facebook feed work when its hash is still `d7b4ddb725891743e62a83959859023dabe57497d0df800490984b72564f644c`.

Choose the tag when the target is the upstream release commit. That commit for `v1.8.8` is `8271afc67e8504bda94c147f446ee29775d08274` from 2026-08-30. The fork is 19 commits ahead of that tag.

Choose upstream `main` when the target is the upstream tip, including deletions. The tip is `24136945847afbfad266c6c46a8cd335377f9112` from 2026-09-24. That commit is "Remove site sitemaps and external CLI hub #2539". Reject this pin when the goal is max connections, because those 13 external CLIs go away with the sitemaps.

Choose the fork branch when the target is the runtime already merged on `lawmight/fb-chrome-stack`. That HEAD is 19 commits ahead of tag `v1.8.8` and 1 behind `main`. The missing upstream commit is `#2539`, so this pin still has the sitemaps and the 13 external CLIs.

Apply extra pull requests only after the pin is chosen, only after approval, and only when each one still merges cleanly onto that pin. An upstream MERGEABLE state still has to be rechecked as a clean merge onto `0eac2994f7234151763e38b038d89ab73d21361c`.

## Where things live

Upstream git is `jackwener/OpenCLI`. Fork git is `lawmight/OpenCLI`. The fork branch is `lawmight/fb-chrome-stack`, and fork `main` is a different branch. The registry package is `@jackwener/opencli`.

This Linux box uses the locked Chrome profile `chrome-opencli` and a Shifter PAC. The skills in play are facebook, rednote/xhs, reddit, tiktok, doubao, and 1688. The profile name is not a string in the repo.

## Gotchas

The npm string 1.8.8 is a different artifact from tag `v1.8.8`, because the pack published 2026-09-23 has no `gitHead` and its `feed.js` hash matches tag `v1.8.7`.

Closed issue 2089 said the Facebook feed decoy was fixed in `v1.8.7`. That close is not the fork Messenger bleed, and it is not the scrambled-author decoy. No open upstream issue states that current releases break Facebook feed.

Discussions are disabled and return HTTP 410. Issues are the only GitHub discussion surface.

Doctor output can stay green while the extension is old, which is issue 2416. Doctor always exits 0, which is issue 2417. The adapter timeout environment variable is `OPENCLI_BROWSER_COMMAND_TIMEOUT`, which is issue 2415. Passing `--timeout` does not set that variable.

Pull request 2521 has an audit check of FAILURE. Clicks that used to report success will fail. Issue 2520 is the same hidden-page success report.

Pull request 2464 paces xiaohongshu and weibo only. It does not pace facebook, reddit, tiktok, doubao, or 1688. Issue 2470 is the xiaohongshu umbrella, and no open 1688 reliability pull request was found.

## Exact base ref

The upstream tag `v1.8.8` is SHA `8271afc67e8504bda94c147f446ee29775d08274`, committed 2026-08-30.

Upstream `main` is `24136945847afbfad266c6c46a8cd335377f9112`, committed 2026-09-24. The only commit is "Remove site sitemaps and external CLI hub #2539", and that is the one commit the fork is behind.

Fork `lawmight/OpenCLI` branch `lawmight/fb-chrome-stack` HEAD is `0eac2994f7234151763e38b038d89ab73d21361c`, committed 2026-09-10. The fork is 19 commits ahead of `v1.8.8` and 1 behind `main`.

## Ranked open pull requests and issues

The list below is attention order. Apply order is the queue in the recommended build.

1. Pull request 2510 at https://github.com/jackwener/OpenCLI/pull/2510 is the Chrome 152 and newer debugger detach, and the merge state is MERGEABLE with an extension reload required. The risk is a detach fix that does not take effect until that reload.

2. Issue 2487 at https://github.com/jackwener/OpenCLI/issues/2487 is Chrome 152 detach-then-tabs.update, opened 2026-09-11. The risk is Chrome 152 running detach-then-tabs.update while the session looks connected.

3. Issue 2533 at https://github.com/jackwener/OpenCLI/issues/2533 is intermittent Navigation rejected while doctor is green, opened 2026-09-20. The risk is trusting doctor when the navigation failure is intermittent.

4. Pull request 2543 at https://github.com/jackwener/OpenCLI/pull/2543 fixes reddit hot empty success, which is issue 2485. The risk is a caller that treated the empty array as success.

5. Issue 2485 at https://github.com/jackwener/OpenCLI/issues/2485 is the reddit hot empty array. The risk is a hot listing that succeeds with an empty array until pull request 2543 is on the pin.

6. Pull request 2521 at https://github.com/jackwener/OpenCLI/pull/2521 stops hidden-window clicks from reporting success, and the audit check was FAILURE. The risk is that clicks which used to report success will fail.

7. Issue 2520 at https://github.com/jackwener/OpenCLI/issues/2520 is a click that reports success on a hidden page. The risk is acting on a success result from a hidden page.

8. Pull request 2559 at https://github.com/jackwener/OpenCLI/pull/2559 is the reddit HTML vs JSON change. The risk is an HTML body handled as JSON, or a JSON body handled as HTML.

9. Pull request 2504 at https://github.com/jackwener/OpenCLI/pull/2504 is the doubao ask confirmation. The risk is a confirmation change on doubao ask that this research has not replayed.

10. Issue 2400 at https://github.com/jackwener/OpenCLI/issues/2400 is doubao ask hitting an `about:blank` lease tab. The risk is doubao ask remaining on that lease tab, and pull request 2504 is a separate doubao confirmation change.

11. Pull request 1919 at https://github.com/jackwener/OpenCLI/pull/1919 is the loopback daemon bypass, and it matters when a PAC sends `127.0.0.1` through the proxy. The risk is applying the bypass when loopback stays local, or skipping it when the PAC sends `127.0.0.1` through the proxy.

12. Pull request 2461 at https://github.com/jackwener/OpenCLI/pull/2461 is the persistent site session in the xiaohongshu wave, with CI green and merge state MERGEABLE CLEAN. The risk is a site session that stays open after the command that started it.

13. Pull request 2563 at https://github.com/jackwener/OpenCLI/pull/2563 treats the chips as honeypots. The risk is applying it when the chips are opaque stacked duplicates, or applying it together with pull request 2460.

14. Pull request 2460 at https://github.com/jackwener/OpenCLI/pull/2460 treats the chips as stacked duplicates. The risk is applying it when the chips are transparent honeypots, or applying it together with pull request 2563.

15. Pull request 2542 at https://github.com/jackwener/OpenCLI/pull/2542 waits for the body, on the same `search.js` file as the chip change. The risk is a conflict when it lands before the chosen chip pull request.

16. Pull request 2464 at https://github.com/jackwener/OpenCLI/pull/2464 adds pacing for xiaohongshu and weibo only. The risk is expecting pace control on facebook, reddit, tiktok, doubao, or 1688.

17. Issue 2470 at https://github.com/jackwener/OpenCLI/issues/2470 is the xiaohongshu umbrella. The risk is reading that umbrella as coverage for 1688, because no open 1688 reliability pull request was found.

18. Issue 2568 at https://github.com/jackwener/OpenCLI/issues/2568 is tiktok whoami returning false `AUTH_REQUIRED` on 1.8.8. The risk is cherry-picking pull request 1912 at https://github.com/jackwener/OpenCLI/pull/1912, which is the open tiktok.com following change and is not this bug.

19. Issue 2573 at https://github.com/jackwener/OpenCLI/issues/2573 says any extension can impersonate the bridge, opened 2026-10-05, and `main` `24136945` is still open. The risk is leaving bridge impersonation in place while waiting on the allowlist.

20. Pull request 2572 at https://github.com/jackwener/OpenCLI/pull/2572 is the extension-id allowlist, opened 2026-10-05 for issue 2573. The risk is HTTP 401 for an unpacked bridge whose id is not `ildkmabpimmkaediidaifkhjpohdnifk`, unless `OPENCLI_ALLOWED_EXTENSION_IDS` is set.

21. Pull request 2512 at https://github.com/jackwener/OpenCLI/pull/2512 is a one-retry workaround for the same Navigation rejected bug as pull request 2510. The risk is taking the retry while the extension can still be reloaded for pull request 2510.

22. Issue 2416 at https://github.com/jackwener/OpenCLI/issues/2416 is doctor green while the extension is old. The risk is a fresh diagnosis on a stale extension.

23. Issue 2417 at https://github.com/jackwener/OpenCLI/issues/2417 is doctor always exiting 0. The risk is a check that cannot report failure.

24. Issue 2415 at https://github.com/jackwener/OpenCLI/issues/2415 is the adapter timeout living in `OPENCLI_BROWSER_COMMAND_TIMEOUT`. The risk is changing `--timeout` and believing the adapter timeout moved.

25. Closed issue 2089 at https://github.com/jackwener/OpenCLI/issues/2089 said the Facebook feed decoy was fixed in `v1.8.7`. The risk is treating that close as proof against the fork Messenger bleed or the scrambled-author decoy.

## Lawmight pull requests 1 through 5

Keep lawmight pull requests 1 through 5 as the runtime on branch `lawmight/fb-chrome-stack`. All five are already MERGED into `lawmight/fb-chrome-stack`. They are not merged into fork `main`.

Do not supersede them. Rebase them onto upstream `main` only as a stack that starts with `02e53a9c`. That commit carries the same feed blobs as open upstream pull request 2453. Isolated cherry-picks of pull request 1 onto `main` conflict. Replaying after `02e53a9c` was clean.

`feed.js` and `feed.test.js` on the fork match pull request 2453 head `6ca8b00a`. Upstream pull request 2453 is already on the fork as `02e53a9c`.

## Recommended build

The base commit is `0eac2994f7234151763e38b038d89ab73d21361c`. The version string is `1.8.8-fb.5`. That string is not bare 1.8.7 and it is not bare 1.8.8.

The base is `0eac2994` because that commit already contains pull requests 1 through 5, the current-DOM commit, and six browser-session commits. It keeps the sitemaps and the 13 external CLIs that `#2539` deletes. Leave `#2539` out when the goal is max connections.

The plan is false if `0eac2994` does not contain those five pull requests, the current-DOM commit, and the six browser-session commits. The plan is false if that commit is not 19 ahead of tag `v1.8.8` and 1 behind `main`. The plan is false if `feed.js` at that commit does not match pull request 2453 head `6ca8b00a`. The plan is false for any queued pull request that no longer merges cleanly onto `0eac2994`.

Patches below are applied only after approval, and only if they still merge cleanly onto `0eac2994`.

### First wave

Reliability items, in this order.

- https://github.com/jackwener/OpenCLI/pull/2510 is Chrome 152 and newer debugger detach. The merge state is MERGEABLE. An extension reload is required.
- https://github.com/jackwener/OpenCLI/pull/1919 is the loopback daemon bypass. It belongs in the queue when a PAC sends `127.0.0.1` through the proxy.
- https://github.com/jackwener/OpenCLI/pull/2504 is the doubao ask confirmation.
- https://github.com/jackwener/OpenCLI/pull/2543 is the reddit hot empty success fix for issue 2485.
- https://github.com/jackwener/OpenCLI/pull/2559 is the reddit HTML vs JSON change.
- https://github.com/jackwener/OpenCLI/pull/2521 is the hidden-window click false success fix. The audit check was FAILURE. Clicks that used to report success will fail.

### Second wave

Xiaohongshu items wait on a live check of the chips. Take the persistent session first. Then take one chip pull request. Then wait for the body. Then add pacing.

- https://github.com/jackwener/OpenCLI/pull/2461 is the persistent site session. CI is green. The merge state is MERGEABLE CLEAN.
- Take exactly one of https://github.com/jackwener/OpenCLI/pull/2563 or https://github.com/jackwener/OpenCLI/pull/2460. Pull request 2563 is the honeypot-chip change, so it is the one to take when the live check shows transparent honeypots. Pull request 2460 is the stacked-chip change, so it is the one to take when the live check shows opaque stacked duplicates. Do not take both. Do not take https://github.com/jackwener/OpenCLI/pull/2446.
- https://github.com/jackwener/OpenCLI/pull/2542 waits for the body. It touches the same `search.js` file, so it stays after the chosen chip pull request.
- https://github.com/jackwener/OpenCLI/pull/2464 is pacing for xiaohongshu and weibo only. It does not pace facebook, reddit, tiktok, doubao, or 1688.

### Do not re-apply

- Upstream pull request 2453 is already on the fork as `02e53a9c`. The `feed.js` and `feed.test.js` blobs match pull request 2453 head `6ca8b00a`.
- Leave idle-timeout pull request 2468 unpicked until it is compared with fork commit `02b5be53`.
- Leave stale-page pull request 2222 unpicked until it is compared with fork commit `2e98024d`.

### Wait

- https://github.com/jackwener/OpenCLI/pull/2572 is the extension-id allowlist, opened 2026-10-05 for issue 2573. An unpacked bridge whose id is not `ildkmabpimmkaediidaifkhjpohdnifk` gets HTTP 401 unless `OPENCLI_ALLOWED_EXTENSION_IDS` is set. Do not cherry-pick it yet.
- https://github.com/jackwener/OpenCLI/pull/2512 is a one-retry workaround for the same Navigation rejected bug as 2510. Take 2510 first. Add 2512 only if the extension cannot be reloaded.

## Install ban

Do not run `npm i -g @jackwener/opencli@1.8.7` unless a later proof shows Facebook feed safety. The same ban covers registry `@jackwener/opencli@1.8.8`. That pack is npm `latest`, published 2026-09-23, with no `gitHead`. Its `feed.js` sha256 matches 1.8.7 at `d7b4ddb725891743e62a83959859023dabe57497d0df800490984b72564f644c`, and the pack is not the fork.

The proof that lifts the ban is an installed `feed.js` sha256 that differs from `d7b4ddb725891743e62a83959859023dabe57497d0df800490984b72564f644c`, plus a pass on the four fork fixtures. Those fixtures are messenger bleed, adolph decoy, french post, and short article.

## Tradeoffs

| Option | Feed identity | Connections | Condition that favors it |
| --- | --- | --- | --- |
| Registry 1.8.8, published 2026-09-23, no `gitHead` | `feed.js` sha256 equals the 1.8.7 hash `d7b4ddb725891743e62a83959859023dabe57497d0df800490984b72564f644c` | 179 sites and 1366 commands, the same counts as tag `v1.8.8` and the fork | Favor it only after the ban proof, because this pack is not the fork feed |
| Upstream `main` `24136945847afbfad266c6c46a8cd335377f9112` | Tip commit message is "Remove site sitemaps and external CLI hub #2539", dated 2026-09-24 | Deletes 4 sitemaps, 2 sitemap skills, and 13 external CLIs. Adapter count remains 179 sites and 1366 commands | Favor it when those deletions are accepted. Reject it when the goal is max connections |
| Fork `0eac2994` plus the named patch queue | Contains lawmight pull requests 1 through 5, the current-DOM commit, and six browser-session commits. `feed.js` matches pull request 2453 head `6ca8b00a` | Keeps the sitemaps and the 13 external CLIs. The fork adds zero sites. Counts stay 179 sites and 1366 commands | Favor it when the fork runtime must keep the sitemaps and the 13 external CLIs. Patches land only after approval and only when each one still merges cleanly onto `0eac2994` |

## Approval gate

Tom must approve before any install. This ticket does not install.

## Live feed smoke

Live `facebook feed` smoke was still pending in the pull request bodies. Unit fixtures exist. This research did not run a live facebook feed.

## Approval checklist

Answer each item in your own sentences. A single word is not an approval.

1. Say whether you accept base `0eac2994f7234151763e38b038d89ab73d21361c` on `lawmight/OpenCLI` branch `lawmight/fb-chrome-stack`, or name the base you accept instead.
2. Say whether the version string on that base is `1.8.8-fb.5`.
3. Say whether lawmight pull requests 1 through 5 stay the runtime on that branch, and say whether any move onto upstream `main` must be a stack that starts at `02e53a9c`.
4. Say whether the ban on `npm i -g @jackwener/opencli@1.8.7` and on registry `@jackwener/opencli@1.8.8` stays until an installed `feed.js` sha256 differs from `d7b4ddb725891743e62a83959859023dabe57497d0df800490984b72564f644c` and the four fork fixtures pass.
5. Say whether the first wave may be applied in the listed order after your approval, and only for pull requests that still merge cleanly onto `0eac2994`.
6. Say whether the second wave waits for a live chip check, and say which one pull request you would allow after that check, 2563 for transparent honeypots or 2460 for opaque stacked duplicates.
7. Say whether `#2539` stays out of this build so the sitemaps and the 13 external CLIs remain.
8. Say whether pull request 2572 stays unpicked, and say whether pull request 2512 stays unpicked unless the extension cannot be reloaded.
9. Say whether you accept that this research did not run a live `facebook feed` smoke, and that the pull request bodies still list that smoke as pending.
10. Say whether you approve an install of this build, or say that you withhold install.
