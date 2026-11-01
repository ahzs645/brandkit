# love.fútbol — maps, places and the digital atlas

Version 1.2 · reviewed 1 November 2026

These are **local application choices** made while building an unofficial, interactive map atlas of love.fútbol’s community sports spaces. They reuse the colours and type observed on the website and add map-specific decisions where the public material says nothing. They are not an organization-issued cartography standard, and love.fútbol has not reviewed or approved them. The machine-readable record is [atlas-cartography.json](../reference/atlas-cartography.json); the evidence behind the project map is in [site research §9](SITE-RESEARCH.md#9-the-homepage-project-map-and-dated-counters).

## Basemap

A quiet, warm basemap keeps project markers and the observed brand colours legible. These seven values are atlas choices; they are not part of the observed love.fútbol palette. The atlas restyles the OpenFreeMap Positron vector style (OpenMapTiles schema).

| Layer | Hex | Use |
| --- | --- | --- |
| Ground | `#F3F1EA` | Land background |
| Water | `#BFE0EE` | Seas, lakes and rivers |
| Parks | `#DCEADB` | Parks and public green space |
| Woods | `#D9E8D8` | Woodland and forest cover |
| Residential | `#EEEBE2` | Residential land use |
| Buildings | `#E7E3D8` | Building footprints |
| Admin boundaries | `#9BB8A3` | Country and state boundary lines on the basemap |

Labels: Country labels in charcoal, other place labels in a slightly softer charcoal, each with an off-white halo. (`#1D1D1B` and `#3A3A36`, halo `#F5F4EF`).

## Themes

Three basemap themes recolour the same vector style in place. Chalk is the default; Pitch and Night match are playful alternatives for presentations and the map story. All three are atlas choices, not observed brand treatments.

| Theme | Ground | Water | Roads | Labels | Countries reached | Use |
| --- | --- | --- | --- | --- | --- | --- |
| Chalk | `#F3F1EA` | `#BFE0EE` | `#FFFFFF` | `#1D1D1B` | `#CFE7D6` → `#88C59B` → `#489D60` | Default reading view: off-white ground like the website’s light pages. |
| Pitch | `#5DA86F` | `#86CBEA` | `#FFFFFF` | `#FFFFFF` | `#8CC79C` → `#CFE8D5` → `#FFFFFF` | The map as a mown pitch: green ground with white chalk-line roads; countries reached lighten toward white. OSM pitches switch to off-white with green lines. |
| Night match | `#0E1D17` | `#0B2A38` | `#F5A300` | `#F5F4EF` | `#1F4A31` → `#489D60` → `#88C59B` | A floodlit evening match: forest ground, amber roads like floodlights, light-green country labels. |

An aerial-imagery view (Esri World Imagery) is offered on a selected space as “See the field”, with the nearest OpenStreetMap pitch outlined in source flag red over a green fill.

## Travel time

Walking and cycling isochrones (10, 20 and 30 minutes) from Valhalla on the OpenStreetMap street network, drawn as rings in one hue: darkest closest.

- **10 min:** Dark terracotta `#9A5418`
- **20 min:** Projects terracotta `#D17F2D`
- **30 min:** Light terracotta `#EDB98A`

Residents inside each band: US census tracts weighted by area share (ACS 5-year); elsewhere the area times the density of the smallest administrative area (under 3,000 km²) with people and size on record, shown with ≈ as a rough estimate. Never a state-wide density.

## Neighbourhood lens

A neighbourhood lens shades three kinds of OpenStreetMap land use from about zoom 11, under the roads, so the facilities around a space read at a glance.

| Feature | Colour | Opacity | Note |
| --- | --- | ---: | --- |
| Sports pitches | Projects light green `#88C59B` | 75% | OSM pitch, stadium and track land use; white pitch outlines from about zoom 13. |
| Playgrounds | Homepage cyan accent `#3CB1EA` | 35% |  |
| Schools | Mobile menu amber `#F5A300` | 22% | School, kindergarten, college and university land use. |

## Markers

| Marker | Treatment | Meaning |
| --- | --- | --- |
| Project with a profile page | Website green `#489D60` with a white stroke | A circle with a white stroke. The project number appears in white on the pin at closer zooms. |
| Project known only from the homepage map | Mobile menu amber `#F5A300` with a white stroke | Same form as a profile pin; the colour says the place has no profile page to open. |
| Cluster of nearby projects | Projects terracotta `#D17F2D` with a white stroke | A larger terracotta circle with a white count; it expands on selection. |
| Selected space | Website green `#489D60`; red corner flag `#ED1C24` | A small top-down pitch with a red corner flag. It is a map symbol, not the logo: never use it as a logo, beside the logo as a lockup, or in place of the complete artwork. |

Colour is never the only signal: the tooltip and panel name the project and say whether it has a profile page. The selected-space marker is a small generic pitch. The logo is the complete preserved artwork and is never drawn as a map pin, cluster or favicon. The red flag on this marker uses the source flag red as a pointer to the selected place; it does not license other uses of the flag outside the logo.

## Areas

- **Countries reached:** Projects light green to website green by number of projects with a published location in each country, at 60% (85% on hover). A paler tint of light green marks a single project; the ramp reaches green at the maximum. It counts mapped spaces, not people reached.
- **Selected administrative area:** a 3 px terracotta outline with a 12% terracotta fill.
- **Other levels of the hierarchy:** dashed forest lines (3/2 dash), 0.8→1.6 px wide and 25%→55% opaque. Country → state or province → county or region → city → district → neighbourhood. Lines get heavier and darker toward the neighbourhood.
- **Walk ring:** a dashed cyan 1 km circle (2 px, 6% fill) captioned “1 km · about a 12-minute walk”. A straight-line radius, not a measured walking route or a catchment.

## Type and photography

- **Bahianita:** Country names, project names, counters and large numbers. Observed website display role (Bahianita spans and counters on the homepage); applied to the atlas by local choice.
- **Red Hat Text:** Interface text, labels, legends, sources and captions. Observed website body and supporting type.
- **Basemap labels:** The vector style’s own label font. Basemap place labels and marker numbers use the tile style’s fonts; they are not set in the brand faces.
- **Photography:** Project photographs display in grayscale and return to colour on hover or focus. The Projects-page photo grid applies a grayscale class to colour images (website-projects-brand-evidence.json). Returning to colour on hover is the atlas’s interaction choice; keep the colour original unchanged and credit every image.

## Data honesty

- Treat every coordinate as approximate. Most come from the homepage map, which places some courts at city level; the rest are geocoded from the place named on a profile. Show the source of each coordinate with the space.
- Name the source beside every figure: Wikidata, World Bank World Development Indicators, U.S. Census Bureau American Community Survey via Census Reporter, OpenStreetMap. Credit OpenStreetMap contributors and the basemap provider on the map.
- Show the year of every population figure. Say when an area has no recorded population rather than estimating one.
- Never imply that love.fútbol produced, endorsed or verified third-party statistics. Area statistics describe an administrative area, not the people a space serves or its outcomes.
- Quote love.fútbol’s own headline counters as dated, attributed figures. Different pages give different totals; do not reconcile them or recompute them from the map.
- Use a project number only where a source gives it, and note conflicts. The homepage map and gallery captions number some projects differently and repeat #52.

Data sources used by the atlas: [Wikidata](https://www.wikidata.org/) · [World Bank World Development Indicators](https://databank.worldbank.org/source/world-development-indicators) · [American Community Survey 5-year estimates via Census Reporter](https://censusreporter.org/) · [OpenStreetMap](https://www.openstreetmap.org/copyright) · [OpenFreeMap Positron style](https://openfreemap.org/). They are third-party datasets, listed in the [source register](../reference/sources.json) so the attribution travels with the kit. They are not evidence about the love.fútbol identity.

## Icons and patterns

The kit adds 17 original 24 px icons for map and place interfaces: `pitch`, `court-pin`, `corner-flag`, `ball`, `school`, `playground`, `park`, `community`, `clinic`, `transit`, `walk-radius`, `neighbourhood`, `city`, `state`, `globe`, `people`, `hierarchy`. They use a 1.75 stroke with round caps and joins in `currentColor`. Pair each with a visible text label. `pitch`, `court-pin` and `corner-flag` are generic football symbols drawn for the interface; none is traced from or substitutes for the logo.

The patterns `pitch-lines`, `training-cones`, `nested-boundaries`, `court-pins` are built from dots and lines in palette colours. None places, repeats or crops the logo, which stays a complete standalone placement (`logoPolicy.standaloneSymbol: false`). Use them as backgrounds for map panels, section breaks and atlas cards; keep text on a plain surface.

## Sources

- [Homepage project map, gallery captions and counters](https://www.lovefutbol.org/): Re-inspected 1 November 2026 for the atlas work. The homepage embeds the MAPPA MUNDI Leaflet map (iframe from lizziemoon.github.io, 1200 × 580). Gallery captions number some projects differently from the map: El Sarchal #105 (map #107), Santa Ana #97 (map #96), Cancha Indeco #96 (no map pin) and Parque Exfactoría #40 (map has no #40). Counters read 128 projects, 24 countries, 10,440 volunteer hours and 255,200 community members impacted per year (raw HTML 10440 and 255200). Dated campaign figures, not identity tokens.
- [MAPPA MUNDI — HubSpot Embed](https://lizziemoon.github.io/mappa-mundi/hubspot-map.html): Leaflet 1.9.4 map with OpenStreetMap tiles; a Portuguese comment says to paste it into a HubSpot custom HTML module. 114 numbered pins (popup label “Court #n”) with approximate coordinates and Portuguese place labels such as Brasil and EUA. Numbers run 1–128 with 15 absent; #52 is used twice (Bom Sucesso, Quixeré and YMCA San Juan); Surrey is labelled “British Columbia, Espanha”. Styling differs from the site palette: Georgia serif, #f5f0e8 ground, #c8a96e border, #b84a2e accent and a sepia(12%) saturate(88%) map filter. Location evidence, not brand styling.
- [Projects: profile pages compared with the homepage map](https://www.lovefutbol.org/projects): The Projects page links 104 distinct project profile pages on 1 November 2026. Matched by hand against the homepage map, 21 numbered courts have no profile page and 11 profile pages have no pin; the match is a research judgment, not a published crosswalk.
- [100 Projects: headline figures](https://100.lovefutbol.org/): “A Journey Through 100 Spaces” reads 5 Continents | 17 Countries | +170,000 Direct Individuals Impacted | +150,000 Volunteer Hours on 1 November 2026. These conflict with the homepage counters (24 countries, 10,440 volunteer hours, 255,200 people per year); keep both as dated campaign figures with their page.
- [love.fútbol global homepage](https://www.lovefutbol.org/): Current brand line, community-led framing, photography and live visual context. Volatile campaign metrics are excluded from reusable brand tokens. Current anniversary content and four action pathways: give, collaborate, sponsor a space, and suggest a community space. Keep current counts and offers outside permanent brand tokens. Explicit Bahianita spans, active cyan #3CB1EA fields/headings/counters, before/after comparison, community voices and responsive photo/partner groups are captured in site-visual-evidence.json.
- [Projects](https://www.lovefutbol.org/projects): Uploaded HAR and public page: country sections use explicit Bahianita headings with light green and terracotta treatments. Captured page is not a formal brand manual.

Rebuild with `npm run make:lovefutbol`. Change [scripts/brands/lovefutbol-atlas.mjs](../../../scripts/brands/lovefutbol-atlas.mjs), not the generated files.
