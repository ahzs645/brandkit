"""Render catalogue/review views from a supplied GLB, without authoring asset geometry.

Run with Blender, for example:
  blender --background --factory-startup --python scripts/render-model-previews.py -- \
    --model src/mockups/models/crew-cab-pickup.glb --output /tmp/pickup-preview \
    --length 5.69 --paint-material paint --views angle,side --width 1200 --samples 24

The only created objects are the studio floor, camera and lights. The original GLB is
unchanged. Perspective and orthographic images are rendered from the same imported meshes.
"""

import argparse
import hashlib
import json
import math
from pathlib import Path
import sys

import bpy
from mathutils import Vector


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument('--model', required=True)
    parser.add_argument('--output', required=True)
    parser.add_argument('--length', type=float, default=4.7)
    parser.add_argument('--rotation-y', type=float, default=0)
    parser.add_argument('--paint-material', default='')
    parser.add_argument('--paint', default='#edf0f3')
    parser.add_argument('--views', default='angle,side,opposite,front,rear,above')
    parser.add_argument('--width', type=int, default=1200)
    parser.add_argument('--samples', type=int, default=24)
    return parser.parse_args(sys.argv[sys.argv.index('--') + 1:])


def bounds(objects):
    points = [obj.matrix_world @ Vector(corner) for obj in objects if obj.type == 'MESH' for corner in obj.bound_box]
    return Vector(tuple(min(p[i] for p in points) for i in range(3))), Vector(tuple(max(p[i] for p in points) for i in range(3)))


def linear_colour(value):
    channels = [int(value[i:i+2], 16) / 255 for i in (1, 3, 5)]
    return tuple(c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4 for c in channels) + (1,)


def light(name, location, energy, size, target):
    data = bpy.data.lights.new(name, 'AREA')
    data.energy = energy
    data.shape = 'DISK'
    data.size = size
    obj = bpy.data.objects.new(name, data)
    bpy.context.scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (target - obj.location).to_track_quat('-Z', 'Y').to_euler()


args = arguments()
source = Path(args.model).resolve()
output = Path(args.output).resolve()
output.mkdir(parents=True, exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
imported = list(bpy.context.scene.objects)
asset = bpy.data.objects.new('source-asset', None)
bpy.context.scene.collection.objects.link(asset)
for obj in imported:
    if obj.parent is None:
        obj.parent = asset
# glTF Y-up is converted to Blender Z-up by the official importer.
asset.rotation_euler.z = args.rotation_y
bpy.context.view_layer.update()
low, high = bounds(imported)
scale = args.length / (high.x - low.x)
asset.scale = (scale,) * 3
bpy.context.view_layer.update()
low, high = bounds(imported)
asset.location = (-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z)
bpy.context.view_layer.update()
low, high = bounds(imported)

if args.paint_material:
    for material in bpy.data.materials:
        if material.name != args.paint_material or not material.use_nodes:
            continue
        for node in material.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                node.inputs['Base Color'].default_value = linear_colour(args.paint)

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = False
scene.render.threads_mode = 'FIXED'
scene.render.threads = 8
scene.render.resolution_x = args.width
scene.render.resolution_y = round(args.width * .625)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.film_transparent = False
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.72, .78, .85, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .6
scene.view_settings.view_transform = 'AgX'

bpy.ops.mesh.primitive_plane_add(size=args.length * 200, location=(0, 0, -.012))
floor = bpy.context.object
floor.name = 'studio-floor'
material = bpy.data.materials.new('studio-floor-material')
material.use_nodes = True
material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.78, .80, .83, 1)
material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .8
floor.data.materials.append(material)

target = Vector((0, 0, high.z * .47))
light('studio-key', (-3, -4, 7), 1600, 5, target)
light('studio-fill', (1, 5, 5), 1250, 5, target)
light('studio-rim', (5, 1, 6), 1700, 4, target)
camera_data = bpy.data.cameras.new('model-view-camera')
camera = bpy.data.objects.new('model-view-camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
length = args.length
positions = {
    'angle': (-length * 1.10, -length * 1.03, length * .70),
    'side': (0, -length * 2, target.z),
    'opposite': (0, length * 2, target.z),
    'front': (-length * 2, 0, target.z),
    'rear': (length * 2, 0, target.z),
    'above': (0, 0, length * 2),
}
views = args.views.split(',')
for name in views:
    if name not in positions:
        raise ValueError('Unknown view: ' + name)
    camera.location = positions[name]
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera_data.type = 'PERSP' if name == 'angle' else 'ORTHO'
    camera_data.lens = 48
    camera_data.ortho_scale = length * 1.17 if name in ('side', 'opposite', 'above') else max(high.z, high.y - low.y) * 1.65
    scene.render.filepath = str(output / (name + '.png'))
    bpy.ops.render.render(write_still=True)

report = {
    'source': str(source.relative_to(Path.cwd())) if source.is_relative_to(Path.cwd()) else source.name,
    'sha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'renderer': 'Blender ' + bpy.app.version_string + ' / Cycles CPU',
    'geometry': 'Imported from the supplied GLB; no vehicle mesh was authored by this script.',
    'meshes': sum(obj.type == 'MESH' for obj in imported),
    'triangles': sum(sum(len(p.vertices)-2 for p in obj.data.polygons) for obj in imported if obj.type == 'MESH'),
    'displayLengthMetres': args.length,
    'rotationY': args.rotation_y,
    'paint': {'material': args.paint_material, 'colour': args.paint},
    'render': {'width': args.width, 'samples': args.samples},
    'bounds': {'low': list(low), 'high': list(high)},
    'views': {name: {'projection': 'perspective' if name == 'angle' else 'orthographic', 'file': name + '.png'} for name in views},
}
(output / 'source.json').write_text(json.dumps(report, indent=2) + '\n')
print('MODEL_PREVIEWS_COMPLETE', json.dumps(report))
