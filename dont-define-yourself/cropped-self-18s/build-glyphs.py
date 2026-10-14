#!/usr/bin/env python3
"""Turn free Noto CJK outlines into deterministic matched contour morphs."""
from pathlib import Path
import json,math
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

ROOT=Path(__file__).resolve().parent
FONT=Path('/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc')
OLD='我不擅长表达。';NEW='我在陌生场合容易紧张。'

class OutlinePen(BasePen):
    def __init__(self,glyphs):super().__init__(glyphs);self.loops=[];self.current=[]
    def _moveTo(self,p):self.current=[p]
    def _lineTo(self,p):self.current.append(p)
    def _curveToOne(self,p1,p2,p3):
        p0=self._getCurrentPoint()
        for i in range(1,17):
            t=i/16;u=1-t
            self.current.append(tuple(u**3*p0[k]+3*u*u*t*p1[k]+3*u*t*t*p2[k]+t**3*p3[k] for k in range(2)))
    def _qCurveToOne(self,p1,p2):
        p0=self._getCurrentPoint()
        for i in range(1,13):
            t=i/12;self.current.append(tuple((1-t)**2*p0[k]+2*(1-t)*t*p1[k]+t*t*p2[k] for k in range(2)))
    def _closePath(self):
        if len(self.current)>2:self.loops.append(self.current)
        self.current=[]
    def _endPath(self):self._closePath()

def area(loop):return sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(loop,loop[1:]+loop[:1]))/2

def center(loop):return [sum(p[k] for p in loop)/len(loop) for k in range(2)]

def resample(loop,n=80):
    points=loop+[loop[0]];lengths=[math.dist(a,b) for a,b in zip(points,points[1:])];total=sum(lengths)
    if total<1e-9:return [list(loop[0]) for _ in range(n)]
    out=[];idx=0;start=0
    for k in range(n):
        d=total*k/n
        while idx<len(lengths)-1 and start+lengths[idx]<d:start+=lengths[idx];idx+=1
        u=(d-start)/max(lengths[idx],1e-9)
        out.append([round(points[idx][j]+(points[idx+1][j]-points[idx][j])*u,5) for j in range(2)])
    return out

def align(a,b):
    # Preserve winding (and therefore holes) while matching contour origins.
    offset=min(range(len(b)),key=lambda q:sum((a[i][k]-b[(i+q)%len(b)][k])**2 for i in range(0,len(a),4) for k in range(2)))
    return b[offset:]+b[:offset]

def main():
    font=TTFont(FONT,fontNumber=2);glyphs=font.getGlyphSet();cmap=font.getBestCmap();em=font['head'].unitsPerEm
    outlines={}
    for char in set(OLD+NEW):
        pen=OutlinePen(glyphs);glyphs[cmap[ord(char)]].draw(pen)
        outlines[char]=[[[p[0]/em,-p[1]/em] for p in loop] for loop in pen.loops]
    def pair(a,b):
        aa=sorted(outlines[a],key=lambda l:abs(area(l)),reverse=True);remaining=list(outlines[b]);result=[]
        for loop in aa:
            ca=center(loop);ar=area(loop)
            if remaining:
                i=min(range(len(remaining)),key=lambda i:abs(abs(area(remaining[i]))-abs(ar))*2+math.dist(ca,center(remaining[i]))**2+(100 if area(remaining[i])*ar<0 else 0))
                other=remaining.pop(i);pa=resample(loop);pb=align(pa,resample(other))
            else:
                pa=resample(loop);pb=[ca]*len(pa)
            result.append({'a':pa,'b':pb})
        for loop in remaining:
            cb=center(loop);pb=resample(loop);result.append({'a':[cb]*len(pb),'b':pb})
        return result
    mapping=[(0,0),(1,1),(2,2),(3,3),(4,4),(5,5),(2,6),(3,7),(4,8),(5,9),(6,10)]
    morphs=[{'source':OLD[a],'target':NEW[b],'sourceIndex':a,'targetIndex':b,'extra':b in (6,7,8,9),'contours':pair(OLD[a],NEW[b])} for a,b in mapping]
    result={'source':OLD,'target':NEW,'font':'Noto Serif CJK SC / SIL Open Font License','morphs':morphs}
    (ROOT/'glyph-data.js').write_text('window.GLYPH_MORPH='+json.dumps(result,ensure_ascii=False,separators=(',',':'))+';\n')
    print('Generated actual CJK contour morphs:',len(morphs),'glyphs;',sum(len(m['contours']) for m in morphs),'contours')

if __name__=='__main__':main()
