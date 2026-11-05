# Builds The Pit's boardroom and bakes its lighting (Cycles). Run with the bpy package:
#   python tools/blender/build_boardroom.py <out_dir>
# Coordinates are given in three.js terms (x right, y up, z toward the player) and converted to Blender (x, -z, y).
# Outputs: boardroom.glb (geometry only; materials are assigned by name in the app) and lm_<object>.png lightmaps + lightmaps.json.
import bpy, bmesh, math, sys, os, json
import numpy as np
from mathutils import Vector

OUT = sys.argv[-1] if len(sys.argv) > 1 else "."
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 96
sc.world = bpy.data.worlds.new("W"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs[1].default_value = .02

W, D0, D1, H = 4.0, -5.6, 5.0, 3.4          # half width, back wall z, front wall z, ceiling height
DOOR_Z, DOOR_W, DOOR_H = -3.7, 1.2, 2.45     # door in the left wall
SCR = dict(x=0.0, y=1.8, w=3.8, h=2.15)      # screen recess on the back wall

def B(x, y, z): return Vector((x, -z, y))
MATS = {}
def mat(name, rgb, emit=0):
    if name in MATS: return MATS[name]
    m = bpy.data.materials.new(name); m.use_nodes = True; p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1); p.inputs["Roughness"].default_value = .6
    if emit: p.inputs["Emission Color"].default_value = (*rgb, 1); p.inputs["Emission Strength"].default_value = emit
    MATS[name] = m; return m
def box(name, cx, cy, cz, sx, sy, sz, m, rot_y=0, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=B(cx, cy, cz)); o = bpy.context.object; o.name = name
    o.scale = (sx, sz, sy); o.rotation_euler[2] = -rot_y; bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if bevel: md = o.modifiers.new("bv", "BEVEL"); md.width = bevel; md.segments = 3; md.limit_method = "ANGLE"
    o.data.materials.append(m); return o
def cyl(name, cx, cy, cz, r, h, m, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=h, vertices=verts, location=B(cx, cy, cz)); o = bpy.context.object; o.name = name; o.data.materials.append(m); return o
def join(objs, name):
    for o in bpy.context.selected_objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]; bpy.ops.object.convert(target="MESH"); bpy.ops.object.join(); objs[0].name = name; return objs[0]
def tile_uv(o, size):
    # world-scale box mapping for tiling textures (TEXCOORD_0)
    me = o.data; uv = me.uv_layers.get("Tile") or me.uv_layers.new(name="Tile"); me.uv_layers.active = uv
    bm = bmesh.new(); bm.from_mesh(me); lay = bm.loops.layers.uv["Tile"]
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            co = o.matrix_world @ l.vert.co
            u, v = [(co.y, co.z), (co.x, co.z), (co.x, co.y)][ax]
            l[lay].uv = (u / size, v / size)
    bm.to_mesh(me); bm.free()

walnut_dark, black, gold, leather = mat("Panel", (.035, .03, .028)), mat("Lacquer", (.012, .012, .014)), mat("Brass", (.55, .42, .2)), mat("Leather", (.02, .018, .018))
floor_m, ceil_m, cove_m = mat("Floor", (.09, .06, .04)), mat("Ceiling", (.06, .055, .05)), mat("Cove", (1, .72, .42), emit=7)
glow_m = mat("ScreenGlow", (.75, .8, .9), emit=1.2)

# ---------- architecture (baked) ----------
floor = box("Floor", 0, -.05, (D0 + D1) / 2, 2 * W, .1, D1 - D0, floor_m)
walls = []
walls.append(box("wb", -SCR["w"] / 2 - (W - SCR["w"] / 2) / 2, H / 2, D0 - .1, W - SCR["w"] / 2, H, .2, walnut_dark))
walls.append(box("wb2", SCR["w"] / 2 + (W - SCR["w"] / 2) / 2, H / 2, D0 - .1, W - SCR["w"] / 2, H, .2, walnut_dark))
walls.append(box("wb3", 0, (SCR["y"] - SCR["h"] / 2) / 2, D0 - .1, SCR["w"], SCR["y"] - SCR["h"] / 2, .2, walnut_dark))
top = SCR["y"] + SCR["h"] / 2; walls.append(box("wb4", 0, (top + H) / 2, D0 - .1, SCR["w"], H - top, .2, walnut_dark))
walls.append(box("screen_back", 0, SCR["y"], D0 - .17, SCR["w"], SCR["h"], .04, black))                 # recess behind the live screen
walls.append(box("wf", 0, H / 2, D1 + .1, 2 * W, H, .2, walnut_dark))
walls.append(box("wr", W + .1, H / 2, (D0 + D1) / 2, .2, H, D1 - D0, walnut_dark))
# left wall with the door opening
dz0, dz1 = DOOR_Z - DOOR_W / 2, DOOR_Z + DOOR_W / 2
walls.append(box("wl1", -W - .1, H / 2, (D0 + dz0) / 2, .2, H, dz0 - D0, walnut_dark))
walls.append(box("wl2", -W - .1, H / 2, (dz1 + D1) / 2, .2, H, D1 - dz1, walnut_dark))
walls.append(box("wl3", -W - .1, (DOOR_H + H) / 2, DOOR_Z, .2, H - DOOR_H, DOOR_W, walnut_dark))
# corridor behind the door (dark; the app lights it during the entrance)
walls.append(box("corr", -W - 1.4, H / 2, DOOR_Z, .1, H, 2.4, black)); walls.append(box("corr2", -W - .7, H / 2, DOOR_Z - 1.2, 1.4, H, .1, black)); walls.append(box("corr3", -W - .7, H / 2, DOOR_Z + 1.2, 1.4, H, .1, black))
# raised panel frames + brass pinstripes on the walls (the boardroom look)
def panels_on(axis, fixed, a0, a1, n, y0=.12, y1=2.9, skip=None):
    step = (a1 - a0) / n
    for i in range(n):
        c = a0 + step * (i + .5); w = step - .16
        if skip and skip(c, w): continue
        for (cy, hy, cw, wz) in [(y0 + .03, .06, w, 0), (y1 - .03, .06, w, 0)]:
            o = box("pf", c if axis == "z" else fixed, cy, fixed if axis == "z" else c, cw if axis == "z" else .05, hy, .05 if axis == "z" else cw, walnut_dark); walls.append(o)
        for s in (-1, 1):
            cc = c + s * (w / 2 - .03)
            o = box("pf", cc if axis == "z" else fixed, (y0 + y1) / 2, fixed if axis == "z" else cc, .06 if axis == "z" else .05, y1 - y0, .05 if axis == "z" else .06, walnut_dark); walls.append(o)
        o = box("pin", c if axis == "z" else fixed, y0 + .14, fixed if axis == "z" else c, w - .14 if axis == "z" else .056, .012, .056 if axis == "z" else w - .14, gold); walls.append(o)
panels_on("z", D0 + .03, -W, -SCR["w"] / 2 - .1, 2); panels_on("z", D0 + .03, SCR["w"] / 2 + .1, W, 2)
panels_on("x", W - .03, D0, D1, 7); panels_on("x", -W + .03, D0, D1, 7, skip=lambda c, w: abs(c - DOOR_Z) < (w + DOOR_W) / 2 + .05)
panels_on("z", D1 - .03, -W, W, 5)
# screen frame and door frame in brass
for (cx, cy, sx, sy) in [(0, top + .03, SCR["w"] + .12, .06), (0, SCR["y"] - SCR["h"] / 2 - .03, SCR["w"] + .12, .06), (-SCR["w"] / 2 - .03, SCR["y"], .06, SCR["h"] + .12), (SCR["w"] / 2 + .03, SCR["y"], .06, SCR["h"] + .12)]:
    walls.append(box("sf", cx, cy, D0 + .02, sx, sy, .06, gold))
for (cz, cy, sz, sy) in [(dz0 - .04, DOOR_H / 2, .08, DOOR_H + .08), (dz1 + .04, DOOR_H / 2, .08, DOOR_H + .08), (DOOR_Z, DOOR_H + .04, DOOR_W + .16, .08)]:
    walls.append(box("df", -W + .02, cy, cz, .08, sy, sz, gold))
# baseboard
for (cx, cz, sx, sz) in [(0, D0 + .02, 2 * W, .04), (0, D1 - .02, 2 * W, .04), (W - .02, 0, .04, D1 - D0)]:
    walls.append(box("bb", cx, .06, cz if sx > 1 else (D0 + D1) / 2, sx, .12, sz, black))
walls = join(walls, "Walls")
# ceiling: perimeter soffit at 3.0 with a warm cove, raised tray at 3.4
inset = .7; soff = []
soff.append(box("sof1", 0, 3.2, D0 + inset / 2, 2 * W, .4, inset, ceil_m)); soff.append(box("sof2", 0, 3.2, D1 - inset / 2, 2 * W, .4, inset, ceil_m))
soff.append(box("sof3", -W + inset / 2, 3.2, (D0 + D1) / 2, inset, .4, D1 - D0 - 2 * inset, ceil_m)); soff.append(box("sof4", W - inset / 2, 3.2, (D0 + D1) / 2, inset, .4, D1 - D0 - 2 * inset, ceil_m))
soff.append(box("tray", 0, H + .05, (D0 + D1) / 2, 2 * W, .1, D1 - D0, ceil_m))
ceiling = join(soff, "Ceiling")
cove = []
for (cx, cz, sx, sz) in [(0, D0 + inset - .04, 2 * W - 2 * inset, .04), (0, D1 - inset + .04, 2 * W - 2 * inset, .04), (-W + inset - .04, (D0 + D1) / 2, .04, D1 - D0 - 2 * inset), (W - inset + .04, (D0 + D1) / 2, .04, D1 - D0 - 2 * inset)]:
    cove.append(box("cv", cx, 3.03, cz, sx, .02, sz, cove_m))
cove = join(cove, "Cove")

# ---------- furniture (live materials in the app, present here for shadows) ----------
furn = []
furn.append(box("TableTop", 0, .73, -.2, 1.5, .06, 5.0, mat("Walnut", (.12, .06, .03)), bevel=.015))
for z in (-1.6, 1.2): furn.append(box("TableBase", 0, .36, z, .5, .7, .9, black, bevel=.01))
def chair(x, z, face):   # face = +1 looks toward +x
    parts = []
    parts.append(box("ch", x, .47, z, .5, .1, .52, leather, bevel=.035))
    bx = x - face * .27; parts.append(box("ch", bx, .92, z, .09, .66, .5, leather, bevel=.035)); bpy.context.object.rotation_euler[1] = face * math.radians(8)
    for s in (-1, 1):
        parts.append(box("arm", x + face * .02, .66, z + s * .29, .4, .035, .045, gold, bevel=.01))
        parts.append(cyl("armp", x - face * .1, .57, z + s * .29, .012, .18, gold, 10))
    parts.append(cyl("col", x, .28, z, .028, .3, gold, 16))
    for k in range(5):
        a = k * 2 * math.pi / 5; parts.append(box("leg", x + math.cos(a) * .15, .06, z + math.sin(a) * .15, .3, .03, .045, gold, rot_y=a))
        cyl("cast", x + math.cos(a) * .3, .025, z + math.sin(a) * .3, .022, .03, black, 10); parts.append(bpy.context.object)
    for o in parts:
        for md in list(o.modifiers): pass
    lea = [o for o in parts if o.data.materials[0] == leather]; met = [o for o in parts if o.data.materials[0] == gold]; blk = [o for o in parts if o.data.materials[0] == black]
    return [join(lea, "ChairLeather"), join(met, "ChairMetal"), join(blk, "ChairCasters")]
SEATS = [(-1.05, z, 1) for z in (-1.9, -.7, .5, 1.7)] + [(1.05, z, -1) for z in (-1.9, -.7, .5, 1.7)]
for (x, z, f) in SEATS: furn += chair(x, z, f)

# ---------- lights for the bake ----------
def spot(x, y, z, power, size=65, color=(1, .78, .55)):
    L = bpy.data.lights.new("s", "SPOT"); L.energy = power; L.spot_size = math.radians(size); L.spot_blend = .8; L.color = color; L.shadow_soft_size = .05
    o = bpy.data.objects.new("s", L); sc.collection.objects.link(o); o.location = B(x, y, z); o.rotation_euler = (0, 0, 0)   # points down -Z (Blender) = down
for z in np.linspace(D0 + 1.0, D1 - 1.2, 6): spot(-W + .45, 2.98, z, 45); spot(W - .45, 2.98, z, 45)              # wall washers: warm scallops on the panels
for x in (-3.0, -2.2, 2.2, 3.0): spot(x, 2.98, D0 + .45, 45)
for z in (-2.0, -.2, 1.6): spot(0, H - .02, z, 70, 80)                                                            # over the table
L = bpy.data.lights.new("scr", "AREA"); L.energy = 30; L.size = SCR["w"]; L.size_y = SCR["h"]; L.shape = "RECTANGLE"; L.color = (.85, .9, 1)
o = bpy.data.objects.new("scr", L); sc.collection.objects.link(o); o.location = B(0, SCR["y"], D0 + .05); o.rotation_euler = (math.radians(-90), 0, 0)
for z in (-2.6, .2, 2.8):                                                                                          # brass sconces
    for x in (-W + .08, W - .08):
        P = bpy.data.lights.new("sc", "POINT"); P.energy = 12; P.color = (1, .72, .45); P.shadow_soft_size = .08
        oo = bpy.data.objects.new("sc", P); sc.collection.objects.link(oo); oo.location = B(x * .985, 2.1, z)

# ---------- bake ----------
sc.render.bake.use_pass_direct = True; sc.render.bake.use_pass_indirect = True; sc.render.bake.use_pass_color = False; sc.render.bake.margin = 8
info = {}
for o, res in ((floor, 1024), (walls, 2048), (ceiling, 1024)):
    tile_uv(o, {"Floor": 1.6, "Walls": 1.2, "Ceiling": 2.0}[o.name])
    me = o.data; bu = me.uv_layers.new(name="Bake"); me.uv_layers.active = bu
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=.006); bpy.ops.object.mode_set(mode="OBJECT")
    img = bpy.data.images.new("lm_" + o.name, res, res, float_buffer=True)
    for m in me.materials:
        n = m.node_tree.nodes.new("ShaderNodeTexImage"); n.image = img; m.node_tree.nodes.active = n
    bpy.ops.object.bake(type="DIFFUSE")
    px = np.array(img.pixels[:]).reshape(res, res, 4)[..., :3]; k = float(np.percentile(px, 99.6)) / .92 or 1
    out = np.ones((res, res, 4)); out[..., :3] = np.clip(px / k, 0, 1)
    img2 = bpy.data.images.new("lmo_" + o.name, res, res); img2.pixels = out.ravel().tolist(); img2.filepath_raw = os.path.join(OUT, "lm_" + o.name + ".png"); img2.file_format = "PNG"; img2.save()
    info[o.name] = {"scale": k}
    for m in me.materials: m.node_tree.nodes.remove(m.node_tree.nodes.active)
    print("BAKED", o.name, k, flush=True)
json.dump(info, open(os.path.join(OUT, "lightmaps.json"), "w"))
# ---------- export geometry ----------
for x in bpy.data.objects: x.select_set(x.type == "MESH")
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "boardroom.glb"), export_format="GLB", use_selection=True, export_apply=True, export_materials="EXPORT", export_image_format="NONE", export_yup=True)
print("EXPORTED", os.path.getsize(os.path.join(OUT, "boardroom.glb")))
