# Location Guard Ng (UserScript)

**Location Guard Ng** is a rewritten version of the original [Location Guard](https://github.com/chatziko/location-guard) browser extension that uses modern web technology and is now a UserScript. It allows to protect your location while using location-aware websites, by either adding controlled noise or completely spoof with the fixed coordinates. It supports the following UserScript managers:

- [Tampermonkey](https://www.tampermonkey.net/)
- [Violentmonkey](https://violentmonkey.github.io/)
- [AdGuard](https://adguard.com/)

> Do note that AdGuard's userscript capabilities are limited (E.g. `GM_addValueChangeListener` and `registerMenuCommand`)

## Installation

https://cdn.jsdelivr.net/npm/location-guard@latest/dist/location-guard-ng.user.js

## TODO

- [ ] New configuration UI
  - The current configuration UI is back ported directly from the original browser extension. Need to rewrite in React and JoyUI.
- [ ] Per domain configuration
  - The original browser extension allows to set different privacy levels for different domains. This feature is not yet implemented in the UserScript version.

## How to build

- Clone the repository
- Use [pnpm](https://pnpm.io/) to install dependencies (`pnpm i`)
- Run `pnpm run build`
- The built script will be available in `dist` folder

<details>
<summary>
<h2>FAQ</h2>
</summary>

### What is Location Guard and Location Guard Ng?

Websites can ask the browser for your location (via JavaScript). When they do
so, the browser first asks your permission, and if you accept, it detects your
location (typically by transmitting a list of available wifi access points to a
geolocation provider such as Google Location Services, or via GPS if available)
and gives it to the website.

The Location Guard browser extension project starts since 2013 and aims to
intercepts this procedure. It has been discontinued in 2020 and now obsolete
(due to [the removal of MV2 support in Google Chrome](https://developer.chrome.com/docs/extensions/develop/migrate/mv2-deprecation-timeline)).

The Location Guard Ng is a rewrite version of the original Location Guard browser
extension that uses modern web technology (Like TypeScript, React, rollup, etc).

The permission dialog appears as usual, and you can still choose to deny. If
you give permission, then Location Guard Ng obtains your location and adds "random noise"
to it or even completely spoofs it with a specified fixed location. Only
the fake location is then given to the website.

To see Location Guar Ng in action use [this demo](https://browserleaks.com/geo), a
[geolocalized weather forecast](https://darksky.net/), or go to [Google
Maps](https://www.google.com/maps) and press the "pin" button.

### What kind of privacy does Location Guard Ng provide?

Location Guard Ng provides privacy within a certain _protection area_ by ensuring
that all locations within this area look _plausible_ for being the real one.
This is achieved by adding random noise in a way such that all locations within
the protection area can produce the same fake location with similar probability.
As a consequence, the fake location provides no information to the website for
distinguishing between locations within the protection area.

**Warning:** _background knowledge_ can still be used by websites to guess the
real location within the protection area. For instance, if the protection area
is in the middle of a lake containing only a small island, it will be easy to
infer that the real location is on the island. In scenarios like this you should
choose a higher privacy level, or deny disclosing your location at all, or specify
a fixed location.

### What are "privacy levels"?

The privacy level determines the amount of noise added to your real location. A
higher level adds more noise, so the fake location will be further away from the
real one. This offers protection within a larger area, but it might make the
service provided by the website less useful.

By default all websites use the "medium" level (this can be changed from the
extension's options). You can select a different level for a specific website
using the ![](src/images/pin_19.png) icon. For instance, you could select
a lower privacy level for websites that need an accurate location (eg. maps),
and a higher one for websites that only need approximate information (eg.
weather forecast).

For more flexibility, each level can be configured from the _Privacy Levels_
tab. The red circle is the _protection area_: locations in this area look
plausible to be the real one (see "What kind of privacy does Location Guard
provide?" above). The blue circle is the _accuracy_: the fake location will be
inside this circle with high probability (note that the noise is random). Use
the slider to adapt the two areas to your needs.

### What is a "fixed location"?

The privacy level can be set to "Use fixed location". In this case Location
Guard always reports to the website a predefined fixed location that never
changes (instead of generating a fake location by adding noise to the real one).
This offers the highest privacy, since the reported location is completely
independent from the real one, at the cost of very low accuracy.

You can modify the fixed location from the extension's options (Fixed Location
tab).

When using a fixed location, the browser's geolocation is not performed at all.
This offers better privacy, since the list of wifi access points is not
transmitted to Google's servers. However, it has the side effect that the
_permission dialog is not displayed at all_. This behaviour is usually
acceptable when the fixed location is dummy, but it can be modified if you wish.

### Why some websites detect my location although I use Location Guard Ng?

Some websites detect your location based on your [IP address](https://en.wikipedia.org/wiki/IP_address)
which is visible to all websites you visit. However, most of the time this type
of geolocation is _not accurate_ and is limited to the city or postal/zip code level.

Location Guard Ng does not protect your IP address; it hides the location revealed
by the browser through the JavaScript API, which is usually _very accurate_.

### How Location Guard Ng uses my information?

Location Guard Ng takes your privacy seriously! First, the extension itself has no
"special permission" to access your location, it can obtain it only when a
website asks for it and only if you allow access in the permission dialog.

Location Guard Ng runs locally in your browser and _sends no information_
whatsoever to the network. It only communicates your fake location to the
website that asks for it.

Location Guard Ng also never stores your real location. The _fake_ location is
cached for a small period of time; if a website asks for your location during
this time the cached fake location will be returned. This improves privacy by
avoiding to generate too many fake locations which would be centered around the
real one. The cache period can be configured from the extension's options
(Privacy Levels tab) and there is also a button to delete the cache.

### What is the technology behind Location Guard Ng?

Location Guard Ng implements a [location obfuscation](https://en.wikipedia.org/wiki/Location_obfuscation)
technique based on adding noise from a 2-dimensional
[Laplace distribution](https://en.wikipedia.org/wiki/Laplace_distribution).
This method can be formally shown to provide a privacy guarantee which is a variant
of [Differential Privacy](https://en.wikipedia.org/wiki/Differential_privacy).
More details can be found in the [CCS'13 paper](http://arxiv.org/abs/1212.1984),
or in the [PhD thesis](https://pastel.archives-ouvertes.fr/tel-01098088/document)
of Nicolas Bordenabe.

</details>

----

**Location Guard Ng** © [Sukka](https://github.com/SukkaW), Released under the [MIT](./LICENSE) License.
Authored and maintained by Sukka with help from contributors ([list](https://github.com/SukkaW/bring-github-old-feed-back/graphs/contributors)).

> [Personal Website](https://skk.moe) · [Blog](https://blog.skk.moe) · GitHub [@SukkaW](https://github.com/SukkaW) · Telegram Channel [@SukkaChannel](https://t.me/SukkaChannel) · Mastodon [@sukka@acg.mn](https://acg.mn/@sukka) · Twitter [@isukkaw](https://twitter.com/isukkaw) · Keybase [@sukka](https://keybase.io/sukka)

<p align="center">
  <a href="https://github.com/sponsors/SukkaW/">
    <img src="https://sponsor.cdn.skk.moe/sponsors.svg"/>
  </a>
</p>
