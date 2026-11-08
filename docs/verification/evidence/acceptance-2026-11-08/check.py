from pathlib import Path
import hashlib, json, subprocess, importlib.util
root=Path.cwd()
source=root/'docs/verification/evidence/m106c3/runs/2026-11-08T00-51-37.449Z-2161/artifacts'
out=root/'docs/verification/evidence/acceptance-2026-11-08'
out.mkdir(exist_ok=True)
spec=importlib.util.spec_from_file_location('pixels',root/'scripts/verify-image-pdf-renders.py')
pixels=importlib.util.module_from_spec(spec);spec.loader.exec_module(pixels)
report=[]
for index,pdf in enumerate(sorted(source.rglob('*.pdf'))):
 prefix=out/f'pdf-{index:02d}'
 pages=json.loads(subprocess.check_output([str(root/'.ci/acceptance-2026-11-08/inspect'),str(pdf)]))
 name=pdf.name
 expected=None
 if name=='organized.pdf': expected=[('Page 5',270),('Page 1',0),('Page 3',180),('Page 4',180),('Page 6',0)]
 elif name=='merged.pdf': expected=[('Synthetic page 300-1',0),('Synthetic page 200-1',0),('Synthetic page 200-2',90)]
 elif name=='selected.pdf': expected=[('Source page 5',0),('Source page 1',0),('Source page 2',0),('Source page 3',90)]
 elif name=='page-0001.pdf': expected=[('Source page 1',0)]
 elif name=='page-0003.pdf': expected=[('Source page 3',90)]
 if expected:
  assert len(pages)==len(expected),(pdf,pages)
  for page,(text,rotation) in zip(pages,expected):
   assert text in page['text'] and page['rotation']==rotation,(pdf,page,text,rotation)
 if name=='organized.pdf': assert '工' in pages[1]['text'],pdf
 rendered=subprocess.check_output([str(root/'.ci/acceptance-2026-11-08/render-document-pdf'),str(pdf),str(prefix)],stderr=subprocess.STDOUT,text=True).strip()
 assert len(list(out.glob(prefix.name+'-*.png')))==len(pages),(pdf,rendered)
 pixel_checks=None
 if name in ('images.pdf','landscape.pdf'):
  pixel_checks=pixels.check(str(prefix),'landscape' if name=='landscape.pdf' else 'portrait')
 report.append({'input':str(pdf.relative_to(root)),'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':pages,'render':rendered,'pngPrefix':prefix.name,'pixelChecks':pixel_checks})
 print(index,name,len(pages),flush=True)
assert report
(out/'pdfkit-checks.json').write_text(json.dumps({'files':len(report),'pages':sum(len(r['pages']) for r in report),'results':report},ensure_ascii=False,indent=2))
print('ALL PASSED',len(report),sum(len(r['pages']) for r in report))
