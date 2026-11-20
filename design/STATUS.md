# House Cricket

## Requests

1. `--plan-only --share-design The game will probably be called House Cricket. The idea is it's a cricket that was bought for feeding a gecko, but it escaped! We def need an opening to show that. But then you're playing a Metroidvania style game in which you're moving through the house with the goal of rescuing your fellow crickets. To make it more interesting, there'll be, say, 10 zones, each with a different style, probably representing different rooms of the house, and in each you have a "Boss Gecko" fight in which you have to save a different cricket. We should be sure to research real crickets and that we match their chirps properly. While in a zone you can hear the cricket chirping, and it gets louder/softer to help guide you to it. Like any Metroidvania you should need some items to get to some areas and you need to explore around and build a map. Each "Boss Gecko" fight isn't about you hurting the gecko, so much as somehow avoiding it, stunning it, distracting it, or putting it to sleep or something so you can save the cricket. You can swap your player to any saved crickets and maybe they have slightly different states. The art should all lean water-color. The Gecko should be scary but friendly. There's a "Cricket Carrier" place the crickets live as you get them, and it gets nicer as youg et more, like the castle buildont in Suikoden.  MAybe some other crickets/insects can join you. Not sure what enemies should be, but we need a range of them, maybe other insects. Also, there should be a plot/joke/puzzle around a bat, a tree frog, a chimney sparrow, and and other things that make cricket-like-noises but aren't crickets. --gamepad`

2. `Let's do another pass on the plan artifact with --mock-budget $10 so we get a mock of each main cricket. make sure they have antennas when appropriate and reflect their real cricket species, but fun and with character, of course!`
3. `LOVE the name Duchess for the Gecko!`
4. `It probably doesn't affect the artifact, but I forgot to include --feedback in the planning flags.`
5. `Let's generate mock art for all major/minor characters. I assume many of them have lines and such? Also, as a mechanic, crickets can fit into small spaces, so maybe some enemies are indestructable (beetles perhaps?) and you have to kinda sneak, hide while they pass, and continue. This could also be part of some boss fights. We don't want to OVERuse it, but I think the key cricket traits are probably chirp, jump, and hide. We'll have to make sure to spend time getting the animations right. One gecko should probably keep licking its eye as it talks to you or something. There should be a "dragon's lair" somewhere but it's a bearded dragon! That fight is probably about it being too big for the screeen and you skittering around and hiding. Not sure. It can have a cool item or befriend you after, or maybe you steal a ring from its horde that makes you invisible. Anyways, not saying any of these must be in verbatim, just throwing some ideas at the design so we can iterate. Let me know when the new copy of the shared plan is up.`
6. `Oh, also, we should probably either by default or have an option to have a way to visualize the area's chirp and mute it in case users don't want to keep the chirp on the whole time and/or it's hard to judge. It just be a chirp indicator or something. And/or, you could turn off "autochirp" and just have it chirp in response to you chirping since you should also definitnely be able to have a button that makes your cricket chirp.`
7. `Remember, being metroidvania style, the game does need non-boss "enemies" of some sort, I'm not sure what those are here, but I'm not sure if we mentioned them much, but I'd like mock graphics for each of them too.`
8. `A couple of notes: The graphic for Shelly has eyes on the stalks (correct) AND on the head (incorrect/odd). The graphic for Rolo is cute and I like the apron but something about how it comes together feels wrong. Kite is great but looks slightly impossible/wrong. Lashes is great but has 5 legs.`
9. `--continue --art-sheet --budget $50 --gamepad --publish --feedback`
10. `--publish`
11. `--publish`
12. #3: Ear indicator: click to dock/undock, double-click to toggle auto-chirp (https://github.com/zeveck/house-cricket/issues/3). `I should also be able to click the ear to "hide it" which should dock it near the other buttons and it can launch again when clicked again. Double clicking it should toggle whether I hear the autochirp?`
13. `--publish`
14. #10: The ear swings wildly and points backwards; rest it and bring it out when it helps (https://github.com/zeveck/house-cricket/issues/10). `The mechanics of the ear are confusing. In the first room it swings wildly about, and it has no clear purpose and it often points backwards. Instead it should probably sit at rest and come out when it helps guide or find things maybe?`
15. #7: Tank sand: Duchess gets stuck for good, ignores Pip, and hiding never matters (https://github.com/zeveck/house-cricket/issues/7). `It's weird that the first hiding place there's no reason to hide because Duchess is stick, and also, that if I just walk back over to Duchess nothing happens. It feels like she should roar and I should skitter away or something, but really, she shouldn't able to get stuck so easily and my hiding should matter?`
16. #9: Tutorial signs look like floating signposts; put them on the path and centre their text (https://github.com/zeveck/house-cricket/issues/9). `I don't like that the tutorial signs look like signs just floating sometimes. Why have a stand? They should be on the path or something? Their popup should be more centered.`
17. `--publish` (after: `Great. Then other than fixing 4 as you said, I approve the new cup and let's land it and publish.`)
18. `--change #24 #25 #26 #27` (#24: Tank sand: Duchess looks awake on entry (https://github.com/zeveck/house-cricket/issues/24); #25: The opening chase: make Duchess scary (https://github.com/zeveck/house-cricket/issues/25); #26: Duchess's animation needs to look better (https://github.com/zeveck/house-cricket/issues/26); #27: Controls: Up arrow to jump, and another key to hide (https://github.com/zeveck/house-cricket/issues/27)). `It was actually much better before that the gecko was asleep (she looks to have Zs, but it's just the same awake graphic) when you entered and woke up when you were most of the way across the room and chased you. now it just stands there, already awake. She should probably be able to eat you? If she does she goes to sleep and you get game over? I feel like UP arrow is better for jump and something else for hide since you jump all the time, though maybe this is a keyboard problem. This is the game opening. We need Duchess's animation to look better and we need it to be scarier, with her leaping after you and you r unning and hiding and feeling like you really escaped. Consider, make issues, and /gamegen --fix all them` and `Yes, I saw Zs over the ame old awake gecko. I thought before these changes she'd started off leeping with here eyes shut.`
19. `--fix all` (open: #22, #28, #29, #30, #31, #32, #33; #24-#27 done on main, close on publish). #30: Duchess's tail: doubled while she sleeps, mispositioned while she moves (https://github.com/zeveck/house-cricket/issues/30); #31: After you hide: Duchess searches, gives up and goes back to sleep on the left; and a squeeze exit she can't follow (https://github.com/zeveck/house-cricket/issues/31); #32: The tell "When her tail wiggles" doesn't map to anything the player can see (https://github.com/zeveck/house-cricket/issues/32); #33: Crumbs: nothing says what they're for until Rolo, and the icon reads as a sponge (https://github.com/zeveck/house-cricket/issues/33); #22: Beacon: zone 8 starts loud (https://github.com/zeveck/house-cricket/issues/22). From the owner, with #30-#32: `https://claude.ai/artifact/WeZoKvXjAm1ZvFQ5vrkSes mostly looks good, but there are various tail errors. It's misaligned and then double and generally not lined up well. It's doubled while the gecko is asleep and usually mispositioned while the geko is moving. It's weird the gecko just drops to sleep the moment you hide. Her acting like she couldn't find you and setting off to sleep on the left made more sense. It may be we should have a "squeeze" exit from her chamber since right now she could just chase you if you ran off the screen. "When her tail waggles" doesn't seem to map to anything well.` and with #33: `What is it we're gathering that looks like small sponges or something? I start with 0 but gather more but don't see what they do?`
## Settings

- Platform: both (default)
- Target: web
- Scope: large (judged from the request: 10 zones, 10 bosses, a hub that grows, a cast, a story)
- Budget: $50 (raised in request 9; includes the $3.93 already spent on mockups)
- Rounds: 2
- 3D: no (2D side view)
- Gamepad: yes
- Feedback: on (added in request 4; shortcut Ctrl+Shift+F)
- Plan only: done; building now (request 9). Share design: page. Art sheet: yes. Publish at the end: yes (GitHub Pages)
- Folder: /workspaces/gg-test2 (was empty)
- Credit: Rich Conlan (from GitHub)
- ElevenLabs tier: creator (paid: no credit line needed)

## Available

- imagegen2 + anim8gen (OpenAI key ok), nanogen (Gemini key ok), audiogen (ElevenLabs ok, creator plan)
- node, python3 + Pillow (installed this run), playwright-cli
- Plugins up to date

## Phases

- [x] Preflight: keys all pass; Pillow installed
- [x] 1. Brief: BRIEF.md written; cricket research in RESEARCH.md
- [x] 2. Design: first draft (10 zones, 10 gecko species, 11 playable crickets, Not-Cricket cast; est. ~$19.5 trimmed)
- [x] 3. Design review (2 rounds): 30 + 29 findings, all handled (REVIEW_LOG.md). Mockups made ($0.48, 9 pictures in design/mockups/). Request 2: a mock of all 11 crickets with antennae ($0.60, design/mockups/crickets/), shared page updated (it's public now). Requests 5–7: mocks of the whole cast (20) and every enemy (20), plus the Dragon's Lair scene; the design gained Hide, unbeatable beetles and a robot vacuum, the Dragon's Lair, Lashes' eye-licking and beacon options. ($2.63) Design shared: https://claude.ai/artifact/G2W6rruRRUdPbpXzjQRnPV, as a page (slug 79aec200-3a13-4d2a-ace5-e76bdfb8cb1c; source design/share/)
- [x] (plan-only: stopped here 2026-11-15. Next: `/gamegen --continue` reads the page's comments first, then builds)
- [x] 4. Art, animation, audio: all six helpers finished 2026-11-16. Spent $27.31 of $50 (details in ASSETS.md). Art sheet: https://claude.ai/artifact/VW1xVDNskJPJJ67qUJVgLU (slug e6cd0a97-7d42-4392-928f-faafddf23535; built from .gamegen/art-sheet/manifest.json)
- [x] 5. Build:
  - Milestone 1 DONE: engine core and a 6-room sandbox; replays, feel tests and check-world pass (design/ENGINE_NOTES.md).
  - DONE:
    - world bible: 87 rooms in house.js, plus zones.js, text.js and design/zones/*.md;
    - audio: audio.js, chirps.js, beacon.js;
    - renderer: render.js, cricket-art.js, geckos.js, fx.js and the gallery;
    - meta/UI: story, dialog, map, hub, settings, saves, PWA and the bug report.
  - DONE: the engine steward (shared entities, all enemies, boss base) and builders A, B, C and D. All 87 rooms and 11 boss fights are built, and 43 solutions pass.
  - DONE: the gameplay fixer (perks, secrets, balance, Nana pacing) and the visual polisher (objpaint.js, the look overlay, boss framing, Nana painted on the back wall).
  - Open issues are in design/OPEN_ISSUES.md.
  - 2026-11-18: the container crashed while 4 builders ran at once (6 cores, 7 GB). Their work was kept on disk.
    - Builders A (z00–z03) and B (z04–z06) were resumed together, at most one browser each.
    - C (z07–z09 + lair) and D (z10 + links) ran afterwards; all four are finished.
    - Rule: at most 2 heavy helpers at once; check `uptime` and `free` before starting more.
- [x] 6. Play-test: the full run from New Game to the credits replays twice with real keys (design/solutions/full-run.json). 12 bugs fixed, including 6 soft-locks. Every screen, size and input checked; 49 solutions pass. Leftovers are in OPEN_ISSUES.md.
- [x] 7. Final review:
  - Round 1 (playtester + bug hunter): 3 must-fix and many should-fix, all fixed by fixers S and G.
  - Round 2 (bug hunter): confirmed all fixed; 5 regressions, also fixed.
  - The full run was re-authored on the current code and replays twice; a softlock in the Study fixed.
- [x] 8. Polish pass:
  - The fresh reviewer's 10 findings were fixed by fixers V (camera, framing, Carrier, portraits) and T (text, menus, tips, handoff flash, HUD).
  - The save-crack check (tools/check-cracks.mjs): 22 cracks, 69 states, all can be left; 3 soft-locks fixed.
  - The full run was re-authored again and replays twice.
- [x] 9. Wrap up:
  - Done: social card, GitHub preview (media/github-social.jpg), README with screenshots, Pages workflow at the repo root (game/), and the game served at http://localhost:8000.
  - PUBLISHED 2026-11-18 at https://zeveck.github.io/house-cricket/ (public repo zeveck/house-cricket; Pages via the workflow; Report a bug points at the repo, with labels bug and player-report). Credit confirmed on publish: Rich Conlan (now GAMEGEN_CREDIT).
  - Live check: desktop and phone, 0 console errors, sw.js stamped.
  - REPUBLISHED 2026-11-18 at https://housecricket.synapticnoise.com/ (request 11):
    - DNS CNAME added at GoDaddy; the github.io address redirects;
    - making-of on: the README's How it was made and Replaying the tests sections, plus design/, solutions and tools in the repo (local paths swapped for placeholders);
    - title-screen links to synapticnoise.com and GitHub;
    - added to the top of the gallery at zeveck/synapticnoise.
  - HTTPS: required (certificate issued).
  - REPUBLISHED 2026-11-19 (request 13), with the reviewed fixes for issues #1, #2, #3, #4, #5, #8 and #12. Each was fixed, independently reviewed, and checked with the quick replays; the full run replays on main before the push.
  - REPUBLISHED 2026-11-19 (request 17), with the reviewed fixes for issues #6, #7, #9, #10, #11, #13, #14, #15, #16, #17, #18, #19, #20 and #21 (#7, #9 and #10 through --change, with design reviews logged in REVIEW_LOG.md). The full run was re-recorded twice (the tank hunt, the Raft) and replays on main before the push.
