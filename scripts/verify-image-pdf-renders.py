"""核对 PDFKit 渲染合成图片 PDF 的象限色与页序；仅用 Python 标准库。"""
import json
from pathlib import Path
import struct
import sys
import zlib


def read_png(path):
    raw = Path(path).read_bytes()
    assert raw[:8] == b'\x89PNG\r\n\x1a\n'
    at, compressed = 8, bytearray()
    while at < len(raw):
        length = struct.unpack_from('>I', raw, at)[0]
        kind, data = raw[at+4:at+8], raw[at+8:at+8+length]
        if kind == b'IHDR':
            width, height, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', data)
            assert depth == 8 and color in (2, 6) and interlace == 0
        if kind == b'IDAT': compressed.extend(data)
        at += length + 12
    bpp = 4 if color == 6 else 3
    stride = width * bpp
    decoded, rows = zlib.decompress(compressed), []
    for y in range(height):
        start = y * (stride + 1)
        mode, row = decoded[start], bytearray(decoded[start+1:start+1+stride])
        prev = rows[-1] if rows else bytearray(stride)
        for x in range(stride):
            left, up, corner = row[x-bpp] if x >= bpp else 0, prev[x], prev[x-bpp] if x >= bpp else 0
            predictor = left + up - corner
            pa, pb, pc = abs(predictor-left), abs(predictor-up), abs(predictor-corner)
            paeth = left if pa <= pb and pa <= pc else up if pb <= pc else corner
            row[x] = (row[x] + [0, left, up, (left+up)//2, paeth][mode]) & 255
        rows.append(row)
    def pixel(x, y): return tuple(rows[int(y)][int(x)*bpp:int(x)*bpp+3])
    return width, height, pixel


COLORS = {'R': (255,0,0), 'G': (0,255,0), 'B': (0,0,255), 'Y': (255,255,0), 'W': (255,255,255)}
ORIENTATIONS = ['RGBY', 'GRYB', 'YBGR', 'BYRG', 'RBGY', 'BRYG', 'YGBR', 'GYRB', 'RWWW']

def check(prefix, mode):
    expected = ORIENTATIONS if mode == 'orientations' else ['BRYG', 'RGBY', 'RWWW']
    report = []
    for i, colors in enumerate(expected):
        path = f'{prefix}-{i+1}.png'
        width, height, pixel = read_png(path)
        # 独立毫米几何；原图为 80×40，方向 5～8 宽高交换。
        rotated = (mode == 'orientations' and 4 <= i < 8) or (mode != 'orientations' and i == 0)
        iw, ih = (40,80) if rotated else (80,40)
        landscape = mode == 'landscape'
        pw, ph = (297,210) if landscape else (210,297)
        margin = 0 if mode == 'orientations' else 20 if landscape else 12
        scale = min((pw-2*margin)/iw, (ph-2*margin)/ih)
        rw, rh = iw*scale/pw*width, ih*scale/ph*height
        x, y = (width-rw)/2, (height-rh)/2
        samples=[]
        for label, (a,b) in zip(colors, [(0.25,0.25),(0.75,0.25),(0.25,0.75),(0.75,0.75)]):
            rgb = pixel(x+rw*a, y+rh*b)
            assert max(abs(c-e) for c,e in zip(rgb,COLORS[label])) < 35, (path,label,rgb)
            samples.append(rgb)
        assert max(abs(c-255) for c in pixel(2,2)) < 10, (path,'背景非白色')
        # 外侧留白和图片内侧取样核对预期定位，避开抗锯齿边界。
        for px,py in [(width/2,max(2,y-4)),(max(2,x-4),height/2)]:
            if x > 5 or y > 5:
                if (px < x or py < y): assert min(pixel(px,py)) > 240, (path,'预期留白区有图像')
        report.append({'page':i+1,'expected':colors,'samples':samples,'render':[width,height]})
    return report

if __name__ == '__main__':
    print(json.dumps(check(sys.argv[1], sys.argv[2]), ensure_ascii=False, indent=2))
