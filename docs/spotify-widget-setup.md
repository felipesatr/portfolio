# Spotify widget — setup and verification

The About page contains one music card controlling a visible floating Spotify embed. A maximum of two iframe buffers can exist during track preparation/crossfade, but only the committed one may play; the retired controller is destroyed after the fade. The old comparison row and native-preview code have been removed. The connection needs owner authorization, protected Cloudflare secrets, the deployed Worker, and a configured public endpoint. A marked development-only artwork sample is available when no endpoint is configured; it never pretends to be playable audio or the owner's real history.

## Controls, layout, marquee, and scrubbing — 24 October 2026

“Recently played” is now above the cover and uses the same Cal Sans/type-h6 heading token as “On my bookshelf” (both measured 25.6604px in the desktop browser). All four transport glyphs come from Tabler; play/pause smoothly crossfade/scale between the library's actual icons. The settled transparent layout no longer creates a z-index/filter trap below the cursor canvas: controls and live marquee text stay above the liquid surface, while artwork/header/progress retain their normal card layers. Consent still blurs only the local content, trapping it below the consent glass for the whole entrance/exit. Compact container rules avoid header/artwork collisions without changing the surrounding grid. Geometry checks passed at 2560, 1280, 1024, 900, and 390px viewports; temporary viewport overrides were reset.

Overflow metadata now repeats identical copies in a one-direction, linear, seamless loop after the original two-second delay. The decorative copy is hidden from assistive technology; the cursor recolors actual text runs so it preserves their animated transforms and clipping. Reduced motion disables the loop. A live long title (“Nada Valgo Sin Tu Amor”) was checked with normal, not alternating, animation direction.

The progress presentation clock interpolates sparse API samples every animation frame at 1ms slider precision, smooths small timing corrections, and freezes on pause. Dragging owns the slider until release and acknowledgement; stale samples and integer-second seek acknowledgements cannot pull it backwards. Cancelled gestures restore the playback position. The controller publishes optimistic seek positions, retains paused intent through late seek events, and resumes an already-started track with Spotify's documented `resume()` rather than `play()`. Seek stays disabled until actual playback has occurred and whenever loading, transitioning, or unavailable; the thumb is explicitly muted while disabled. A provider seek failure returns a safe error/unseekable state instead of pretending the audio moved.

Validation: 43 Spotify tests, type checking, lint, and the existing globe/calendar/storage tests pass. The production build with the actual GitHub Pages `/portfolio/` environment and static preparation passed with 22 routes. Live layout, controls-over-fluid, initial seek lock/muting, and marquee behavior were checked in Chrome. Live audio seeking could not be verified because the Spotify iframe timed out during readiness in this browser session; no fake playback samples were injected into the live UI. No Worker deployment, frontend publication, or billing changes were performed.

## Retained song-layer fix — 24 October 2026

Live browser reproduction found duplicate React keys: the active `TrackContent` and `SpotifyProgress` were both keyed by the bare track URL. React warned about the collision and retained multiple active song nodes (five after one next-song change), causing the overlapping titles/artists in the screenshot. Song views now use a `track:` identity and progress uses `progress:`. The retiring view keeps its existing track identity through its exit instead of remounting. The idle “Spotify controls playback availability” caption is removed; actual loading, consent, and error messages remain conditional.

Regression guards failed for both issues before the fix and pass afterward. All 37 Spotify tests, lint, and type checking pass. Browser next/previous changes confirmed one outgoing/one incoming view during the fade and exactly one active view afterward, no idle caption, and no new duplicate-key warnings. Reload once to clear any orphan DOM already produced by the old keys. Actual playback verification was blocked by Spotify's player-readiness timeout. The client/server build compiled, but full static output remains unverified because prerender requests failed at `/work/project-06/`; no build configuration was changed. No frontend upload or Worker deployment was performed for this fix.

## Buffered, synchronized song transitions — 23 October 2026

The previous implementation changed the color as soon as its fetch completed, independently replaced the artwork/metadata, and displayed the floating host before the iframe was ready. Those independent clocks are now replaced with a readiness barrier and a paused standby buffer.

For initial content, artwork loads anonymously and is decoded before its metadata/artwork view is committed. Before acceptance no color or iframe requests are started. After acceptance the exact color can be prepared, but the official iframe still waits for the first Play action. On an active-player track change, the current song/view stays in place while the standby iframe, decoded artwork, and color request prepare concurrently. Standby readiness requires both the iframe document's load event and Spotify's documented `ready` event, in either order. A fast color response cannot independently change the card. Missing artwork has an explicit icon fallback and missing color has the existing neutral fallback; a player timeout keeps the previous track rather than revealing an unfinished iframe.

At commit, the old player is paused, both visual buffers crossfade with blur, and the custom card's background interpolates from its old exact color to the incoming exact color. `SPOTIFY_TRACK_FADE_MS` is the shared 360ms tuning constant, passed to both card and floating player as `--spotify-track-duration`. The incoming animation/transition's completion event finishes the handoff; a slightly longer timeout is only a background-tab/missing-event guard. Continued audio starts after that reveal, never in the hidden standby player. This is a visual crossfade, not an audio-volume fade. The inactive controller is then destroyed. Controls retain their positions; retired metadata is inert, hidden from assistive technology, and excluded from the custom mouse-mask layer. Reduced motion removes the motion and uses an immediate handoff after readiness.

Only the active player's events can update progress or advance the queue. Unexpected standby playback is paused. Abort/consent/unmount cleanup invalidates pending loads, clears timers, and destroys both controllers; late readiness events cannot revive an old request. The existing 5-second paused-hide behavior is deferred while preparing or crossfading. Browsing a paused, already-hidden player does not force its toast back on screen. No new Worker deployment or billing configuration is needed for these frontend changes.

Validation: 35 Spotify tests, general globe/calendar/storage tests, type checking, lint, and the production/static build passed. Added tests cover out-of-order load/ready events, artwork decoding/anonymous requests, fast colors waiting for slow artwork/player readiness, failed preparation, active/standby isolation, stop-before-start audio handoff, stale events, cancellation, and completion. The dry-run script output path was corrected to keep generated Worker output in the ignored root artifacts directory; stale nested generated output was removed. Browser testing was attempted but is disabled in Work settings, so this transition has not yet been visually verified against a live Spotify iframe. Existing platform autoplay restrictions still apply. No frontend upload was performed.

## Free Cloudflare only

Keep the Cloudflare account on **Workers Free**. Do not enable Workers Paid or add paid products. This project uses one Worker, one **SQLite-backed Durable Object**, and one daily scheduled trigger, available on Free. No subscriptions, external databases, queues, analytics, or paid services are required. Cloudflare fails operations when Free limits are exhausted instead of charging overages on that plan. The config cannot change an account's billing plan; confirm Free in the dashboard before deployment.

The public endpoint is `/v1/recent`. Once per Bogotá calendar day it snapshots the owner's most recent history (up to 50 plays), removes repeats/invalid entries, and keeps up to 20 distinct songs, newest first. A daily Worker cron runs at 05:00 UTC (midnight Bogotá); the first request of the day also refreshes if needed. Concurrent requests share work. The current selection persists through object restarts, and only that selection is retained—not an accumulating listening-history archive. The browser features the latest song first and shuffles the remaining songs locally for previous/next browsing. There are no visitor Spotify accounts.

Persistent storage contains the encrypted refresh token, seed revision, current daily metadata selection, and a bounded cache of up to 20 track background colors. The recent-history public response contains `track` and `tracks` (up to 20 recent distinct songs), with only title, artist, artwork URL, and Spotify link. No direct audio URLs, preview candidates, or market lists are retained. The v3 cache migrates today's v2 metadata without another Spotify request and deletes the old cache after the new one is saved. The selection is replaced at the next successful refresh, or erased when the integration is deleted. No listening timestamps or upstream context are stored or returned. Both public endpoints share a cap of 30 requests/minute per visitor. Visitor keys are HMAC hashes held in memory for at most a minute; IP addresses are not logged or stored by this code. Cloudflare still operates its normal edge infrastructure. Observability logs are disabled.

## Exact Spotify embed background color

After acceptance only, the browser calls `/v1/color/<track-id>` on the same Worker. No new environment variable or credentials are required. This route accepts only the IDs in today's existing public selection; it is not an arbitrary Spotify proxy. It anonymously requests the fixed public embed URL, parses only `__NEXT_DATA__.props.pageProps.state.data.entity.visualIdentity.backgroundBase`, checks the entity URI and opaque integer RGBA channels, and returns only `{status:"ok",color:"#rrggbb"}`. The page HTML is neither executed nor persisted. This field is undocumented and may change; a missing or invalid value leaves the card neutral, not an artwork-derived guess.

Successful colors are cached for one day in the existing free-plan Durable Object and in page memory. Failed extraction is cached for five minutes, duplicate requests share work, HTTP 429 cooldowns are respected, response bodies are capped at 2 MiB, and upstream requests have a 3.5-second timeout. No visitor cookies, browser IP header, access token, or Client Secret is forwarded to the public embed. Consent withdrawal cancels the browser request and clears the applied color. Cover and song metadata remain independently available before acceptance. The background remains hover/focus-only; its fill now uses the exact hex value without the old saturation/luminance adjustments or lightening/darkening gradient.

The Worker update was deployed with owner approval on 23 October 2026, version `89e7716f-f5ae-461f-a6de-8acba06098c6`. Live checks returned `#005686` for Traición, `#8b3700` for Un Coco, and `#535359` for Yonaguni; unselected track IDs returned 404 and an unrelated Origin returned 403. Browser checks confirmed Traición's custom card computed to `rgb(0, 86, 134)` with no gradient, and switching to Si No Le Contesto applied `#381818` without loading a player iframe. The GitHub Pages frontend changes remain local until uploaded. Playback initialization/automatic-next limitations documented below were not changed by this color-only work.

Withdrawal verification left the card's applied color empty and its colored fill at opacity zero, with no player iframe. Restoring the original enabled consent choice restored `#005686` without starting playback or loading an iframe. Type checking, lint, all 26 Spotify tests, the general test suites, Worker dry-run, and production/static build passed. Frontend output contained no server credential identifiers. Screenshot proof: `artifacts/spotify-exact-color.png`.

The owner has authorized read-only listening history. No SDK playback token is supplied to visitors. All playback goes through one consent-gated official embed. The obsolete native audio hook, direct-preview selection, and visitor-country forwarding have been removed.

The card uses the official Spotify iframe API with track URIs from the normal daily selection. Metadata and cover artwork load before acceptance. Artwork uses `crossOrigin="anonymous"` and `referrerPolicy="no-referrer"`, never a credentialed retry; this still creates a direct image-server connection, not a backend-only request. Scripts and iframe remain gated. After consent, Play reveals the official compact player standalone at the bottom right, without a visible custom wrapper. On wide screens it begins at V10.5 and ends at the same edge padding as the desktop rail's left side; narrower layouts use a responsive 360px maximum. Widget Terms IV.3(a–b) require its official form and prohibit obscuring it; promotional UI is not suppressed. Custom controls call documented methods and reflect `playback_update` events. Spotify controls clip/full-track availability. No credentials or iframe internals are extracted.

The card reflects actual play/pause state, a seek slider, and visitor-local shuffle order. The seek bar uses actual iframe duration rather than the full track's catalog duration. Track changes fade the artwork; overflow text scrolls after two seconds. Playback starts only from user interaction. Spotify/browser policies may require direct use of its visible play control. The policy page discloses cookie behaviour and exclusively hosts the withdrawal control.

Preview clips must promote the underlying song, retain attribution and a Spotify link, obey territory restrictions, and not be presented as a standalone preview service. A deprecated/missing `preview_url` is an unavailable state, not permission to scrape an embed, bypass restrictions, or rehost a song.

## 1. Create the Spotify app yourself

You confirmed active Premium. Spotify currently requires the developer app owner to maintain Premium; app creation/availability still must be confirmed in your dashboard.

1. Go to https://developer.spotify.com/dashboard and create an app named **Felipe Portfolio**. Select **Web API**. Review and accept Spotify's terms yourself.
2. Register this exact redirect URI: `http://127.0.0.1:8788/callback`. Use the IP, not `localhost`. This callback is local to your computer and is never deployed publicly.
3. Copy `.env.spotify.example` to `.env.spotify.local`.
4. Enter the public Client ID and private Client Secret directly into `.env.spotify.local` in your editor. Never paste the secret into chat, a GitHub issue, or source code. These values must not use a `VITE_` prefix.

Only `user-read-recently-played` is requested. No playback, profile, email, library, or playlist permissions are needed. Website visitors never connect their own accounts.

## 2. Authorize locally

From the repository root in PowerShell:

```powershell
cd "C:\Users\ZARLLO\Desktop\porfoliowebsite\portfolio-v0"
Copy-Item -LiteralPath ".env.spotify.example" -Destination ".env.spotify.local"
# Enter the credentials directly in .env.spotify.local using your editor.
npm run spotify:connect
```

Do not overwrite an existing `.env.spotify.local` when reconnecting. The tool prints a Spotify authorization URL containing the public Client ID, random state, and PKCE challenge; it never prints secrets or tokens. Open it in your browser and authorize within five minutes. Sign in only on `accounts.spotify.com`.

The callback binds only to `127.0.0.1`. It validates the exact host/path, single-use state, expiry, and PKCE. It stores the refresh token encrypted with AES-256-GCM and writes a protected, Git-ignored bulk-secret file to `.spotify-private/cloudflare-secrets.json`. The key and Client Secret are also in that private file for direct import into Cloudflare. Keep it private and out of backups shared with others. POSIX files use 0600/0700 modes. On Windows, before authorization the tool removes inherited permissions and grants access to the current user on the dedicated private directory and `.env.spotify.local`; it stops if that permission setup fails. Use a private Windows user folder/workspace.

## 3. Prepare Cloudflare without publishing anything

Confirm **Workers Free** in your Cloudflare dashboard. Then:

```powershell
npx wrangler login
npm run spotify:check
```

`spotify:check` is a local dry run; it does not deploy. Your frontend remains on GitHub Pages. Change `ALLOWED_ORIGIN` in `server/spotify/wrangler.jsonc` if you use a custom portfolio domain. The current origin is `https://felipesatr.github.io`; it contains no path.

## 4. Publish the Worker when ready

These commands publish/update the Worker and send the private file directly to Cloudflare's protected secret store. Run them yourself when ready; do not paste the file's contents into chat.

```powershell
npx wrangler deploy --config server/spotify/wrangler.jsonc
npx wrangler secret bulk .spotify-private/cloudflare-secrets.json --config server/spotify/wrangler.jsonc
```

The first deploy has no credentials and responds with a safe not-connected state. The second command supplies `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_TOKEN_KEY`, and `SPOTIFY_TOKEN_SEED` as Worker secrets. Refresh-token rotations are encrypted before being written to the Durable Object. New owner-authorized seeds replace old seeds only through a protected Cloudflare secret update. No public login, setup, proxy, or token endpoint exists.

## 5. Connect the frontend

Put only the public Worker URL into `.env.local` for local verification:

```dotenv
VITE_SPOTIFY_ENDPOINT=https://felipe-portfolio-spotify.YOUR-SUBDOMAIN.workers.dev/v1/recent
```

For local cross-origin verification, use `npm run spotify:dev` with an ignored `server/spotify/.dev.vars` containing the same protected secrets and `ALLOWED_ORIGIN=http://localhost:5173`. Never commit that file. Use the exact origin your Vite server prints. Set the local frontend endpoint to `http://127.0.0.1:8787/v1/recent`. HTTP is accepted only for local development.

For GitHub Pages, add the public `VITE_SPOTIFY_ENDPOINT` as a repository Actions variable. The deployment workflow reads it at build time. Do **not** upload any Spotify secrets to the frontend build. Restart Vite after changing local env values.

When using the deployed `https://…workers.dev/v1/recent` endpoint locally, Vite supplies the development-only `/__spotify/recent` route automatically. It proxies only the configured public metadata endpoint, strips cookies and authorization headers, and sends the production origin. This avoids adding localhost origins to the production Worker's CORS policy. It is not included as a route on GitHub Pages.

The backend uses `redirect: 'manual'` and rejects non-success responses instead of following redirects. Cloudflare's runtime does not accept `redirect: 'error'`. The default fetcher wraps native `fetch` in an arrow function to preserve its required global receiver.

## Verification before claiming it is live

- `npm run test:spotify` covers encryption/tampering, OAuth expiry/state/replay, safe response filtering, cache/deduplication, encrypted token rotation across restart, rate-limit cooldown, and bad artwork URLs.
- `npm run typecheck`, `npm run lint`, `npm run spotify:check`, and the frontend build should pass.
- After deploying the cleaned-up Worker, confirm the live endpoint returns only status and the normal selection with allowlisted fields: `title`, `artist`, `artworkUrl`, and `spotifyUrl`. It must never return direct audio URLs, preview candidates, market lists, tokens, device details, listening timestamps, upstream responses, or debug traces.
- Confirm the displayed song matches your actual listening history. Open a link using the keyboard and confirm it reaches the right track on Spotify.
- Revisit after token expiry (or exercise refresh in an isolated verification environment). Mock token tests alone do not verify a real account's refresh token.
- Verify the narrow and wide layouts, theme readability, reduced motion, and loading/empty/unavailable states.

## Disconnect, reconnect, and retention

Revoke the app at https://www.spotify.com/account/apps/ and remove its Worker secrets to disconnect. The encrypted refresh token is kept only for the life of this integration. Current daily track metadata is replaced at the next successful daily refresh. To erase durable data as well, delete the dedicated Worker and its `SpotifyOwner` Durable Object namespace in Cloudflare. Removing the encryption key makes any remaining ciphertext unusable but does not itself delete it.

To reconnect, first revoke the previous grant if appropriate, remove the obsolete local bulk-secret file yourself, run `spotify:connect` again, then bulk-import the new protected secrets. The CLI refuses to overwrite that file. Never publish its contents or send it to chat. Rotate the Client Secret in Spotify if it is exposed.

## Sources

### Earlier comparison verified on 23 October 2026

Before the consent-gated redesign, the live `/v1/recent` returned 20 recent tracks and zero eligible direct preview tracks. Chrome played Spotify-embed clips for Traición, COSAS QUE NO TE DIJE, and No Me Conoce – Remix through the custom controller. Those observations do not establish full-song availability for every visitor.

### Earlier consent-gated floating player (before the layout cleanup below)

Both retained comparison cards now share one official floating embed and one queue. Direct native preview playback is no longer selected by either card. Backend metadata loads on About mount before consent. The browser displays local icon artwork until acceptance, with no remote artwork, iframe, embed script, preconnect, or audio source. Hover/focus opens a non-modal card-only disclosure. Escape does not close it; leaving the combined pointer/focus region or tapping outside hides it without granting consent. Only the Accept button enables Spotify. Acceptance does not start audio.

`app/lib/spotify-consent.ts` stores only version, acceptance, and timestamps under `portfolio-spotify-consent`, with configurable six-month expiry. Blocked storage falls back to this tab's memory and the card reports that limitation. Storage events synchronize changes across tabs. Expiry is checked on focus and every 30 seconds. The working withdrawal control exists only at `/privacy#spotify`; it removes acceptance and destroys the current player. It cannot erase third-party cookies.

Play reveals a fixed, fully visible official player. Route unmount stops/destroys it. A paused player away from its source card hides after 20 idle seconds unless focused, hovered, initializing, or buffering. One observed playing-to-paused transition at the actual end advances the queue, never an arbitrary pause. Spotify controls autoplay, availability, promotions, and full-versus-preview playback; the site does not suppress those UI elements. No supported iframe volume method exists, so fades are visual only.

The consent and playback-policy unit tests are included in `npm run test:spotify`. Recheck fresh-session browser requests, withdrawal, route cleanup, keyboard/touch use, and actual Spotify completion when changing this flow. This is a technical consent mechanism, not a guarantee of legal compliance.

Browser audit on 23 October 2026: the metadata title loaded with zero Spotify resource entries before consent (measured with a temporary development-only PerformanceObserver, removed after verification). The popup blurred only the music layout, while page and neighboring-card computed filters stayed `none`. Leaving without acceptance kept consent false and created no iframe. Acceptance persisted across reloads without creating a player or starting audio. Native Tab opened the disclosure; Escape kept it open; Tab leaving the region dismissed without accepting. The popup fit a 390×844 viewport. A paused/error-state floating player hid after 20 seconds away from its source card. Policy-page withdrawal relocked another open About tab and removed its remote artwork. Live iframe initialization timed out in this test session even though the standalone Spotify embed URL rendered; real playback, full queue wrap, and actual touch-device behaviour remain unverified for this revision. No successful playback is claimed based solely on passing unit tests.

### Single-card layout cleanup — 23 October 2026

The first comparison row and its mode prop are gone. Expertise and interests are separate stacked spotlight cards with an 18px gap, matching the column gaps. The consent notice is centered with an intrinsic-width Accept button using the normal shared liquid-button target. Its transparent paint layers let the real label remain above the global cursor canvas.

The live cover server's response supported anonymous CORS (`Access-Control-Allow-Origin: *`) and did not set a cookie when checked. Artwork is now shown before acceptance using anonymous CORS without referrer or a credentialed fallback. Player resources remain gated. This supersedes the earlier zero-Spotify-resource artwork behavior described in the historical audit above. Anonymous artwork still exposes the request IP to its image server; it is not a backend-only fetch. The policy has been updated accordingly.

The cleaned-up Worker must be deployed separately for the direct-preview storage cleanup to take effect remotely. Local frontend changes work with both the old and new public response shapes. No secrets or paid Cloudflare products are added by this change.

### Frosted consent-layer correction — 23 October 2026

The disclosure is now content-height rather than almost card-height (about 250px versus 364px in the desktop audit), with a translucent `--page` tint and a dedicated `backdrop-filter: blur(14px) saturate(.65)` background layer. The song remains visible behind it. Unsupported browsers receive a more opaque theme-colored fallback. The card face uses zero inner inset to meet the existing border without the extra ring.

Popup copy is excluded from global ink cloning; underlying music ink and liquid controls are suppressed while their mask-boundary layer is blurred, including the reverse transition. The shared liquid renderer waits until the popup's opacity/filter transition settles, preventing its button from appearing ahead of the popup. All disclosure children share the wrapper's 240ms entrance rather than separate reveal delays. The Accept button retains normal liquid physics once visible.

Before consent the artwork can load anonymously, but its color is neither sampled nor applied. Acceptance permits artwork-derived color sampling and the hover fill; withdrawal removes the sampled variable. Spotify's documented iframe API exposes no background-color getter, and cross-origin iframe DOM cannot be read by the portfolio, so this is explicitly an artwork-derived approximation, not a claimed exact read of the embed's background.

Browser verification: preaccept hover kept the colored gradient at opacity zero and the inline sampled color empty. With the notice open, the global ink mask stayed hidden instead of repainting underlying metadata; the card face inset was zero. Accept produced a sampled color but still no iframe or Spotify scripts until Play. The notice fitted 390px width, Escape kept it open, and all child delays were zero. Test acceptance was withdrawn and viewport restored. Type checking, lint, 20 Spotify tests, and the production app build/static preparation passed. No deployment was performed.

References: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter and https://developer.spotify.com/documentation/embeds/references/iframe-api

### Button-mask and playback lifecycle correction — 23 October 2026

Current behavior: the custom external close button is removed. An initialized, paused player hides after 5 seconds even when its source card is visible, hovered, or focused. Active playback, buffering, and initialization do not start that timer. Spotify's own embedded controls and promotional UI are not modified.

The liquid-renderer handoff now clears stale native text, text-mask and knob-mask ink before drawing a button. A Chrome hover check verified the Accept button had liquid ownership with both mask overlays at opacity zero; `artifacts/spotify-button-mask-fixed.png` records the settled result. The existing synchronized frosted entrance is unchanged. Test acceptance was restored to its original enabled state afterward.

Completion tracking now handles terminal progress that arrives before the paused event, or after an intermediate paused update. It requires actual reported terminal progress, emits once per track, and resets on explicit pause, seek or track changes. It does not invent preview durations or auto-dismiss Spotify promotions. A single-track selection uses Spotify's documented restart command instead of a state-dependent seek/toggle. Retry cleanup preserves a newer Play request, and starting playback uses the documented Play command. The floating iframe is also exempted from the site's smooth-scroll rule that otherwise disables iframe pointer input.

Live verification remains incomplete: a minimal official embed loaded in Chrome, while the actual floating integration intermittently failed to deliver `ready`. One diagnostic navigation reached ready, but a full audio/completion/next-song cycle was not verified. Temporary probes and speculative iframe-navigation changes were removed. Do not describe automatic queue continuation as live-verified on the strength of unit tests alone. No deployment was performed.

### Synchronized transition correction — 23 October 2026

The recording `eweerr.mp4` exposed entrance/exit desynchronization that a settled screenshot did not catch. The previous popup used `z-index:auto` while opacity/filter temporarily created a stacking context, changing its relationship to the music content and global liquid canvas during transitions.

One registered, inherited `--spotify-consent-progress` now drives the glass opacity/blur/translation, foreground opacity/blur/translation, and underlying card blur. The only motion clock is the column's 240ms custom-property transition; there are no separate text/button entrance delays. The neutral layout carrier creates no stacking context, its glass plane remains at 4, and its transparent foreground remains at 89 throughout. This preserves normal button merging through the global liquid canvas at 88 without allowing the foreground to fall behind the music. The fluid renderer requires progress exactly 1 and an open disclosure before it can paint the Accept button. Closing restores ordinary DOM button paint before the synchronized fade. Inert/open-state changes also wake the cursor renderer.

A temporary development-only per-animation-frame logger verified matching progress, glass opacity and foreground opacity during both directions. For example, opening samples at .291648, .523726, .691819 and .926691 all had identical glass/content opacity and no global fluid button; closing samples at .709902, .477445, .309827 and .121038 likewise matched with fluid disabled. The foreground layer remained 89 in every sample. The logger was removed after testing. Final browser state retained consent=false and no Spotify player iframe. Type checking, lint, 20 Spotify tests and the production app build/static preparation passed (the build succeeded on retry after the existing intermittent project-06 prerender failure). Nothing was pushed or deployed.

Verification: Chrome showed exactly one personal row, two separate interest cards, and 18px vertical and horizontal gaps. The live title and anonymous cover loaded with consent false, zero player iframes, and zero Spotify scripts. The centered Accept button measured about 225px rather than filling the notice, and its real label remained visible above the shared liquid canvas. Escape kept the notice open. Acceptance alone loaded no player. After Play at a 2560px viewport, the standalone host began at x=2240 (V10.5), ended at x=2528 (32px edge matching rail padding), and had no wrapper background, border, padding, or shadow. The notice fitted the 390px responsive layout; unrelated globe-route canvas overflow remains outside this change. Test acceptance was withdrawn afterward and viewport sizing restored. The official iframe again timed out, so audio and queue continuation remain unverified. Type checking, lint, all 20 Spotify tests, general tests, and the Worker dry-run passed. The direct production app build and static-output preparation completed with 22 prerendered routes; the full prebuild wrapper encountered an unrelated Windows model-file lock. No secrets were found in frontend output. Nothing was pushed or deployed.

- https://developer.spotify.com/documentation/web-api/reference/get-recently-played
- https://developer.spotify.com/documentation/web-api/tutorials/code-flow
- https://developer.spotify.com/documentation/web-api/concepts/redirect_uri
- https://developer.spotify.com/documentation/web-api/tutorials/february-2026-migration-guide
- https://developer.spotify.com/documentation/design
- https://developer.spotify.com/policy
- https://developer.spotify.com/documentation/embeds/terms
- https://developer.spotify.com/documentation/embeds/references/iframe-api
- https://developer.spotify.com/documentation/web-api/reference/get-track
- https://developers.cloudflare.com/durable-objects/platform/pricing/

The icon comes from Spotify's official 2024 icon package. The local sample artwork was retrieved through the public Spotify oEmbed metadata for Novacane; it is used only by the marked development preview. The live card uses Spotify's returned image unchanged, with its dominant color sampled for the background.
