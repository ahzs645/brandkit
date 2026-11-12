# Vehicle models: sources and licences

The vehicle mockups (the **Vehicles** tab) use these three models. brandkit loads each GLB as
stored here; the SHA-256 of each is recorded in `../vehicle-models.js`. The models' licences
cover the models only: they do not license, and are not licensed by, any brand's artwork placed
on them.

## Four-door hatchback (`shc-hatchback.glb`)

Title: SHC MC Free Promotion Car
Creator: denniswoo1993 / SHCreations
Creator page: https://sketchfab.com/denniswoo1993
Original model: https://sketchfab.com/3d-models/shc-mc-free-promotion-car-cfaabdec76a74b68a48ba5657b6d9aee
Licence: Creative Commons Attribution 4.0 International (CC BY 4.0)
Licence URL: https://creativecommons.org/licenses/by/4.0/
Legal code: https://creativecommons.org/licenses/by/4.0/legalcode

The original glTF download was repackaged as a self-contained GLB without changing its mesh
geometry; the GLB keeps its original `asset.extras` author, title, source and licence record.
The mockups normalise its display size and orientation, change its body paint and glazing
materials, and add separate decals of a brand's artwork. These are adaptations. The original
creator does not endorse the mockups or any branding placed on the model. Keep this attribution
when sharing the model or an adaptation: the mockups show the credit beside the model, and every
exported PNG of this model carries a compact creator and licence credit.

## Lightweight SUV (`suv-original.glb`)

Title: SUV / suv-original.glb
Creator: Innerscene Corp
Source: https://www.innerscene.com/tools/library/3d-parts/suv-dc972cab
Download source: https://files.innerscene.com/library/suv-dc972cab/fe9e6d452331cda7d3f7/suv-original.glb
Licence: CC0 1.0 Universal
Licence URL: https://creativecommons.org/publicdomain/zero/1.0/

The original GLB's copyright field states: "Authored by Innerscene Corp (innerscene.com). Public
domain: dedicated under CC0 1.0 Universal, https://creativecommons.org/publicdomain/zero/1.0/.
Free to use, modify and redistribute for any purpose, with no credit required."

The mockups change its display scale, orientation and body colour, and add separate decals. The
stored geometry is unchanged. It is nominal visualisation geometry, not a manufacturer's wrap
template.

## Compact SUV (`generic-compact-suv.glb`)

Title: Generic compact SUV / generic-compact-suv.glb
Creator: Innerscene Corp
Source: https://www.innerscene.com/tools/library/3d-parts/generic-compact-suv-9f157ee5
Download source: https://files.innerscene.com/library/generic-compact-suv-9f157ee5/fbafbd81b04c3d969f9c/generic-compact-suv.glb
Licence: CC0 1.0 Universal
Licence URL: https://creativecommons.org/publicdomain/zero/1.0/

The original GLB carries the same Innerscene CC0 dedication as the lightweight SUV. The mockups
change its display scale and body colour, drop the paint material's orange base-colour texture
so the body can be recoloured, and add separate decals. Its other materials and the stored mesh
geometry are unchanged.

## Three.js

The renderer is Three.js 0.187.0 (https://threejs.org/), MIT licence, installed as an npm
dependency; its licence travels with the package.
