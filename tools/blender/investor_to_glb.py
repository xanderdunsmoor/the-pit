# Converts a Mixamo seated character (FBX with skin + "Sitting Idle") into a compact GLB for the boardroom.
#   python tools/blender/investor_to_glb.py in.fbx out.glb
import bpy, re, sys, os
src, dst = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=src)
arm = [o for o in bpy.data.objects if o.type == "ARMATURE"][0]
strip = lambda n: re.sub(r"^mixamorig\d*:", "", n)
for b in arm.data.bones: b.name = strip(b.name)
for o in bpy.data.objects:
    if o.type == "MESH":
        for vg in o.vertex_groups: vg.name = strip(vg.name)
        # background characters: fewer polygons keep them cheap
        if len(o.data.polygons) > 6000:
            md = o.modifiers.new("dec", "DECIMATE"); md.ratio = max(.35, 6000 / len(o.data.polygons))
act = arm.animation_data.action; act.name = "Sit"
for fc in act.fcurves:
    fc.data_path = re.sub(r'pose\.bones\["mixamorig\d*:([^"]+)"\]', r'pose.bones["\1"]', fc.data_path)
for fc in [fc for fc in act.fcurves if fc.data_path.endswith("scale")]: act.fcurves.remove(fc)
for img in bpy.data.images:
    if img.size[0] > 1024: img.scale(1024, 1024)
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_image_format="JPEG", export_jpeg_quality=80, export_animation_mode="ACTIONS", export_apply=True, export_force_sampling=True, export_optimize_animation_size=True, export_yup=True)
print("SIZE", os.path.getsize(dst))
