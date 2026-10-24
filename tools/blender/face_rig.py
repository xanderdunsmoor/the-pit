# Adds face controls to the Mixamo "Joe" body: shape keys for jaw, lips, smile, blinks, brows, plus eye bones for gaze.
# Blender coords after FBX import: x = his left(+)/right(-)... (+x is his left), -y = forward, z = up, metres.
import bpy, bmesh, math, numpy as np
from mathutils import Vector, Matrix
def smooth(e0, e1, x):
    t = min(1, max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)
def islands(me):
    bm = bmesh.new(); bm.from_mesh(me); bm.verts.ensure_lookup_table(); seen = set(); out = []
    for v in bm.verts:
        if v.index in seen: continue
        st = [v]; comp = []; seen.add(v.index)
        while st:
            x = st.pop(); comp.append(x.index)
            for e in x.link_edges:
                o = e.other_vert(x)
                if o.index not in seen: seen.add(o.index); st.append(o)
        out.append(comp)
    bm.free(); return out
def fit_sphere(P):
    A = np.c_[2 * P, np.ones(len(P))]; b = (P ** 2).sum(1); c, *_ = np.linalg.lstsq(A, b, rcond=None); ctr = c[:3]; r = math.sqrt(c[3] + (ctr ** 2).sum()); return Vector(ctr), r
TEETH = {}
def add_mouth(body, W, SLIT_Z):
    me = body.data; mw = body.matrix_world; imw = mw.inverted()
    dark = bpy.data.materials.new('MouthInside'); dark.use_nodes = True; dark.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.09, .025, .028, 1); dark.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .6
    teeth = bpy.data.materials.new('Teeth'); teeth.use_nodes = True; teeth.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.5, .47, .41, 1); teeth.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .35
    me.materials.append(dark); me.materials.append(teeth); di = len(me.materials) - 2; ti = di + 1
    for f in me.polygons:
        P = [W[v] for v in f.vertices]
        if all(abs(p[0]) < .0235 and p[1] > -.1215 and 1.566 < p[2] < 1.603 for p in P): f.material_index = di
    # teeth: two thin arched strips just behind the lips, upper fixed to the skull, lower riding with the jaw
    bm = bmesh.new(); bm.from_mesh(me)
    head_groups = None
    n0 = len(bm.verts); new = []
    def arch(z0, z1, front_y, lower):
        cols = []
        for k in range(15):
            u = -1 + 2 * k / 14; x = u * .0165; y = front_y + .02 * u * u
            col = [bm.verts.new(imw @ Vector((x, y, z))) for z in (z0, z1)]
            cols.append(col); new.extend((c, lower) for c in col)
        for a, b in zip(cols, cols[1:]):
            f = bm.faces.new((a[0], b[0], b[1], a[1])); f.material_index = ti; f.smooth = True
    arch(1.5845, 1.5928, -.1185, False)
    arch(1.5718, 1.5798, -.1165, True)
    bm.to_mesh(me); bm.free()
    hg = body.vertex_groups.get('mixamorig7:Head')
    for k, (v, lower) in enumerate(new):
        idx = n0 + k; hg.add([idx], 1.0, 'REPLACE')
        if lower: TEETH[idx] = 1.0
def add_face_rig(arm, body, lashes, prefix):
    mw = body.matrix_world; imw = mw.inverted()
    W = np.array([tuple(mw @ v.co) for v in body.data.vertices])
    isl = islands(body.data)
    eyes = sorted([c for c in isl if len(c) < 1000 and W[c][:, 2].mean() > 1.5], key=lambda c: W[c][:, 0].mean())
    head = max([c for c in isl if W[c][:, 2].mean() > 1.4], key=len)
    E = [fit_sphere(W[c]) for c in eyes]
    print('eyes', [(tuple(round(x, 4) for x in c), round(r, 4)) for c, r in E])
    headset = set(head); headset_before = list(range(len(W)))
    LW = np.array([tuple(lashes.matrix_world @ v.co) for v in lashes.data.vertices])
    # mouth slit and jaw pivot (the lips meet at z 1.5821, found from the duplicated seam vertices along the slit)
    SLIT_Z = 1.5821; PIVOT = Vector((0, -0.012, 1.616))
    me = body.data; nbz = [0.0] * len(me.vertices); cnt = [0] * len(me.vertices)
    for e in me.edges:
        a, b = e.vertices; nbz[a] += W[b][2]; cnt[a] += 1; nbz[b] += W[a][2]; cnt[b] += 1
    nbz = [nbz[i] / max(1, cnt[i]) for i in range(len(nbz))]
    def jaw_w(p, i=None):
        x, y, z = p
        zl = SLIT_Z + (min(max(y, -0.125), -0.01) + 0.125) / 0.115 * 0.034   # slit line rising toward the ear hinge
        if i is not None and i in TEETH: return TEETH[i]
        if abs(x) < .034 and y < -.1:                                        # lips: hard split at the slit; seam twins decided by neighbours
            zz = z if abs(z - SLIT_Z) > .0007 or i is None else nbz[i]
            w = 1.0 if zz < SLIT_Z else 0.0
            # corners stay sealed: the lower lip moves less toward the corners, the chin below still moves fully
            w *= 1 - .8 * smooth(.008, .029, abs(x)) * (1 - smooth(.003, .013, SLIT_Z - z))
        elif abs(x) < .03 and -.1 <= y < -.075 and 1.56 < z < 1.61:          # inside the mouth
            w = smooth(1.589, 1.579, z)
        else:
            w = smooth(zl + .016, zl - .016, z)
            if abs(x) < .05 and y < -.09: w *= 1 - .8 * smooth(.02, .034, abs(x)) * (1 - smooth(.003, .015, SLIT_Z - z))
        w *= smooth(1.46, 1.515, z) if y > -.08 else 1.0
        w *= 1 - smooth(.055, .075, abs(x)) * smooth(-.06, -.02, y)
        return w
    def corner_w(p, cx):
        d = math.sqrt((p[0] - cx) ** 2 + ((p[2] - SLIT_Z) * 1.3) ** 2 + ((p[1] + .118) * .6) ** 2); return 1 - smooth(.004, .026, d)
    def lip_w(p):
        if not (p[1] < -.095): return 0
        d = math.sqrt((p[0] / 1.6) ** 2 + (p[2] - SLIT_Z) ** 2); return 1 - smooth(.006, .022, d)
    def eyelid(p, ec, r, upper):
        v = Vector(p) - ec; d = v.length
        if d < r * .9 or d > r + .016 or v.y > -.002: return 0, 0
        elev = math.degrees(math.atan2(v.z, -v.y)); lat = math.degrees(math.atan2(abs(v.x), -v.y))
        if lat > 62: return 0, 0
        radial = 1 - smooth(r + .006, r + .016, d)
        if upper: return smooth(-6, 4, elev) * (1 - smooth(32, 52, elev)) * radial, elev
        return smooth(4, -6, elev) * (1 - smooth(-30, -45, elev)) * radial, elev
    def rot_about(p, c, axis, ang):
        return c + (Matrix.Rotation(ang, 3, axis) @ (Vector(p) - c))
    X = Vector((1, 0, 0))
    def make_keys(obj, Wp, idxset, extra_lash=False):
        if not obj.data.shape_keys: obj.shape_key_add(name='Basis')
        imw = obj.matrix_world.inverted()
        def key(name, fn):
            k = obj.shape_key_add(name=name, from_mix=False)
            for i in range(len(Wp)):
                if idxset is not None and i not in idxset: continue
                if name != 'jawOpen' and i in TEETH and obj.name == 'Ch33_Body': continue
                q = fn(Wp[i], i) if name == 'jawOpen' else fn(Wp[i])
                if q is not None: k.data[i].co = imw @ Vector(q)
        key('jawOpen', lambda p, i: (lambda w: rot_about(p, PIVOT, X, math.radians(12) * w) if w > 0 else None)(jaw_w(p, i)))
        def wide(p):
            w = max(corner_w(p, .027), corner_w(p, -.027)); s = 1 if p[0] > 0 else -1
            return Vector(p) + Vector((s * .0045, .0022, .0004)) * w if w > 0 else None
        key('mouthWide', wide)
        def rnd(p):
            wc = max(corner_w(p, .027), corner_w(p, -.027)); wl = lip_w(p); s = 1 if p[0] > 0 else -1
            return Vector(p) + Vector((-s * .0062 * wc, -.0045 * wl - .001 * wc, 0)) if wc + wl > 0 else None
        key('mouthRound', rnd)
        def smile(p):
            w = max(corner_w(p, .027), corner_w(p, -.027)); s = 1 if p[0] > 0 else -1
            cheek = (1 - smooth(.0, .03, math.dist((abs(p[0]), p[2]), (.04, 1.605)))) * (1 if p[1] < -.08 else 0)
            return Vector(p) + Vector((s * .003 * w, .002 * w, .0045 * w + .0018 * cheek)) if w + cheek > 0 else None
        key('smile', smile)
        def press(p):
            w = lip_w(p); 
            return Vector(p) + Vector((0, .0012, (-.0012 if p[2] > SLIT_Z else .0012))) * w if w > 0 else None
        key('mouthPress', press)
        for side, (ec, r) in (('R', E[0]), ('L', E[1])):
            def blink(p, ec=ec, r=r):
                wu, el = eyelid(p, ec, r, True); wl, _ = eyelid(p, ec, r, False)
                if wu > 0: return rot_about(p, ec, X, math.radians(38) * wu)  # about +x, a positive angle swings points in front of the eye downward
                if wl > 0: return rot_about(p, ec, X, math.radians(-7) * wl)
                return None
            key('blink' + side, blink)
        def brows(sign, inner_only=False):
            def f(p):
                if p[1] > -.07: return None
                best = 0
                for ec, r in E:
                    dx = p[0] - ec.x; dz = p[2] - (ec.z + .022)
                    if inner_only and dx * (1 if ec.x > 0 else -1) > .004: continue
                    best = max(best, 1 - smooth(.01, .03, math.sqrt(dx * dx * .6 + dz * dz)))
                return Vector(p) + Vector((0, 0, sign * .0035 * best)) if best > 0 else None
            return f
        key('browsUp', brows(1)); key('browsDown', brows(-1)); key('browsInnerUp', brows(1, True))
    add_mouth(body, W, SLIT_Z)
    W = np.array([tuple(mw @ v.co) for v in body.data.vertices]); headset = set(head) | set(range(len(headset_before), len(W)))
    make_keys(body, W, headset)
    # eyelashes ride with the lids
    if not lashes.data.shape_keys: lashes.shape_key_add(name='Basis')
    names = ['jawOpen', 'mouthWide', 'mouthRound', 'smile', 'mouthPress', 'blinkR', 'blinkL', 'browsUp', 'browsDown', 'browsInnerUp']
    limw = lashes.matrix_world.inverted()
    for n in names:
        k = lashes.shape_key_add(name=n, from_mix=False)
        if n in ('blinkR', 'blinkL'):
            ec, r = E[0] if n == 'blinkR' else E[1]
            for i, p in enumerate(LW):
                v = Vector(p) - ec
                if abs(v.x) > .03: continue
                up = v.z > -.001
                k.data[i].co = limw @ rot_about(p, ec, X, math.radians(38 if up else -7))
    # eye bones for gaze
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.data.edit_bones; hd = eb[prefix + 'Head']; amw_i = arm.matrix_world.inverted()
    for side, (ec, r) in (('RightEye', E[0]), ('LeftEye', E[1])):
        b = eb.new(prefix + side); b.head = amw_i @ ec; b.tail = amw_i @ (ec + Vector((0, -.03, 0))); b.parent = hd; b.use_deform = True
    bpy.ops.object.mode_set(mode='OBJECT')
    for side, c in (('RightEye', eyes[0]), ('LeftEye', eyes[1])):
        for vg in body.vertex_groups: vg.remove(c)
        g = body.vertex_groups.get(prefix + side) or body.vertex_groups.new(name=prefix + side); g.add(c, 1.0, 'REPLACE')
    return E
