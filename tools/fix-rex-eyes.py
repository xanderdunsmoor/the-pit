# Run once after tools/blender/mixamo_to_glb.py: repaints the red sclera edges and maroon eye holes in Rex's body texture, in place in public/models/rex.json.
import json,base64,struct,io,sys
import numpy as np
from PIL import Image
P='/home/claude/the-pit/public/models/rex.json'
j=json.load(open(P)); b=base64.b64decode(j['glb'])
jl=struct.unpack('<I',b[12:16])[0]; g=json.loads(b[20:20+jl]); bl=struct.unpack('<I',b[20+jl:24+jl])[0]; bin_=b[28+jl:28+jl+bl]
iv=g['images'][2]['bufferView']; v=g['bufferViews'][iv]; o=v.get('byteOffset',0)
im=np.asarray(Image.open(io.BytesIO(bin_[o:o+v['byteLength']])).convert('RGB')).astype(np.float32)
# eyeball sclera: red edges -> soft shadowed off-white
y0,y1,x0,x1=0,260,640,1110; reg=im[y0:y1,x0:x1]; r,gg,bb=reg[...,0],reg[...,1],reg[...,2]
red=np.clip((r-gg)/np.maximum(r,1)-.08,0,1)/.6; YY,XX=np.mgrid[y0:y1,x0:x1]; disk=np.clip((1-np.hypot((XX-928)/215,(YY-90)/175))*8,0,1); red=(np.clip(((r-gg)/np.maximum(r,1)-.3)/.3,0,1)*disk*np.clip((bb+6-gg)/8,0,1))[...,None]
scl=np.array([150,136,130],np.float32)   # darker toward the edge, where lids shade it
im[y0:y1,x0:x1]=reg*(1-red)+scl*red
# eye-hole interiors on the face: maroon -> neutral dark
for cx,cy in [(1470,270),(1625,270)]:
    yy,xx=np.mgrid[cy-45:cy+45,cx-55:cx+55]; reg=im[cy-45:cy+45,cx-55:cx+55]; r,gg=reg[...,0],reg[...,1]
    lum0=reg.mean(-1); m=np.clip(((r-gg)-15)/15,0,1)*np.clip((90-lum0)/25,0,1)*(np.hypot((xx-cx)/48,(yy-cy)/34)<1)
    m=m[...,None]; lum=reg.mean(-1,keepdims=True); tgt=np.array([48,38,35],np.float32)
    im[cy-45:cy+45,cx-55:cx+55]=reg*(1-m)+tgt*m
out=io.BytesIO(); Image.fromarray(np.clip(im,0,255).astype(np.uint8)).save(out,'JPEG',quality=90); Image.fromarray(np.clip(im,0,255).astype(np.uint8)).crop((640,0,1900,560)).size
new=bytearray(); datas=[]
for i,bv in enumerate(g['bufferViews']):
    d=out.getvalue() if i==iv else bin_[bv.get('byteOffset',0):bv.get('byteOffset',0)+bv['byteLength']]
    while len(new)%4: new.append(0)
    bv['byteOffset']=len(new); bv['byteLength']=len(d); new+=d
while len(new)%4: new.append(0)
g['buffers'][0]['byteLength']=len(new)
js=json.dumps(g,separators=(',',':')).encode(); js+=b' '*((4-len(js)%4)%4)
glb=struct.pack('<III',0x46546C67,2,12+8+len(js)+8+len(new))+struct.pack('<II',len(js),0x4E4F534A)+js+struct.pack('<II',len(new),0x004E4942)+bytes(new)
j['glb']=base64.b64encode(glb).decode(); json.dump(j,open(P,'w')); print('ok',len(glb))
