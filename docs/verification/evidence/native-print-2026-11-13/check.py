"""复查本轮合成 DOCX 打印 PDF；输出目录必须是新目录。"""
from pathlib import Path
import hashlib
import json
import subprocess
import sys
import unicodedata

run, output = map(Path, sys.argv[1:3])
native = sorted(run.glob('artifacts/**/docx-native-print.pdf'))
controls = sorted(run.glob('artifacts/**/docx-print.pdf'))
assert len(native) == 3 and len(controls) == 3, '必须有三份 Firefox 原生输出和三份 Chromium 对照'
output.mkdir(parents=True, exist_ok=False)


def normalize(text):
    return ''.join(unicodedata.normalize('NFKC', text).split())


required = ['本地转换标题', '编号项目甲', '编号项目乙', '无序项目甲', '无序项目乙',
            '加粗文字', '斜体文字', '表格甲', '表格乙', '中文测试，第 70 段']
excluded = ['synthetic-private.docx', '选择 DOCX', '转换并预览', '打印 / 另存为 PDF',
            '顺手集', 'ToolHug', '开发者工具']
records = []
for index, file in enumerate(native + controls, 1):
    pages = json.loads(subprocess.check_output(['.ci/native-print-041/inspect', str(file)]))
    # 保留原始提取文本；NFKC 仅统一字体映射中的兼容部首，不能改变 PDF。
    text = normalize('\n'.join(page['text'] for page in pages))
    checks = {value: normalize(value) in text for value in required}
    leaks = [value for value in excluded if normalize(value) in text]
    assert len(pages) > 1 and all(checks.values()) and not leaks, (str(file), checks, leaks)
    assert all(abs(page['width'] - 595.28) < 1 and abs(page['height'] - 841.89) < 1
               for page in pages), ('A4 纸张尺寸不符', str(file), pages)
    prefix = output / f'document-{index}'
    rendering = subprocess.check_output(['.ci/native-print-041/render', str(file), str(prefix)], text=True)
    images = sorted(output.glob(f'document-{index}-*.png'))
    assert len(images) == len(pages)
    records.append({'input': str(file), 'sha256': hashlib.sha256(file.read_bytes()).hexdigest(),
                    'kind': 'firefox-native' if file in native else 'chromium-control',
                    'pages': pages, 'textChecksNFKC': checks, 'excludedTextFound': leaks,
                    'a4': True, 'renderOutput': rendering.strip(),
                    'rendered': [str(image) for image in images]})
(output / 'checks.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')
print(json.dumps({'documents': len(records), 'pages': sum(len(row['pages']) for row in records),
                  'nativeDocuments': len(native), 'checksPassed': True}, ensure_ascii=False))
