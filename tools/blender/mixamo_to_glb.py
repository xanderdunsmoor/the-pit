# Combines the Mixamo character FBX and clip FBXs (in mx/) into one GLB with named actions. Run with the bpy package.
import bpy,re,os
bpy.ops.wm.read_factory_settings(use_empty=True)
D='mx/'
bpy.ops.import_scene.fbx(filepath=D+'Ch33_nonPBR.fbx')
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; arm.name='Rex'
strip=lambda n: re.sub(r'^mixamorig\d*:','',n)
for b in arm.data.bones: b.name=strip(b.name)
for o in bpy.data.objects:
    if o.type=='MESH':
        for vg in o.vertex_groups: vg.name=strip(vg.name)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
ANIMS={'Idle':'Weight Shift Idle','Idle2':'Standing Idle','Walk':'Male Standard Walk','Talk1':'Asking A Question With Two Hands','Talk2':'Asking A Question With One Hand','Talk3':'General Conversation','Point':'Pointing With Arm Bent','Bow':'Quick Formal Bow','Victory':'Celebrating After A Win','Defeat':'Showing Frustration After A Loss','Think':'Thinking While Standing','Shrug':'Shoulder Shrug','Nod':'Nodding Head Yes'}
for name,f in ANIMS.items():
    before=set(bpy.data.objects); bpy.ops.import_scene.fbx(filepath=D+f+'.fbx')
    new=[o for o in bpy.data.objects if o not in before]
    a2=[o for o in new if o.type=='ARMATURE'][0]
    act=a2.animation_data.action; act.name=name; act.use_fake_user=True
    for fc in act.fcurves:
        fc.data_path=re.sub(r'pose\.bones\["mixamorig\d*:([^"]+)"\]',r'pose.bones["\1"]',fc.data_path)
    # drop scale curves (mixamo keys constant scale)
    for fc in [fc for fc in act.fcurves if fc.data_path.endswith('scale')]: act.fcurves.remove(fc)
    for o in new: bpy.data.objects.remove(o,do_unlink=True)
    print('ACT',name,act.frame_range[:],len(act.fcurves))
arm.animation_data_create(); arm.animation_data.action=bpy.data.actions['Idle']
for img in bpy.data.images:
    if img.size[0]>1024:
        t=2048 if 'Body' in img.name or img.name=='file3' else 1024
        if img.size[0]>t: img.scale(t,t)
for o in bpy.data.objects:
    if o.type=='MESH': print('MAT',o.name,[ (n.type,n.image.name if n.type=='TEX_IMAGE' else '') for m in o.data.materials for n in m.node_tree.nodes])
bpy.ops.export_scene.gltf(filepath='rexjoe.glb',export_format='GLB',export_image_format='JPEG',export_jpeg_quality=82,export_animation_mode='ACTIONS',export_force_sampling=True,export_optimize_animation_size=True,export_def_bones=True,export_morph=False,export_yup=True)
print('SIZE',os.path.getsize('rexjoe.glb'))
