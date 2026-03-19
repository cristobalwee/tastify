# tastify — Static HTML Example

The simplest possible tastify integration: a single HTML file loaded from a CDN.

## How it works

1. A `<link>` tag loads the tastify stylesheet
2. A `<script>` tag loads the tastify vanilla bundle with a `data-tastify-token-url` attribute
3. `<div data-tastify="...">` elements become Spotify widgets automatically

No build step. No framework. No JS to write.

## Setup

1. Deploy a token endpoint — run `npx tastify init` to generate one
2. Update the `data-tastify-token-url` in `index.html` to point to your endpoint
3. Open `index.html` in a browser
