// The devices a screen mockup can use: phones, tablets, laptops, monitors, browser windows,
// watches and a television. Every frame here is drawn in code for brandkit from a few numbers
// (screen size, bezels, corners, a camera cutout, a base), so none of it is a manufacturer's
// artwork and a scene can mix kinds of device freely. A model, its finish, its orientation and
// the scene it stands in are separate choices, so each stays meaningful as the list grows.
//
// A screen is given in CSS pixels in the device's natural orientation (upright for a phone,
// tablet or watch; wide for the rest): a screenshot taken at that viewport fills it exactly.
// `stature` is how tall the device stands in a scene beside the others (a 27 inch monitor on its
// stand is 1), so a phone is not drawn the size of a laptop.
//
// A brand can add frames of its own as images with a screen opening (`devices.frames` in
// brand.json): see device-project.js and docs/devices.md.

export const SCHEMA = 'brandkit-device-mockup/1'

export const CATEGORIES = Object.freeze({
  phone: 'Phones', tablet: 'Tablets', laptop: 'Laptops', desktop: 'Desktops', browser: 'Windows', watch: 'Watches', tv: 'Televisions'
})

/**
 * Finishes: the band round the edge (`rim`), the body behind it (`body`), the surround of the
 * screen (`bezel`) and small details (`detail`). `brand` is filled in from the open brand.
 */
export const FINISHES = Object.freeze({
  graphite: { label: 'Graphite', rim: '#4a4d54', body: '#2c2e33', bezel: '#0c0d0f', detail: '#1a1b1e' },
  silver: { label: 'Silver', rim: '#e9eaed', body: '#c9ccd1', bezel: '#0c0d0f', detail: '#9a9da3' },
  black: { label: 'Black', rim: '#26282c', body: '#101114', bezel: '#050506', detail: '#2f3136' },
  white: { label: 'White', rim: '#ffffff', body: '#ecece9', bezel: '#f6f6f4', detail: '#c8c9c6' },
  brand: { label: 'Brand colour' },
  light: { label: 'Light', rim: '#d5d8dc', body: '#f1f2f4', bezel: '#ffffff', detail: '#b9bdc3' },
  dark: { label: 'Dark', rim: '#3a3d43', body: '#24262b', bezel: '#17181b', detail: '#5a5e66' }
})

const HARDWARE = ['graphite', 'silver', 'black', 'white', 'brand']
const WINDOW = ['light', 'dark']
const DRAWN = Object.freeze({ name: 'Drawn for brandkit', licence: 'Part of brandkit' })

const phone = (label, note, screen, { radius, bezel, corner, cutout, stature = 0.42, ...rest }) => ({ label, note, category: 'phone', screen, radius, bezel, corner, cutout, stature, rotates: true, buttons: true, finishes: HARDWARE, source: DRAWN, ...rest })
const tablet = (label, note, screen, { radius = 18, bezel = 28, corner = 40, stature, ...rest }) => ({ label, note, category: 'tablet', screen, radius, bezel, corner, cutout: 'camera', stature, rotates: true, finishes: HARDWARE, source: DRAWN, ...rest })
const laptop = (label, note, screen, { bezel, stature, ...rest }) => ({ label, note, category: 'laptop', screen, radius: 8, bezel, corner: 18, cutout: 'camera', base: 'laptop', stature, finishes: HARDWARE, source: DRAWN, ...rest })
const desktop = (label, note, screen, { base, stature, bezel = 14, ...rest }) => ({ label, note, category: 'desktop', screen, radius: 4, bezel, corner: 14, base, stature, finishes: HARDWARE, source: DRAWN, ...rest })

export const DEVICES = Object.freeze({
  'phone-island': phone('Phone, island cutout', 'A tall phone with a pill-shaped camera cutout', [393, 852], { radius: 48, bezel: 14, corner: 62, cutout: 'island' }),
  'phone-punch': phone('Phone, punch-hole camera', 'A tall phone with a single centred camera', [412, 915], { radius: 36, bezel: 10, corner: 46, cutout: 'punch', stature: 0.43 }),
  'phone-notch': phone('Phone, notch', 'A phone with a notch at the top of the screen', [390, 844], { radius: 42, bezel: 16, corner: 58, cutout: 'notch' }),
  'phone-compact': phone('Phone, compact', 'A smaller phone with a punch-hole camera', [360, 780], { radius: 30, bezel: 12, corner: 42, cutout: 'punch', stature: 0.38 }),
  'phone-classic': phone('Phone, classic bezel', 'Bezels above and below a square-cornered screen, with a home button', [375, 667], { radius: 0, bezel: [92, 16, 92, 16], corner: 56, cutout: 'home', stature: 0.4 }),
  'phone-fold': phone('Foldable, open', 'A folding phone opened flat, with its hinge down the middle', [884, 1104], { radius: 26, bezel: 12, corner: 38, cutout: 'punch-corner', hinge: true, stature: 0.43 }),

  'tablet-11': tablet('Tablet, 11 inch', 'An even bezel all round', [834, 1194], { stature: 0.6 }),
  'tablet-13': tablet('Tablet, 13 inch', 'The large tablet', [1024, 1366], { bezel: 30, corner: 42, stature: 0.68 }),
  'tablet-8': tablet('Tablet, 8 inch', 'The small tablet', [744, 1133], { radius: 20, bezel: 30, corner: 44, stature: 0.5 }),
  'tablet-wide': tablet('Tablet, 10 inch widescreen', 'A 16:10 tablet', [800, 1280], { radius: 14, bezel: 26, corner: 34, stature: 0.58 }),

  'laptop-14': laptop('Laptop, 14 inch', 'Thin bezels, 16:10', [1512, 982], { bezel: [22, 14, 16, 14], stature: 0.6 }),
  'laptop-16': laptop('Laptop, 16 inch', 'Thin bezels, 16:10', [1728, 1117], { bezel: [24, 16, 18, 16], stature: 0.66 }),
  'laptop-13': laptop('Laptop, 13 inch widescreen', 'A 16:9 screen with a deeper bezel below it', [1366, 768], { bezel: [26, 20, 40, 20], stature: 0.56 }),

  'monitor-27': desktop('Monitor, 27 inch', 'A monitor on a stand', [1920, 1080], { base: 'stand', stature: 1 }),
  'monitor-ultrawide': desktop('Monitor, ultrawide', 'A 21:9 monitor on a stand', [2560, 1080], { base: 'stand', stature: 0.9 }),
  'all-in-one': desktop('All-in-one, 24 inch', 'A screen with a deep chin on a foot', [1920, 1080], { base: 'chin', stature: 0.94 }),

  browser: { label: 'Browser window', note: 'A window with a toolbar and an address field', category: 'browser', screen: [1440, 900], radius: 0, bezel: [56, 1, 1, 1], corner: 14, base: 'window', chrome: 'browser', stature: 0.84, finishes: WINDOW, source: DRAWN },
  window: { label: 'Plain window', note: 'A window with a title bar and nothing else', category: 'browser', screen: [1440, 900], radius: 0, bezel: [36, 1, 1, 1], corner: 12, base: 'window', chrome: 'plain', stature: 0.82, finishes: WINDOW, source: DRAWN },

  'watch-square': { label: 'Watch, square', note: 'A rounded square watch on its strap', category: 'watch', screen: [198, 242], radius: 46, bezel: 16, corner: 62, base: 'strap', stature: 0.34, finishes: HARDWARE, source: DRAWN },
  'watch-round': { label: 'Watch, round', note: 'A round watch on its strap', category: 'watch', screen: [240, 240], radius: 120, bezel: 18, corner: 138, base: 'strap', stature: 0.34, finishes: HARDWARE, source: DRAWN },

  'tv-55': { label: 'Television', note: 'A wide screen on two feet', category: 'tv', screen: [1920, 1080], radius: 2, bezel: 10, corner: 8, base: 'feet', stature: 1.14, finishes: ['black', 'graphite', 'silver'], source: DRAWN }
})

export const DEVICE_IDS = Object.freeze(Object.keys(DEVICES))

/**
 * Scenes: how many devices and how they stand. `row` sets them side by side on one baseline;
 * `cluster` puts the first in the middle and the others in front of its lower corners.
 */
export const PRESETS = Object.freeze({
  single: { label: 'One device', layout: 'row', slots: ['laptop-14'] },
  'desktop-phone': { label: 'Desktop and phone', layout: 'row', slots: ['monitor-27', 'phone-island'] },
  'three-screens': { label: 'Desktop, tablet and phone', layout: 'row', slots: ['monitor-27', 'tablet-11', 'phone-island'] },
  'laptop-phone': { label: 'Laptop with a phone in front', layout: 'cluster', slots: ['laptop-14', 'phone-punch'] },
  family: { label: 'Laptop with a tablet and a phone in front', layout: 'cluster', slots: ['laptop-16', 'phone-island', 'tablet-11'] },
  'side-by-side': { label: 'Two side by side', layout: 'row', slots: ['browser', 'browser'] },
  'three-phones': { label: 'Three phones', layout: 'row', slots: ['phone-island', 'phone-punch', 'phone-compact'] }
})

export const CANVASES = Object.freeze({ fit: null, '16:9': 16 / 9, '4:3': 4 / 3, '1:1': 1, '4:5': 4 / 5 })
export const CANVAS_LABELS = Object.freeze({ fit: 'Fit', '16:9': '16:9', '4:3': '4:3', '1:1': 'Square', '4:5': '4:5' })

/** `[top, right, bottom, left]` from a bezel given as one number or four. */
export const bezelOf = (device) => (Array.isArray(device.bezel) ? device.bezel : [device.bezel, device.bezel, device.bezel, device.bezel])

/** How many distinct mockups of one device the catalogue offers: finish by orientation. */
export const variantsOf = (device) => (device.finishes?.length ?? 1) * (device.rotates ? 2 : 1)
