# Frame sets: where they come from

The Devices tab offers three sets of device frames beside brandkit's own drawn ones. Each folder
here was made by [`scripts/device-frames.mjs`](../../../scripts/device-frames.mjs) from a checkout
of the project it is named for, and holds that project's licence file unchanged. `set.json` in
each records the commit it was made from.

| Set | Project | Made by | Licence | What is here |
| --- | --- | --- | --- | --- |
| `open-device-frame/` | [Open Device Frame](https://github.com/SinaKarimi7/open-device-frame) | Sina Karimi and contributors | [MIT](open-device-frame/LICENSE) | 50 phone frames as transparent WebP images, unchanged, and the screen opening measured in each |
| `devices-css/` | [Devices.css](https://github.com/picturepan2/devices.css) | Yan Zhu | [MIT](devices-css/LICENSE) | The minified stylesheet, unchanged, and the markup and measurements of 20 frames |
| `react-mockframe/` | [React MockFrame](https://github.com/mbdev3/react-mockframe) | Mohammed Banani; frame styles adapted from Marvel devices.css (MIT, 2014 Marvelapp) | [MIT](react-mockframe/LICENSE) | The stylesheet, unchanged, and 11 frames rendered once to plain markup, upright and on their side |

## What the licences cover, and what they do not

The licences above cover the **artwork and code of the frames**: the drawings, the stylesheets,
the markup. They are why the frames can ship here.

They do not cover the **products the frames depict**. The names and designs of an iPhone, a Pixel,
a Galaxy or a MacBook belong to their makers. Showing a product to say "our app runs on this" is
ordinary use; implying a maker's endorsement, or altering a product's look, is not. Open Device
Frame describes its frames as community-drawn illustrations, not manufacturers' artwork, and
React MockFrame states that it includes no Apple artwork.

For a picture that sets one maker's device beside another's, brandkit's own drawn frames are the
ones made for it: they depict no one's product.

## Not included

- **MockUPhone** and **HTML5 Device Mockups** have the broadest catalogues, but their frame
  artwork comes from many makers under their own terms (Apple's and Meta's design resources among
  them), and each repository is about half a gigabyte. Their frames can be used through a brand:
  add the frame's image to the brand as `devices.frames`, with its source and licence.
- **PommePlate** (CC0, archived 2023) draws Apple devices only, with the screen filled in rather
  than open, so its frames need preparing before they can hold a screenshot.

## Rebuilding

```sh
git clone --depth 1 https://github.com/SinaKarimi7/open-device-frame sources/open-device-frame
git clone --depth 1 https://github.com/picturepan2/devices.css sources/devices.css
git clone --depth 1 https://github.com/mbdev3/react-mockframe sources/react-mockframe
npm run devices:frames -- --from sources
npm test
```
