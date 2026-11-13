# Devices

The **Devices** tab shows a brand's screens in device frames: a monitor, a tablet and a phone
side by side; a laptop with a phone in front; three phones in a row. Whoever is using it chooses
the scene, each device, its finish and what is on its screen, and exports the picture. It is all
drawn in the browser; no screenshot leaves the machine.

- [What it can do](#what-it-can-do)
- [How it fits together](#how-it-fits-together)
- [Using the tab](#using-the-tab)
- [Giving a brand its own mockups](#giving-a-brand-its-own-mockups)
- [Where the frames come from](#where-the-frames-come-from)
- [The status bar](#the-status-bar)
- [A brand's own frames, and their licences](#a-brands-own-frames-and-their-licences)
- [Adding a device or a scene to brandkit](#adding-a-device-or-a-scene-to-brandkit)
- [Limits, and what could come next](#limits-and-what-could-come-next)
- [Files](#files)

## What it can do

| | |
| --- | --- |
| **Devices** | 102 frames from four sources, chosen per device under **Frames from**: brandkit's own 21 drawn frames (six phones, four tablets, three laptops, two monitors and an all-in-one, a browser window and a plain window, two watches, a television), 50 phones from Open Device Frame, 20 frames from Devices.css and 11 from React MockFrame. |
| **Finishes** | Drawn frames: graphite, silver, black, white and the brand's own colour for hardware; light and dark for windows. CSS frames: the colours their stylesheet has (gold, lavender, indigo and so on). Image frames come as drawn. |
| **Orientation** | Phones and tablets stand upright or on their side. A turned phone is the same phone: its size in the scene does not change. |
| **Scenes** | One device; desktop and phone; desktop, tablet and phone; a laptop with a phone in front; a laptop with a tablet and a phone in front; two side by side; three phones. |
| **Screens** | A screenshot (PNG, JPEG or WebP, up to 12 MB), a file from the brand's own mockup, a **brand screen** (the logo that reads best on the brand's primary colour), or empty. A screenshot fills the screen from the top, or fits whole. |
| **Status bar** | On a phone or tablet, the time, signal and battery are drawn above the screenshot and the home bar below it, each in a strip of its own, so neither sits on the screenshot and nothing in it is under the camera. One clock for the scene, which you can set. |
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
"how many options" honest: 102 devices, each in its finishes and orientations.

## Where the frames come from

Each device in a mockup says where its frame is from, under **Frames from**, and a scene can mix
them.

| Source | Frames | How they are drawn | Good for |
| --- | --- | --- | --- |
| **brandkit** | 21: phones, tablets, laptops, desktops, windows, watches, a television | In code, from a few numbers. Generic hardware: no maker's product. | Any scene, above all one that mixes kinds of device. Five finishes, turns on its side, draws everywhere. |
| **[Open Device Frame](https://github.com/SinaKarimi7/open-device-frame)** (MIT) | 50 phones: Apple, Google, Huawei, Samsung, Xiaomi | A transparent image of the phone over the screen. | A named phone, especially Android. Turns on its side. |
| **[Devices.css](https://github.com/picturepan2/devices.css)** (MIT) | 20: iPhones, Pixels, a Galaxy, iPads, a Surface Pro, MacBooks, iMac, Surface Book and Studio, Apple Watches | A stylesheet, placed in the scene as HTML. | Its Surface and watch frames, and its colours. |
| **[React MockFrame](https://github.com/mbdev3/react-mockframe)** (MIT) | 11: iPhones, Pixel 10, Galaxy S25, iPads, MacBook Pros | A stylesheet, each device rendered once to plain markup (the app does not load React for it). | Recent phones in their real colours, with their own pose on their side. |

The three outside sets are in [`src/mockups/frames/`](../src/mockups/frames/), each with its
project's licence; [`NOTICES.md`](../src/mockups/frames/NOTICES.md) there says what each licence
covers. In short: the licences cover the frames' artwork and code, which is why they can ship
here; the products the frames depict belong to their makers. A picture that sets one maker's
device beside another's is the case brandkit's own frames are for, since they depict no one's
product. The tab credits each outside source under the picture.

**CSS frames** are HTML inside the picture. They show in the tab and export as PNG from Chrome,
Edge and Firefox; a browser that will not hand back such a picture says so, and a render outside
a browser (Node) leaves them out. Use a drawn or image frame where that matters.

Two broad collections are not included: **MockUPhone** and **HTML5 Device Mockups**. Their frame
artwork comes from many makers under their own terms (Apple's and Meta's design resources among
them), and each repository is about half a gigabyte. Their frames can still be used, one at a
time, through a brand (see [below](#a-brands-own-frames-and-their-licences)).

To rebuild the sets from their projects, or after one of them adds devices:

```sh
npm run devices:frames -- --from <folder holding the three checkouts>
```

It measures every frame in a browser: an image frame's screen opening from its transparency, a
CSS frame's size and screen from how the browser lays it out.

## The status bar

A screenshot of an app or a page is the page alone. On a real phone the top of the screen is the
device's: the time, the signal, the battery, and the camera cutout; on a phone without a home
button, so is a strip at the foot, for the home bar. So on a phone or tablet the tab draws both
and sets the screenshot **between** them: nothing in it sits under the camera, and the home bar
does not lie across the app's own controls.

- Each strip takes the colour just inside the screenshot's edge beside it (the commonest colour
  there, so a hairline or a few icons do not tint it), and reaches a pixel into the screenshot,
  so no line shows where they meet. Lettering is dark or light to suit. On a brand screen the
  strips are the brand's colour.
- The time is set in the brand's own face where it has the figures. **Time in the status bar**
  and **Date** in the Scene settings change it; a phone shows the time, a tablet the time and date.
- A phone on its side has no bar: the side the camera is on is kept clear instead.
- Untick **Status bar** on a device to use the whole screen, for a screenshot that already
  includes one.

The tab says what size of screenshot fills the space as it stands: 393 × 759 for the island phone
between its bars, 393 × 852 without them. A screenshot the shape of the whole screen is taller
than that space; the tab says how much of its foot is cropped, and offers the three ways out:
take it at the size shown, choose **Fit**, or untick the status bar.

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

## A brand's own frames, and their licences

Beyond the sets above, a brand can add frames of its own: a PNG or WebP of the device with a **transparent screen
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

For frames from MockUPhone, HTML5 Device Mockups or PommePlate, check the terms of the one frame
you want (they differ within each collection), make sure its screen is transparent, and add it
this way with its source and licence.

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
tab, draws every device from every source upright and turned with a screenshot on its screen,
draws every scene, and checks the status bar and the exports. Its screenshots go to `.documentation/devices-browser`.

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
- **CSS frames need a browser.** They do not draw in a Node render, and do not export from a
  browser that will not read back a picture with HTML in it.
- **The status bar is a likeness.** It is drawn the same on every phone; it is not a copy of any
  system's exact icons.

## Files

| File | What it holds |
| --- | --- |
| [`src/mockups/device-catalog.js`](../src/mockups/device-catalog.js) | The devices, finishes, scenes and canvas shapes |
| [`src/mockups/device-frame.js`](../src/mockups/device-frame.js) | Drawing a device and a scene as SVG |
| [`src/mockups/device-project.js`](../src/mockups/device-project.js) | A mockup as data: new, checked on open, and a brand's `devices` |
| [`src/mockups/device-artwork.js`](../src/mockups/device-artwork.js) | The brand screen |
| [`src/mockups/device-screen.js`](../src/mockups/device-screen.js) | The status bar, and the screenshot set below it |
| [`src/mockups/device-sets.js`](../src/mockups/device-sets.js), [`src/mockups/frames/`](../src/mockups/frames/) | The frame sets from other projects, their files and licences |
| [`scripts/device-frames.mjs`](../scripts/device-frames.mjs) | Rebuilds the sets from their projects, measuring each frame |
| [`src/app/views/Devices.jsx`](../src/app/views/Devices.jsx), [`src/mockups/devices.css`](../src/mockups/devices.css) | The tab |
| [`test/device-mockups.test.js`](../test/device-mockups.test.js) | Catalogue, drawing, scenes, saved mockups, brand mockups and frames |
| [`test/browser/devices.check.mjs`](../test/browser/devices.check.mjs) | Browser check of every device, every scene and the exports |
