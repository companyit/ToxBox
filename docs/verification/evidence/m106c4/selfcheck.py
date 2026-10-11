import base64,io,json,os,pathlib,shutil,subprocess,tempfile,zipfile,hashlib
repo=pathlib.Path.cwd()
scanner=repo/'scripts/ci-evidence.py'
evidence=repo/'docs/verification/evidence/m106c4'
results=[]
def record(name,passed,detail=''):
 results.append({'case':name,'passed':passed,'detail':detail})
 if not passed:raise AssertionError(name+' '+detail)
def fixture(label,payload,expected,missing=False,outcome='success'):
 with tempfile.TemporaryDirectory(prefix='workdev-c4-') as folder:
  root=pathlib.Path(folder); run=root/'.ci/run';run.mkdir(parents=True)
  if not missing:
   (run/'results.json').write_text(json.dumps({'stats':{'expected':1}}))
   (run/'html').mkdir();(run/'html/index.html').write_bytes(payload)
  proc=subprocess.run(['python3',str(scanner),outcome],cwd=root,capture_output=True,text=True)
  record(label,(proc.returncode==0)==expected, 'exit='+str(proc.returncode))
  if not expected:record(label+'-staged-deletion',not (root/'.ci/evidence').exists())
fixture('clean-report',b'<html>synthetic</html>',True)
fixture('plaintext-sensitive',b'WORKDEV_SENSITIVE_CANARY',False)
buf=io.BytesIO()
with zipfile.ZipFile(buf,'w') as archive:archive.writestr('trace.trace','WORKDEV_SENSITIVE_CANARY')
fixture('embedded-zip-sensitive',b'data:application/zip;base64,'+base64.b64encode(buf.getvalue()),False)
fixture('missing-expected-report',b'',False,True)
fixture('not-started-report-warning',b'',True,True,'skipped')
# 真实历史失败报告只用于验证scanner，不能计为本轮浏览器结果。
with tempfile.TemporaryDirectory(prefix='workdev-c4-history-') as folder:
 root=pathlib.Path(folder);(root/'.ci').mkdir()
 shutil.copytree(repo/'docs/verification/evidence/m106c3/runs/2026-10-11T04-12-39.107Z-8414',root/'.ci/run')
 p=subprocess.run(['python3',str(scanner),'failure'],cwd=root,capture_output=True,text=True)
 record('historical-failure-report-scan',p.returncode==0,p.stdout+p.stderr[-300:])
 record('failure-context-and-trace-preserved',bool(list((root/'.ci/evidence/diagnostics').rglob('error-context.md'))) and bool(list((root/'.ci/evidence/diagnostics').rglob('trace.zip'))))
# 所有篡改只作用于中转产物，之后恢复；不修改业务源码。
subprocess.run(['node','scripts/ci-build.mjs','prepare'],check=True)
receipt=repo/'.ci/build/receipt.json'; original=receipt.read_bytes()
target=repo/'.ci/build/dist-ssg/index.html';html=target.read_bytes()
manifest=repo/'.ci/build/ssr-manifest.json';manifest_original=manifest.read_bytes()
def verify_case(name,env=None):
 p=subprocess.run(['node','scripts/ci-build.mjs','verify'],capture_output=True,text=True,env=env)
 record(name,p.returncode!=0,'exit='+str(p.returncode))
try:
 target.write_bytes(html+b'<!-- synthetic corruption -->');verify_case('artifact-corruption');target.write_bytes(html)
 manifest.write_bytes(manifest_original+b' ');verify_case('manifest-corruption');manifest.write_bytes(manifest_original)
 data=json.loads(original);data['source']['commit']='0'*40;receipt.write_text(json.dumps(data));verify_case('commit-mismatch');receipt.write_bytes(original)
 data=json.loads(original);data['source']['files']['package-lock.json']='0'*64;receipt.write_text(json.dumps(data));verify_case('lock-mismatch');receipt.write_bytes(original)
 env=os.environ.copy();env['WORKDEV_CI_RECEIPT_SHA']='0'*64;verify_case('independent-receipt-mismatch',env)
 env=os.environ.copy();env['GITHUB_ACTIONS']='true';env.pop('WORKDEV_CI_RECEIPT_SHA',None);verify_case('missing-independent-CI-receipt',env)
 subprocess.run(['node','scripts/ci-build.mjs','verify'],check=True);record('restored-artifact-valid',True)
finally:
 target.write_bytes(html);manifest.write_bytes(manifest_original);receipt.write_bytes(original)
# 静态检查器负向验证，不冒充GitHub服务端表达式或运行验证。
workflow=(repo/'.github/workflows/quality.yml').read_text()
for name,modified in [('write-permission',workflow.replace('contents: read','contents: write')),('broken-dependency',workflow.replace('needs: quality','needs: missing')),('unpinned-action',workflow.replace('actions/checkout@08c6903cd8c0fde910a37f88322edcfb5dd907a8','actions/checkout@v5')),('failure-bypass',workflow.replace('id: types','id: types\n        continue-on-error: true'))]:
 with tempfile.NamedTemporaryFile(suffix='.yml',mode='w') as file:
  file.write(modified);file.flush()
  p=subprocess.run(['ruby','scripts/ci-check.rb',file.name],capture_output=True,text=True)
  record('workflow-rejects-'+name,p.returncode!=0)
(evidence/'negative-checks.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(results,ensure_ascii=False,indent=2))
