// The vehicles a mockup can use. Each names the material its painted body uses (artwork is
// projected only onto that, so glass, lights and trim stay clear), how to turn it to face the
// way the prepared areas expect, and the credit its licence asks for. Licences: models/NOTICES.md.

export const VEHICLE_MODELS = Object.freeze({
  shc: Object.freeze({
    url: new URL('./models/shc-hatchback.glb', import.meta.url).href,
    paint: 'grey_car_paint', glass: 'Main_Glass', rotation: 0,
    label: 'Four-door hatchback', note: 'A compact four-door car.',
    title: 'SHC MC Free Promotion Car', creator: 'denniswoo1993 / SHCreations',
    licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
    source: 'https://sketchfab.com/3d-models/shc-mc-free-promotion-car-cfaabdec76a74b68a48ba5657b6d9aee',
    // Its licence asks for credit wherever it appears, so an exported image carries one.
    creditRequired: true,
    sha256: 'df94869005bf592265f41360b7af16bb5268af7df87adfaed5e5d9b4029337f3'
  }),
  suv: Object.freeze({
    url: new URL('./models/suv-original.glb', import.meta.url).href,
    paint: 'green', rotation: -Math.PI / 2,
    label: 'Lightweight SUV', note: 'A simple SUV that loads quickly.',
    title: 'SUV', creator: 'Innerscene',
    licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'https://www.innerscene.com/tools/library/3d-parts/suv-dc972cab',
    creditRequired: false,
    sha256: 'e6a2b224460aeffec6fe87d549251ccb68f8febc19fa80465a39735ed342fd9c'
  }),
  compact: Object.freeze({
    url: new URL('./models/generic-compact-suv.glb', import.meta.url).href,
    paint: 'paint', rotation: 0,
    label: 'Compact SUV', note: 'More detailed bodywork; it takes a moment to load.',
    title: 'Generic compact SUV', creator: 'Innerscene',
    licence: 'CC0', licenceUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: 'https://www.innerscene.com/tools/library/3d-parts/generic-compact-suv-9f157ee5',
    creditRequired: false,
    sha256: 'fd08e2f12559e0c49b65a79e8c9fb3d3811b2109475c219af48a9be466612d3b'
  })
})
