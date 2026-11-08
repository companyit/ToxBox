"""用系统 ImageIO/sips 解码真实下载样例，再用标准库PNG读取器核对像素。仓库根执行，参数为最终run目录。"""
from pathlib import Path
import hashlib
import importlib.util
import json
import subprocess
import sys

root = Path.cwd()
source = Path(sys.argv[1])
output = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location('png', root / 'scripts/verify-image-pdf-renders.py')
png = importlib.util.module_from_spec(spec)
spec.loader.exec_module(png)
files = sorted((source / 'artifacts').rglob('cropped-image.png'))
assert len(files) == 6, len(files)
results = []
for index, file in enumerate(files):
    target = output / f'native-decoded-{index + 1}.png'
    subprocess.run(['sips', '-s', 'format', 'png', str(file), '--out', str(target)], check=True, capture_output=True)
    width, height, pixel = png.read_png(target)
    assert (width, height) == (100, 50), (file, width, height)
    assert pixel(10, 10) == (255, 0, 0), (file, pixel(10, 10))
    assert pixel(90, 10) == (0, 255, 0), (file, pixel(90, 10))
    results.append({'input': str(file), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'decoded': target.name, 'width': width, 'height': height, 'samples': [pixel(10, 10), pixel(90, 10)]})
(output / 'native-download-checks.json').write_text(json.dumps(results, ensure_ascii=False, indent=2))
print(f'{len(results)} real downloads independently decoded and checked')
