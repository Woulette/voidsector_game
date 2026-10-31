"""Blender: replace the flat Meshy nucleus with a spherical armored Orb.

The current Meshy source and its six textured branches are retained.
Run after prepare_model.py for drone_pirate v2.
"""
import json
import math
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

root = Path(__file__).resolve().parents[2]
folder = root / 'assets/enemies/models/drone_pirate-meshy-v2'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(folder / 'drone_pirate.glb'))
for obj in list(bpy.context.scene.objects):
    if obj.type != 'MESH':
        continue
    obj.data.transform(obj.matrix_world)
    obj.matrix_world = Matrix.Identity(4)
    mesh = bmesh.new()
    mesh.from_mesh(obj.data)
    # The arms start inside the new sphere so their open roots stay hidden.
    faces = [face for face in mesh.faces if math.hypot(*face.calc_center_median()[:2]) < .49]
    bmesh.ops.delete(mesh, geom=faces, context='FACES')
    mesh.to_mesh(obj.data)
    mesh.free()
    obj.name = 'Meshy_six_textured_branches'


def material(name, color, metal=.7, rough=.35, emission=0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    shader.inputs['Emission Color'].default_value = (*color, 1)
    shader.inputs['Emission Strength'].default_value = emission
    return mat


dark = material('Orb_dark_titanium', (.025, .055, .09), .78, .32)
silver = material('Orb_silver_armor', (.38, .49, .60), .8, .3)
blue = material('Orb_cyan_energy', (.005, .38, .8), .2, .2, 2.4)


def sphere(name, radius, mat, location=(0, 0, 0), segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, radius=radius, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.data.materials.append(mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


sphere('Orb_spherical_body', .605, dark)
# Curved armor plates follow the sphere on every side, including its underside.
vertices, faces = [], []
for band in range(4):
    low = math.radians(-80 + band * 40 + 2)
    high = math.radians(-80 + (band + 1) * 40 - 2)
    for sector in range(6):
        left = sector * math.tau / 6 + .035
        right = (sector + 1) * math.tau / 6 - .035
        first = len(vertices)
        for row in range(4):
            latitude = low + (high - low) * row / 3
            for column in range(7):
                longitude = left + (right - left) * column / 6
                vertices.append((.625 * math.cos(latitude) * math.cos(longitude),
                                 .625 * math.cos(latitude) * math.sin(longitude), .625 * math.sin(latitude)))
        for row in range(3):
            for column in range(6):
                a = first + row * 7 + column
                faces.append((a, a + 1, a + 8, a + 7))
mesh = bpy.data.meshes.new('Spherical_curved_armor')
mesh.from_pydata(vertices, [], faces)
mesh.update()
obj = bpy.data.objects.new('Orb_spherical_armor_plates', mesh)
bpy.context.scene.collection.objects.link(obj)
obj.data.materials.append(silver)
for face in mesh.polygons:
    face.use_smooth = True

for index, rotation in enumerate([(0, 0, 0), (math.pi / 2, 0, 0), (0, math.pi / 2, 0)]):
    bpy.ops.mesh.primitive_torus_add(major_radius=.621, minor_radius=.009, major_segments=40, minor_segments=6, rotation=rotation)
    obj = bpy.context.object
    obj.name = f'Orb_cyan_meridian_{index}'
    obj.data.materials.append(blue)
    for face in obj.data.polygons:
        face.use_smooth = True
sphere('Orb_blue_reactor_lens', .225, blue, location=(0, 0, .571), segments=24, rings=12)
bpy.ops.mesh.primitive_torus_add(major_radius=.221, minor_radius=.025, major_segments=32, minor_segments=6, location=(0, 0, .617))
bpy.context.object.name = 'Orb_reactor_metal_rim'
bpy.context.object.data.materials.append(silver)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath=str(folder / 'drone_pirate.glb'), export_format='GLB', use_selection=True,
                          export_yup=True, export_apply=True, export_materials='EXPORT',
                          export_image_format='AUTO', export_image_quality=88)
for image in bpy.data.images:
    if image.type == 'IMAGE' and image.size[0]:
        image.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(folder / 'drone_pirate.blend'))
print('ORB_ROUND_BODY ' + json.dumps({'sphereRadius': .625, 'sphericalLensRadius': .225, 'sixOriginalBranches': True}))
