# Bakes ambient occlusion onto the studio floor (three.js coords: x right, y up, z toward viewer -> Blender x, -z, y)
import bpy, math
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 96
def box(w, h, d, x, y, z, rz=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, -z, y)); o = bpy.context.object; o.scale = (w, d, h); o.rotation_euler[2] = -rz; return o
def cyl(r, h, x, y, z):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, location=(x, -z, y), vertices=64); return bpy.context.object
DOOR_X, DOOR_Z, W, H, doorW, doorH = .6, -9.0, 16, 5.2, 1.7, 2.75
leftW = (DOOR_X - doorW/2) + W/2; rightW = W/2 - (DOOR_X + doorW/2)
box(leftW, H, .3, -W/2 + leftW/2, H/2, DOOR_Z - .15); box(rightW, H, .3, W/2 - rightW/2, H/2, DOOR_Z - .15)
box(doorW, H - doorH, .3, DOOR_X, doorH + (H - doorH)/2, DOOR_Z - .15)
box(.3, H, 14, -W/2, H/2, -2); box(.3, H, 14, W/2, H/2, -2)
box(doorW, doorH, .08, DOOR_X, doorH/2, DOOR_Z + .12)
cyl(1.18, .09, .9, .045, -3.0)
# screen on its pole (rotated .36 about y)
box(3.56, 2.11, .12, -2.55, 1.95, -5.17, .36); box(.08, .9, .08, -2.55, .55, -5.2)
# desk
box(4.6, .07, 1.0, 0, .78, 1.95); box(4.6, .55, .05, 0, .5, 1.47)
# slats along back wall
x = -7.4
while x <= 7.4:
    if abs(x - DOOR_X) >= 1.3: box(.22, 4.8, .1, x, 2.4, DOOR_Z + .03)
    x += 1.1
# ceiling
bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 3, H)); bpy.context.object.rotation_euler[0] = math.pi
# floor (bake target): 18x18 centred at three z=-3
bpy.ops.mesh.primitive_plane_add(size=18, location=(0, 3, 0)); fl = bpy.context.object; fl.name = 'Floor'
img = bpy.data.images.new('floor_ao', 1024, 1024, float_buffer=False)
mat = bpy.data.materials.new('F'); mat.use_nodes = True; n = mat.node_tree.nodes.new('ShaderNodeTexImage'); n.image = img; mat.node_tree.nodes.active = n; fl.data.materials.append(mat)
for o in bpy.data.objects: o.select_set(False)
fl.select_set(True); bpy.context.view_layer.objects.active = fl
sc.world = bpy.data.worlds.new('W'); sc.world.use_nodes = True
sc.cycles.bake_type = 'AO'; sc.world.light_settings.distance = 2.5
bpy.ops.object.bake(type='AO')
img.filepath_raw = 'floor_ao.png'; img.file_format = 'PNG'; img.save()
print('BAKED')
