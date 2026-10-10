"""Recover the supplied curved lettering from its original outline paths (no tracing)."""
from pathlib import Path
import pymupdf, xml.etree.ElementTree as ET, sys
folder=Path(sys.argv[1])
root=Path(__file__).resolve().parents[1]
doc=pymupdf.open(folder/'半打空间logo.pdf')
edges=[]
for drawing in doc[0].get_drawings():
 c=drawing['color']
 if not c or abs(c[0]-.478)>.01:continue
 start=len(edges)
 for item in drawing['items']:
  kind=item[0]
  if kind in ['l','c']:edges.append((kind,list(item[1:])))
  elif kind=='re':
   r=item[1];points=[r.tl,r.tr,r.br,r.bl,r.tl];edges.extend(('l',[a,b]) for a,b in zip(points,points[1:]))
  elif kind=='qu':
   q=item[1];points=[q.ul,q.ur,q.lr,q.ll,q.ul];edges.extend(('l',[a,b]) for a,b in zip(points,points[1:]))
 if drawing['closePath'] and len(edges)>start:
  a=edges[-1][1][-1];b=edges[start][1][0]
  if abs(a-b)>.01:edges.append(('l',[a,b]))
def near(a,b):return abs(a-b)<.015
contours=[]
while edges:
 chain=[edges.pop(0)]
 while True:
  start=chain[0][1][0];end=chain[-1][1][-1]
  if near(start,end):break
  for i,(kind,pts) in enumerate(edges):
   if near(pts[0],end):chain.append(edges.pop(i));break
   if near(pts[-1],end):edges.pop(i);chain.append((kind,list(reversed(pts))));break
   if near(pts[-1],start):chain.insert(0,edges.pop(i));break
   if near(pts[0],start):edges.pop(i);chain.insert(0,(kind,list(reversed(pts))));break
  else:
   print('Close component beneath overlapping bar',start,end)
   chain.append(('l',[end,start]));break
 contours.append(chain)
def bounds(chain):
 points=[p for _,ps in chain for p in ps];return (min(p.x for p in points),min(p.y for p in points),max(p.x for p in points),max(p.y for p in points))
def inside(a,b):return a[0]>b[0] and a[1]>b[1] and a[2]<b[2] and a[3]<b[3]
def point(p):return f'{p.x:.4f} {p.y:.4f}'
def path(chain):return 'M'+point(chain[0][1][0])+''.join(('L' if k=='l' else 'C')+' '.join(point(p) for p in ps[1:]) for k,ps in chain)+'Z'
boxes=[bounds(c) for c in contours];children={i:[] for i in range(len(contours))};roots=[]
for i,box in enumerate(boxes):
 parents=[j for j,b in enumerate(boxes) if inside(box,b)]
 if parents:children[min(parents,key=lambda j:(boxes[j][2]-boxes[j][0])*(boxes[j][3]-boxes[j][1]))].append(i)
 else:roots.append(i)
old=ET.parse(folder/'半打空间logo.svg').getroot()
blocks=[]
colors={'st0':'#122e3b','st2':'#c7c8ca','st5':'#636466'}
for e in old.iter():
 if e.tag.endswith('rect') and e.get('class') in colors:
  e.tag='rect';e.set('fill',colors[e.attrib.pop('class')]);blocks.append(ET.tostring(e,encoding='unicode'))
art=''.join(blocks)+''.join('<path fill="#122e3b" fill-rule="evenodd" d="'+path(contours[i])+''.join(path(contours[j]) for j in children[i])+'"/>' for i in roots)
svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 268 1922 544">'+art+'</svg>'
(root/'public/assets/brand/logo-original-r26.svg').write_text(svg,encoding='utf8')
(root/'public/assets/brand/logo-reversed-r26.svg').write_text(svg.replace('#122e3b','#ffffff'),encoding='utf8')
print('Original contours',len(contours),'curves',sum(k=='c' for c in contours for k,_ in c),'SVG bytes',len(svg))

