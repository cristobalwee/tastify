# @tastify/vanilla

Vanilla JS Spotify widgets — works with any site, no framework required.

## Install

```bash
npm install @tastify/vanilla
```

Or load from a CDN:

```html
<link rel="stylesheet" href="https://unpkg.com/@tastify/vanilla/dist/styles.css" />
<script src="https://unpkg.com/@tastify/vanilla" data-tastify-token-url="/api/spotify/token"></script>
```

## Usage

### Data attributes (zero JS)

```html
<div data-tastify="now-playing"></div>
<div data-tastify="top-tracks" data-limit="5"></div>
<div data-tastify="top-artists" data-layout="grid" data-columns="3"></div>
<div data-tastify="recently-played" data-limit="10"></div>
```

### JavaScript API

```js
import { mount } from '@tastify/vanilla'

const widget = mount('#player', {
  type: 'now-playing',
  tokenUrl: '/api/spotify/token',
})

// Later: widget.update({ compact: true }) or widget.destroy()
```

See the [monorepo README](https://github.com/your-repo/tastify) for full documentation.
