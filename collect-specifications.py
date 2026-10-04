"""Collect verified MAK specifications. Python 3.10+, Windows curl, no pip packages."""
import argparse
import html
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
from urllib.parse import urljoin

ROOT = Path(__file__).resolve().parent
DIMENSIONS = {'T','T1','T2','F','F1','H','H1','H2','B','S','HS','D','D1','D2','D3','D4','M','A','Ø'}
ATTRIBUTES = {'Вид','Підвид','Тип','Колір','Матеріал'}

def text(value):
    return html.unescape(re.sub(r'<[^>]*>', '', value)).strip()

def parse_page(page, code):
    title = re.search(r'<h1\b[^>]*>(.*?)</h1>', page, re.S | re.I)
    if not title or text(title[1]) != code:
        raise ValueError('Page does not match article ' + code)
    pairs = re.findall(r'class=["\']extra_fields_name["\'][^>]*>(.*?)</span>.*?class=["\']extra_fields_value["\'][^>]*>(.*?)</span>', page, re.S)
    props = {text(key): text(value) for key, value in pairs}
    dimensions = {key: value for key, value in props.items()
                  if key in DIMENSIONS and re.fullmatch(r'[0-9., /–-]+', value)}
    if not dimensions:
        raise ValueError('No verified dimensions on page')
    scheme = re.search(r'<img\b[^>]*src=["\'](/images/shema/[^"\']+)["\']', page)
    source = 'https://mak.parts/all/' + code
    return {'source': source, 'dimensions': dimensions,
            'attributes': {key:value for key,value in props.items() if key in ATTRIBUTES},
            'scheme': urljoin(source, scheme[1]) if scheme else None}

def download(url):
    result = subprocess.run(
        ['curl','--fail','--location','--silent','--show-error',
         '--connect-timeout','15','--max-time','45',url],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=55)
    if result.returncode:
        raise RuntimeError(result.stderr.decode('utf-8',errors='replace').strip())
    return result.stdout.decode('utf-8-sig')

def save(path, data):
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    os.replace(temporary, path)

def load(path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding='utf-8-sig'))

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--limit',type=int,default=200,help='Maximum attempted articles in this run')
    parser.add_argument('--delay',type=float,default=1.5,help='Pause between articles')
    parser.add_argument('--retry-errors', action='store_true', help='Retry previously failed articles')
    args = parser.parse_args()
    if args.limit < 1 or args.delay < 0:
        parser.error('limit must be positive; delay cannot be negative')
    if not shutil.which('curl'):
        raise RuntimeError('curl not found. Use Windows 10/11 with curl installed.')
    catalog_path = ROOT / 'products.json'
    output = ROOT / 'product-specifications.json'
    error_path = ROOT / 'specifications-errors.json'
    if not catalog_path.exists():
        print('Downloading public catalog...')
        catalog = json.loads(download('https://raw.githubusercontent.com/CLIPSLOCK/clipslock/main/products.json'))
        if not isinstance(catalog,list):
            raise ValueError('Invalid catalog')
        save(catalog_path,catalog)
    catalog = load(catalog_path,[])
    if not isinstance(catalog,list):
        raise ValueError('products.json must contain a list')
    if not output.exists():
        print('Downloading existing specifications...')
        existing = json.loads(download('https://raw.githubusercontent.com/CLIPSLOCK/clipslock/main/product-specifications.json'))
        if not isinstance(existing,dict):
            raise ValueError('Invalid specifications')
        save(output,existing)
    existing = load(output,{})
    errors = load(error_path,{})
    if not isinstance(existing,dict) or not isinstance(errors,dict):
        raise ValueError('Invalid existing specifications or error file; nothing overwritten')
    codes = list(dict.fromkeys(str(p.get('oem','')).strip() for p in catalog))
    codes = [code for code in codes if re.fullmatch(r'\d{5}',code)]
    pending = [code for code in codes if not existing.get(code,{}).get('dimensions')]
    selected = [code for code in pending if args.retry_errors or code not in errors][:args.limit]
    if not selected:
        print(f'No unprocessed articles remain. Previously failed: {len(errors)}. Use --retry-errors to retry.')
        return
    backup = output.with_name('product-specifications.backup-' + time.strftime('%Y%m%d-%H%M%S') + '.json')
    shutil.copy2(output,backup)
    print(f'Already filled: {len(codes)-len(pending)}; pending: {len(pending)}; this run: {len(selected)}')
    succeeded = 0
    try:
        for number,code in enumerate(selected,1):
            success = False
            for attempt in range(3):
                try:
                    specs = parse_page(download('https://mak.parts/all/' + code),code)
                    existing[code] = specs
                    errors.pop(code,None)
                    succeeded += 1
                    success = True
                    break
                except (ValueError,RuntimeError,subprocess.TimeoutExpired) as error:
                    errors[code] = str(error)
                    if isinstance(error,ValueError):
                        break
                    if attempt < 2:
                        time.sleep(3*(attempt+1))
            save(output,existing)
            save(error_path,errors)
            print(f'[{number}/{len(selected)}] {code}: ' + ('OK' if success else 'SKIPPED - see specifications-errors.json'),flush=True)
            time.sleep(args.delay)
    except KeyboardInterrupt:
        print('\nStopped. Completed articles are saved; run again to continue.')
    print(f'Added: {succeeded}. Output: {output.name}. Errors: {error_path.name}')
    print('Upload ONLY product-specifications.json to the GitHub repository to publish.')

if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        print('ERROR:',error)
        sys.exit(1)
