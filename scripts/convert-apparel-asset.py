"""Convert Elvaerwyn's original OBJ, preserving its vertices, faces and UVs.

Run: blender --background --python scripts/convert-apparel-asset.py
No garment geometry is created by this script. glTF export triangulates the
original quads and splits vertices at the original UV seams.
"""
from pathlib import Path
import bpy
import hashlib
import json

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/apparel/elvaerwyn-zip-hoodie'
OUTPUT = ROOT / 'public/models/apparel/elvaerwyn-zip-hoodie.glb'
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.wm.obj_import(filepath=str(SOURCE / 'ladieshoodiedown1.obj'),
                      forward_axis='NEGATIVE_Z', up_axis='Y')
garment = bpy.context.selected_objects[0]
garment.name = 'Elvaerwyn_zip_hoodie'
# Original MakeHuman OBJ uses decimetres and Y-up. Blender imports into Z-up;
# glTF export restores Y-up. Only unit conversion and a centred, hem-level origin.
coordinates = [garment.matrix_world @ vertex.co for vertex in garment.data.vertices]
centre_x = (min(p.x for p in coordinates) + max(p.x for p in coordinates)) / 2
base_z = min(p.z for p in coordinates)
garment.scale = (0.1, 0.1, 0.1)
garment.location = (-centre_x * 0.1, 0, -base_z * 0.1)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for face in garment.data.polygons:
    face.use_smooth = True

material = bpy.data.materials.new('Original_hoodie_fabric')
material.use_nodes = True
material.diffuse_color = (1, 1, 1, 1)
nodes, links = material.node_tree.nodes, material.node_tree.links
shader = nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value = 0.92
shader.inputs['Metallic'].default_value = 0
diffuse = nodes.new('ShaderNodeTexImage')
diffuse.image = bpy.data.images.load(str(SOURCE / 'hoodietex1.png'))
links.new(diffuse.outputs['Color'], shader.inputs['Base Color'])
normal_image = nodes.new('ShaderNodeTexImage')
normal_image.image = bpy.data.images.load(str(SOURCE / 'normalshoodie.png'))
normal_image.image.colorspace_settings.name = 'Non-Color'
normal = nodes.new('ShaderNodeNormalMap')
normal.inputs['Strength'].default_value = 0.65
links.new(normal_image.outputs['Color'], normal.inputs['Color'])
links.new(normal.outputs['Normal'], shader.inputs['Normal'])
garment.data.materials.clear()
garment.data.materials.append(material)
garment['assetId'] = 'elvaerwyn-zip-hoodie-2018-v1'
garment['author'] = 'Elvaerwyn'
garment['license'] = 'CC-BY (as specified by the original asset and official pack)'
garment['source'] = 'http://www.makehumancommunity.org/node/1450'
garment['archive'] = 'https://files.makehumancommunity.org/asset_packs/shirts02/shirts02_ccby.zip'
garment['sourceObjSha256'] = hashlib.sha256((SOURCE / 'ladieshoodiedown1.obj').read_bytes()).hexdigest()
garment['conversion'] = 'Original OBJ geometry and UVs; decimetres to metres; centred at hem; smooth normals; original diffuse and normal maps; MakeHuman material converted to PBR.'
garment['originalVertexCount'] = len(garment.data.vertices)
garment['originalPolygonCount'] = len(garment.data.polygons)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT), export_format='GLB',
    use_selection=True, export_extras=True, export_yup=True,
    export_cameras=False, export_lights=False)
print('APPAREL_IMPORT', json.dumps({'output': str(OUTPUT), 'bytes': OUTPUT.stat().st_size,
    'vertices': len(garment.data.vertices), 'polygons': len(garment.data.polygons),
    'sha256': hashlib.sha256(OUTPUT.read_bytes()).hexdigest()}))
