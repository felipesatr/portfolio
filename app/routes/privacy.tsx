import type { Route } from "./+types/privacy";
import { PageHeader } from "~/components/page-header";
import { RevealTitle } from "~/components/motion-reveal";
import { siteContent, routeMeta } from "~/content/site";
import { useState } from "react";
import { useSpotifyConsent } from "~/lib/use-spotify-consent";
import { withdrawSpotifyConsent } from "~/lib/spotify-consent";

export function meta(_args: Route.MetaArgs) {
  return routeMeta("Privacy", "How this portfolio currently handles preferences, contact links, and personal information.", "/privacy");
}

export default function Privacy() {
  const spotifyEnabled = useSpotifyConsent();
  const [withdrawn, setWithdrawn] = useState(false);
  return (
    <div className="standard-page policy-page">
      <PageHeader
        title="Privacy."
        intro="This portfolio stores local preferences and uses third-party services for approximate location and optional Spotify playback. It has no visitor accounts, contact forms, newsletter, or portfolio analytics."
      />
      <div className="policy-page__body">
        <section>
          <p className="section-index">01</p>
          <RevealTitle lines={["Information this site stores"]} />
          <p>The selected color theme is saved in your browser so it can be restored on a later visit. Session preferences record whether the short loading introduction has already played and which globe caption to show next. The About-page globe can cache an approximate city and the provider’s coordinates in this tab’s session storage for up to six hours to avoid repeated location lookups. These preferences and cached coordinates are not sent to a portfolio database.</p>
        </section>
        <section>
          <p className="section-index">02</p>
          <RevealTitle lines={["Contact and external links"]} />
          <p>Email links open your chosen mail application. LinkedIn, résumé, hosting, and future project links may take you to services with their own privacy practices. This portfolio does not currently receive information unless you deliberately send an email.</p>
        </section>
        <section>
          <p className="section-index">03</p>
          <RevealTitle lines={["Approximate location on the About page"]} />
          <p>After the About page first renders, your browser can make two parallel requests to <a href="https://ipwhois.io/privacy" target="_blank" rel="noreferrer">IPWhois</a> and <a href="https://freeipapi.com" target="_blank" rel="noreferrer">FreeIPAPI</a>. Both services receive your network IP address as part of the request. The site compares their approximate cities, regions, countries and coordinates, and checks available ISP, network and proxy information. City disagreement or network uncertainty reduces the location detail shown. The requests time out after 1.6 seconds and do not block the page or globe from rendering. The site does not request GPS access, store your IP address or ISP information, or track your location. Only the resulting approximate place, coordinates and comparison status can be cached locally: up to six hours for matching city estimates, or fifteen minutes for less certain results. If no usable estimate is available, the globe still appears without a visitor marker or invented distance. Places you click on the globe are processed locally using a bundled city reference dataset, not sent to a geocoding service or saved to a server.</p>
        </section>
        <section id="spotify">
          <p className="section-index">04</p>
          <RevealTitle lines={["Music on the About page"]} />
          <p>The music card displays Felipe’s selected recent Spotify tracks. Visitors do not connect their Spotify accounts. The card requests public track metadata from a Cloudflare Worker; Cloudflare receives the network IP address. This code keeps only a temporary keyed hash for rate limiting, not the IP address, and does not save a visitor’s country or listening activity. Felipe’s Spotify credentials stay on the server.</p>
          <p>Song names and artists load from our backend before Spotify playback is enabled. Cover artwork also loads before acceptance, directly from Spotify’s image servers using anonymous cross-origin requests without cross-site cookies or a page referrer. Those servers still receive your network IP address. If anonymous loading fails, the card shows a local icon rather than retrying with credentials. Until you select “Accept &amp; enable Spotify,” the integration does not load Spotify’s player or scripts. Outbound Spotify links open only if you choose to follow them. After acceptance, using Play loads Spotify’s official embedded player. Spotify receives those requests and may use cookies, similar technologies, or an existing Spotify session for playback, analytics, and advertising under its <a href="https://www.spotify.com/legal/privacy-policy/" target="_blank" rel="noreferrer">privacy policy</a> and <a href="https://www.spotify.com/legal/cookies-policy/" target="_blank" rel="noreferrer">cookie policy</a>.</p>
          <p>Your Spotify-specific acceptance, timestamp, expiry, and disclosure version are saved locally for six months unless you withdraw sooner or the disclosure changes materially. If storage is unavailable, acceptance lasts only in memory for this tab. This is not consent for unrelated services. Playback and shuffled queue state stay in page memory; leaving About stops playback. The portfolio does not record which songs visitors play.</p>
          <p>After acceptance, the card can request the selected track’s background color from the same Cloudflare backend. The backend reads the track’s public Spotify embed page anonymously, without forwarding your cookies, IP address, or Spotify credentials, and caches only the color for up to one day. The color request does not load Spotify’s player into your browser.</p>
          <p>Withdraw below to stop playback, remove the player, and prevent further Spotify player resources from loading through this integration until you accept again. Public track metadata and anonymous cover artwork can still load. This cannot delete Spotify cookies already stored by your browser or affect Spotify in other tabs. To remove existing cookies, use your browser’s site-data settings for spotify.com and its related domains; doing so may sign you out of Spotify.</p>
          <button type="button" className="button button--secondary" disabled={!spotifyEnabled} onClick={() => { withdrawSpotifyConsent(); setWithdrawn(true); }}><span className="liquid-button__surface">Withdraw Spotify consent</span></button>
          <p role="status" aria-live="polite">{spotifyEnabled ? 'Spotify playback is enabled in this browser.' : withdrawn ? 'Spotify consent withdrawn. Playback is stopped and the integration is disabled.' : 'Spotify playback is not enabled.'}</p>
        </section>
        <section>
          <p className="section-index">05</p>
          <RevealTitle lines={["Questions or requests"]} />
          <p>For a privacy question, or to ask about information you have deliberately shared by email, contact <a href={`mailto:${siteContent.email}`}>{siteContent.email}</a>. The address is still a V0 placeholder and must be replaced before launch.</p>
        </section>
      </div>
      <p className="policy-page__updated">Draft last updated 23 October 2026. This is a plain-language project notice, not legal advice.</p>
    </div>
  );
}
