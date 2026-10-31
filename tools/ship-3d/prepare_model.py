"""Run with Blender --background --python prepare_model.py -- --ship orion.

Keep the Meshy source intact; orient, finish, and pack a separate browser model.
"""
import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


parser = argparse.ArgumentParser()
parser.add_argument('--ship', required=True)
parser.add_argument('--kind', choices=['ships', 'enemies', 'spawn'], default='ships')
parser.add_argument('--version', default='v1')
parser.add_argument('--rotation-z', type=float, help='Source orientation in degrees; defaults to -90 for ships/enemies.')
parser.add_argument('--rotation-x', type=float, default=0, help='Lay a front-facing source onto the flight plane.')
parser.add_argument('--texture-size', type=int, default=2048)
parser.add_argument('--clip-rear-x', type=float)
options = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
root = Path(__file__).resolve().parents[2]
folder = root / 'assets' / options.kind / 'models' / f'{options.ship}-meshy-{options.version}'
source = folder / f'{options.ship}-source.glb'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(source))
meshes = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
removed_vertices = 0
for obj in meshes:
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    if options.clip_rear_x is not None:
        mesh = bmesh.new()
        mesh.from_mesh(obj.data)
        before = len(mesh.verts)
        cut = bmesh.ops.bisect_plane(mesh, geom=list(mesh.verts) + list(mesh.edges) + list(mesh.faces),
                                     dist=.00001, plane_co=(options.clip_rear_x, 0, 0),
                                     plane_no=(1, 0, 0), clear_outer=True, clear_inner=False)
        edges = [edge for edge in cut['geom_cut'] if isinstance(edge, bmesh.types.BMEdge) and edge.is_boundary]
        if edges:
            bmesh.ops.holes_fill(mesh, edges=edges, sides=0)
        bmesh.ops.recalc_face_normals(mesh, faces=list(mesh.faces))
        removed_vertices += max(0, before - len(mesh.verts))
        mesh.to_mesh(obj.data)
        mesh.free()
    # Ship noses point -X; the Crown's docking gap already faces the correct side.
    rotation = options.rotation_z if options.rotation_z is not None else (0 if options.kind == 'spawn' else -90)
    obj.matrix_world = Matrix.Rotation(math.radians(rotation), 4, 'Z') @ Matrix.Rotation(math.radians(options.rotation_x), 4, 'X')
    obj.select_set(True)
bpy.context.view_layer.update()

material = bpy.data.materials.new(f'{options.ship}_cyan_running_lights')
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = (.015, .17, .4, 1)
shader.inputs['Metallic'].default_value = .2
shader.inputs['Roughness'].default_value = .28
shader.inputs['Emission Color'].default_value = (.015, .4, 1, 1)
shader.inputs['Emission Strength'].default_value = 1.5
lights_added = 0
panels = [(0, .49, .17, .015), (0, .76, .1, .01), (-.32, -.42, .09, .012), (.32, -.42, .09, .012)] if options.kind == 'ships' else []
for x, y, length, width in panels:
    points = []
    for dx, dy in [(-width / 2, -length / 2), (width / 2, -length / 2), (width / 2, length / 2), (-width / 2, length / 2)]:
        hit, location, *_ = bpy.context.scene.ray_cast(bpy.context.evaluated_depsgraph_get(), Vector((x + dx, y + dy, 3)), Vector((0, 0, -1)))
        if not hit:
            points = []
            break
        points.append((location.x, location.y, location.z + .0025))
    if points:
        mesh = bpy.data.meshes.new('Running_light_panel')
        mesh.from_pydata(points, [], [(0, 1, 2, 3)])
        mesh.update()
        obj = bpy.data.objects.new('Cyan_running_light', mesh)
        bpy.context.scene.collection.objects.link(obj)
        obj.data.materials.append(material)
        obj.select_set(True)
        lights_added += 1

texture_dir = root / '.codex/3d-prep' / f'{options.ship}-runtime-textures'
texture_dir.mkdir(parents=True, exist_ok=True)
textures, packed_images = [], []
for image in list(bpy.data.images):
    if image.type != 'IMAGE' or not image.size[0]:
        continue
    before = list(image.size)
    size = max(image.size)
    if size > options.texture_size:
        image.scale(round(image.size[0] * options.texture_size / size), round(image.size[1] * options.texture_size / size))
    image.update()
    image.file_format = 'PNG' if 'normal' in image.name.lower() else 'JPEG'
    image.filepath_raw = str(texture_dir / (image.name + ('.png' if image.file_format == 'PNG' else '.jpg')))
    image.save()
    replacement = bpy.data.images.load(image.filepath_raw, check_existing=False)
    replacement.colorspace_settings.name = image.colorspace_settings.name
    image.user_remap(replacement)
    packed_images.append(replacement)
    textures.append({'name': image.name, 'before': before, 'after': list(replacement.size)})

runtime = folder / f'{options.ship}.glb'
bpy.ops.export_scene.gltf(filepath=str(runtime), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True, export_materials='EXPORT',
                          export_image_format='AUTO', export_image_quality=88)
for image in packed_images:
    image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(folder / f'{options.ship}.blend'))
print('SHIP_EXPORT ' + json.dumps({'ship': options.ship, 'textures': textures, 'runningLightPanels': lights_added,
                                  'removedExhaustVertices': removed_vertices, 'sourceBytes': source.stat().st_size,
                                  'runtimeBytes': runtime.stat().st_size}))
