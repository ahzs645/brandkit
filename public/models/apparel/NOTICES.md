# Imported garment attribution

**elvs_hooded_sweat_jacket1** by **Elvaerwyn**, created 17 April 2018.

- Creator/source record: http://www.makehumancommunity.org/node/1450
- Official MakeHuman distribution and credit: https://static.makehumancommunity.org/assets/assetpacks/shirts02.html
- Official download: https://files.makehumancommunity.org/asset_packs/shirts02/shirts02_ccby.zip
- License supplied by the creator and official pack: **CC-BY**. The original `.mhclo` says `# license CC_by`; the original pack metadata says `CC-BY`. We retain that designation rather than inventing a version.
- Included asset: `clothes/elvs_hooded_sweat_jacket1/ladieshoodiedown1.obj`, its original diffuse and normal maps, material definition, and author metadata.

The garment is a fitted women's zip hoodie with the zip closed and hood down. It is not a supplier product, a unisex pullover, or a crewneck.

Brandkit's `elvaerwyn-zip-hoodie.glb` converts the original OBJ to metres and centres it at the hem. glTF export triangulates the original quads and splits vertices at existing UV seams. Original mesh positions and UVs are retained; no garment geometry is added. Smooth normals and a PBR material replace the MakeHuman material. Original diffuse and normal maps are embedded. Runtime colour previews desaturate and expose the original dark-blue diffuse pixels before applying the selected tint. Brand artwork is projected onto the original surface.

The catalog thumbnail is the creator's original thumbnail, published in the same official asset pack. Original source files and their SHA-256 hashes are retained in `assets/apparel/elvaerwyn-zip-hoodie/SOURCE.json`. The reproducible conversion script is `scripts/convert-apparel-asset.py` (Blender 4.3.2).
