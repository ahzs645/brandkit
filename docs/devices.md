# Devices

The **Devices** tab shows a brand's screens in device frames: a monitor, a tablet and a phone
side by side; a laptop with a phone in front; three phones in a row. Whoever is using it chooses
the scene, each device, its finish and what is on its screen, and exports the picture. It is all
drawn in the browser; no screenshot leaves the machine.

- [What it can do](#what-it-can-do)
- [How it fits together](#how-it-fits-together)
- [Using the tab](#using-the-tab)
- [Giving a brand its own mockups](#giving-a-brand-its-own-mockups)
- [Frames from elsewhere, and their licences](#frames-from-elsewhere-and-their-licences)
- [Adding a device or a scene to brandkit](#adding-a-device-or-a-scene-to-brandkit)
- [Limits, and what could come next](#limits-and-what-could-come-next)
- [Files](#files)

## What it can do

| | |
| --- | --- |
| **Devices** | 21 frames in seven kinds: six phones (island, punch-hole, notch, compact, classic bezel, an open foldable), four tablets, three laptops, two monitors and an all-in-one, a browser window and a plain window, two watches and a television. |
| **Finishes** | Graphite, silver, black, white and the brand's own colour for hardware; light and dark for windows. With orientation that is 147 distinct mockups of a single device. |
| **Orientation** | Phones and tablets stand upright or on their side. A turned phone is the same phone: its size in the scene does not change. |
| **Scenes** | One device; desktop and phone; desktop, tablet and phone; a laptop with a phone in front; a laptop with a tablet and a phone in front; two side by side; three phones. |
| **Screens** | A screenshot (PNG, JPEG or WebP, up to 12 MB), a file from the brand's own mockup, a **brand screen** (the logo that reads best on the brand's primary colour), or empty. A screenshot fills the screen from the top, or fits whole. |
| **Picture** | Transparent, white, or any of the brand's colours behind; a soft shadow under each device; a canvas that fits the devices or is 16:9, 4:3, square or 4:5. |
| **Keeping work** | A draft kept in the browser for each brand, **Save mockup** and **Open…** as a JSON file, **Export PNG** at 1600, 2400 or 3840 px wide and **Export SVG**. |
| **Brand mockups** | A brand can define its own mockups in `brand.json`, with its own screenshots. The tab lists them and opens on the first. |

Each frame's screen is measured in CSS pixels (a phone is 393 × 852, a monitor 1920 × 1080), and
the tab says so beside each device: a screenshot taken at that viewport, or the same shape, fills
the screen exactly.

## How it fits together

The same three things as [Vehicles](vehicles.md), kept separate for the same reason:

```
 brandkit (this repository)          a brand (brand.json + its files)        a mockup (what someone makes)
 ─────────────────────────           ─────────────────────────────────       ──────────────────────────────
 the devices: screen sizes,          devices.mockups: which scene, which     the draft in the browser,
 bezels, cutouts, bases, finishes    devices, which screenshots              a saved .json, an exported
 the scenes and how they stand       devices.frames: frames of its own,      .png or .svg
 the renderer: one SVG per scene     as images, with their licence
```

- **brandkit owns the devices.** A device is a few numbers in
  [`device-catalog.js`](../src/mockups/device-catalog.js) and is drawn in code, so every brand
  gets every device and nothing has to be downloaded to show one.
- **A brand owns its mockups.** Which scene, which devices and which screenshots is data in the
  brand's `brand.json`; the screenshots are files in the brand's folder and travel in its pack.
- **A mockup is what someone makes** from the two. It may carry screenshots of its own (inside
  the saved file), and may only name brand files the brand's mockups use.

A model, its finish, its orientation and the scene it stands in are separate choices. That keeps
"how many options" honest: 21 devices, not 147, with 147 ways to show one.

### Why the frames are drawn, not downloaded

There are good open collections of device frames (see the next section), but their artwork
comes from several sources under several terms, and the best-known hardware is the most
restricted: Apple's marketing guidelines, for one, do not allow its product images to be shown
beside competing products or altered. A scene that puts a phone, a tablet and a Windows laptop
together is exactly that case. So the built-in frames are brandkit's own drawings of generic
hardware, which can be mixed, recoloured and turned freely, and outside artwork comes in through
a brand, with its licence recorded.

## Using the tab

1. Open a brand and choose **Devices**. A new mockup opens on the brand's first mockup or, for a
   brand without one, a monitor, a tablet and a phone showing brand screens.
2. **Scene**: how many devices and how they stand, the canvas shape, the background and the
   shadow. Changing the scene keeps each screen, by position.
3. **Devices**: for each, the device (listed by kind; type to search), its finish, whether it is
   upright or on its side, and what is on its screen. **Add a screenshot…** takes a PNG, JPEG or
   WebP; **Fill** crops it to the screen from the top, **Fit** shows all of it.
4. **Save mockup** keeps a file to open later with **Open…**. **Export PNG** makes the image at
   the chosen width, with a transparent background if none is set; **Export SVG** makes the same
   picture as a vector file with the screenshots inside it.

## Giving a brand its own mockups

```json
"devices": {
  "mockups": [{
    "id": "field-app",
    "label": "Field app",
    "description": "The same project on a desktop, a tablet and a phone.",
    "preset": "three-screens",
    "canvas": "16:9",
    "background": "primary",
    "slots": [
      { "device": "browser", "finish": "light", "screen": { "file": "screens/desktop-1440x900.png" } },
      { "device": "tablet-11", "screen": { "file": "screens/tablet-834x1194.png" } },
      { "device": "phone-notch", "finish": "graphite", "screen": { "file": "screens/phone-390x844.png", "fit": "cover" } }
    ]
  }]
}
```

Put the screenshots in the brand's folder, name them in `slots`, and run `brandkit check`. The
full format is in [brand-schema.md → Devices](brand-schema.md#devices). Capture each screenshot
at the device's screen size where you can: the sizes are in the table under
[Adding a device](#adding-a-device-or-a-scene-to-brandkit) and beside each device in the tab.

## Frames from elsewhere, and their licences

A brand can add frames of its own: a PNG or WebP of the device with a **transparent screen
opening**, and where that opening is.

```json
"devices": {
  "frames": [{
    "id": "rugged-handheld",
    "label": "Rugged handheld",
    "category": "phone",
    "image": "devices/rugged-handheld.png",
    "size": [520, 1040],
    "screen": { "x": 60, "y": 150, "width": 400, "height": 760, "radius": 12 },
    "stature": 0.42,
    "rotates": true,
    "source": { "name": "Photographed in house", "licence": "Owned by the brand" }
  }]
}
```

`source.name` and `source.licence` are required, and `brandkit check` refuses a frame without
them: **a frame's artwork is licensed apart from the code that draws it**, and the brand that
ships it is the one that has to be able to say where it came from. `url` and `licenceUrl` (https)
make the tab's credit a link; `credit` is a line drawn into the exported picture, for licences
that ask for attribution on the image itself.

Collections worth knowing, with what to check before using each:

| Collection | What it has | Check |
| --- | --- | --- |
| [Open Device Frame](https://github.com/SinaKarimi7/open-device-frame) | About 50 phone frames (Apple, Google, Huawei, Samsung, Xiaomi) as transparent WebP; MIT | The screen opening has to be measured for each frame. The frames depict real products. |
| [MockUPhone](https://github.com/oursky/mockuphone.com) | A broad catalogue: phones, tablets, Windows laptops, watches, televisions | Code is Apache-2.0; the frame artwork comes from several makers under their own terms. Check each frame. |
| [Devices.css](https://github.com/picturepan2/devices.css), [React MockFrame](https://github.com/mbdev3/react-mockframe) | Frames drawn in CSS; MIT | These are code, not images: they are the same idea as brandkit's own drawn frames and are not needed here. |
| [PommePlate](https://github.com/ephread/PommePlate) | Apple devices as SVG and PNG; CC0; archived in 2023 | Apple-only: do not mix with other makers' hardware in one scene. |

For a scene that mixes kinds of device, use the built-in frames.

## Adding a device or a scene to brandkit

A device is one entry in `DEVICES` in [`device-catalog.js`](../src/mockups/device-catalog.js):

```js
'phone-punch': phone('Phone, punch-hole camera', 'A tall phone with a single centred camera', [412, 915],
  { radius: 36, bezel: 10, corner: 46, cutout: 'punch', stature: 0.43 }),
```

| Field | What it is |
| --- | --- |
| `screen` | Width and height in CSS pixels, in the device's natural orientation (upright for a phone, tablet or watch). |
| `radius`, `corner` | The screen's corner radius and the body's. |
| `bezel` | The surround, as one number or `[top, right, bottom, left]`. |
| `cutout` | `island`, `punch`, `punch-corner`, `notch`, `camera` (a dot in the bezel) or `home` (a classic home button). |
| `base` | `laptop`, `stand`, `chin`, `feet`, `strap` or `window`: what the screen stands on. |
| `stature` | How tall it stands in a scene; a 27 inch monitor on its stand is 1. |
| `rotates`, `finishes` | Whether it turns on its side, and the finishes it comes in. |

A scene is one entry in `PRESETS`: a label, `row` or `cluster`, and the devices it opens with.

After either: `npm test`, then `npm run build && npm run test:devices:browser`, which opens the
tab, draws every device upright and turned with a screenshot on its screen, draws every scene,
and checks the exports. Its screenshots go to `.documentation/devices-browser`.

Built-in screens:

| Kind | Devices (screen in CSS px) |
| --- | --- |
| Phones | island 393 × 852 · punch-hole 412 × 915 · notch 390 × 844 · compact 360 × 780 · classic 375 × 667 · foldable 884 × 1104 |
| Tablets | 11 inch 834 × 1194 · 13 inch 1024 × 1366 · 8 inch 744 × 1133 · widescreen 800 × 1280 |
| Laptops | 14 inch 1512 × 982 · 16 inch 1728 × 1117 · 13 inch widescreen 1366 × 768 |
| Desktops | monitor 1920 × 1080 · ultrawide 2560 × 1080 · all-in-one 1920 × 1080 |
| Windows | browser 1440 × 900 · plain 1440 × 900 |
| Watches | square 198 × 242 · round 240 × 240 |
| Television | 1920 × 1080 |

## Limits, and what could come next

- **Front-on only.** Frames are flat drawings: no perspective, tilt or 3D. A tilted hero shot
  would be a new renderer, not a new device.
- **Stills only.** No screen recordings and no animated export yet.
- **Screenshots, not live pages.** A screen shows an image. Showing a live site would need the
  site to allow being framed, and a browser cannot export a picture of another site's page.
- **Fixed scenes.** A scene has one to three devices in set positions; devices cannot be dragged.
- **No frames are bundled from outside collections.** The catalogue format takes them through a
  brand; none ship with brandkit, for the licence reasons above.
- **Generic hardware.** The built-in frames are not any manufacturer's exact device.

## Files

| File | What it holds |
| --- | --- |
| [`src/mockups/device-catalog.js`](../src/mockups/device-catalog.js) | The devices, finishes, scenes and canvas shapes |
| [`src/mockups/device-frame.js`](../src/mockups/device-frame.js) | Drawing a device and a scene as SVG |
| [`src/mockups/device-project.js`](../src/mockups/device-project.js) | A mockup as data: new, checked on open, and a brand's `devices` |
| [`src/mockups/device-artwork.js`](../src/mockups/device-artwork.js) | The brand screen |
| [`src/app/views/Devices.jsx`](../src/app/views/Devices.jsx), [`src/mockups/devices.css`](../src/mockups/devices.css) | The tab |
| [`test/device-mockups.test.js`](../test/device-mockups.test.js) | Catalogue, drawing, scenes, saved mockups, brand mockups and frames |
| [`test/browser/devices.check.mjs`](../test/browser/devices.check.mjs) | Browser check of every device, every scene and the exports |
