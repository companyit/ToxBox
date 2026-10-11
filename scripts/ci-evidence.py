"""CI测试证据allowlist及已知凭据检查；不是后端服务或通用DLP。"""
import base64
import io
import json
from pathlib import Path
import re
import shutil
import sys
import zipfile

ROOT = Path('.ci/run')
DEST = Path('.ci/evidence')
PATTERNS = [rb'WORKDEV_SENSITIVE_CANARY', rb'gh[pousr]_[A-Za-z0-9]{30,}',
            rb'github_pat_[A-Za-z0-9_]{50,}', rb'AKIA[A-Z0-9]{16}',
            rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',
            rb'sk-(?:proj-)?[A-Za-z0-9_-]{40,}']


def scan(data, depth=0):
    if depth > 4 or len(data) > 100 * 1024 * 1024:
        raise ValueError('证据体积或嵌套超过扫描限制')
    if any(re.search(pattern, data) for pattern in PATTERNS):
        raise ValueError('敏感标记或凭据模式命中，禁止上传')
    if data.startswith(b'PK\x03\x04'):
        with zipfile.ZipFile(io.BytesIO(data)) as archive:
            if sum(info.file_size for info in archive.infolist()) > 100 * 1024 * 1024:
                raise ValueError('压缩证据超过扫描限制')
            for info in archive.infolist():
                if info.filename.startswith('/') or '..' in Path(info.filename).parts:
                    raise ValueError('压缩证据包含不安全路径')
                if not info.is_dir():
                    scan(archive.read(info), depth + 1)
    # Playwright HTML报告内嵌zip，必须解码检查，不能只扫HTML文本。
    for encoded in re.findall(rb'data:application/zip;base64,([A-Za-z0-9+/=]+)', data):
        scan(base64.b64decode(encoded, validate=True), depth + 1)


def collect():
    shutil.rmtree(DEST, ignore_errors=True)
    missing = not (ROOT / 'results.json').is_file() or not (ROOT / 'html/index.html').is_file()
    if missing:
        print('::warning::Playwright报告缺失；可能尚未启动、被取消或安装失败')
    allowed = {'run.json', 'build-sha256.json', 'results.json'}
    extensions = {'.html', '.json', '.png', '.zip', '.txt', '.md', '.js', '.css', '.svg', '.ttf', '.woff', '.woff2', '.wasm', '.webm', '.jpeg', '.jpg', '.webmanifest'}
    try:
        if ROOT.exists():
            for file in sorted(ROOT.rglob('*')):
                if file.is_symlink():
                    raise ValueError('证据包含符号链接')
                if not file.is_file():
                    continue
                relative = file.relative_to(ROOT)
                if str(relative) not in allowed and relative.parts[0] not in {'html', 'artifacts'}:
                    raise ValueError('证据不在allowlist中')
                if file.suffix not in extensions:
                    raise ValueError('证据文件类型不在allowlist中')
                scan(file.read_bytes())
                target = DEST / 'diagnostics' / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(file, target)
        summary = {'reportMissing': missing, 'browserStepOutcome': sys.argv[1], 'syntheticInputsOnly': True}
        if (ROOT / 'results.json').is_file():
            result = json.loads((ROOT / 'results.json').read_text())
            summary['stats'] = result['stats']
        if (ROOT / 'run.json').is_file():
            summary['run'] = json.loads((ROOT / 'run.json').read_text())
        (DEST / 'summary').mkdir(parents=True, exist_ok=True)
        content = json.dumps(summary, ensure_ascii=False, indent=2).encode()
        scan(content)
        (DEST / 'summary/summary.json').write_bytes(content)
        if missing and sys.argv[1] in {'success', 'failure'}:
            raise ValueError('浏览器步骤已执行但报告缺失')
    except Exception:
        shutil.rmtree(DEST, ignore_errors=True)
        raise


if __name__ == '__main__':
    if sys.argv[1] == 'build':
        for file in Path('.ci/build').rglob('*'):
            if file.is_symlink():
                raise ValueError('构建工件禁止符号链接')
            if file.is_file():
                scan(file.read_bytes())
    else:
        collect()
