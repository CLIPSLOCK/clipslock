import base64
import concurrent.futures
import hashlib
import io
import json
import os
import time
import urllib.parse
import urllib.request

import numpy as np
import onnxruntime as ort
from PIL import Image, ImageOps

from pathlib import Path
import argparse
import tempfile

parser = argparse.ArgumentParser(description='Rebuild the visual search index from products.json')
parser.add_argument('--catalog', default='products.json')
parser.add_argument('--output', default='photo-search-index.json')
args = parser.parse_args()
REVISION = '08c606e3123472a388efa59181b677d428f69bbd'
ROOT = os.path.join(tempfile.gettempdir(), 'clipslock-photo-index-' + REVISION[:8])
os.makedirs(ROOT + '/images', exist_ok=True)
products = json.load(open(args.catalog, encoding='utf-8'))
model_path = ROOT + '/dinov2-small-q8.onnx'
if not os.path.exists(model_path):
    urllib.request.urlretrieve('https://huggingface.co/onnx-community/dinov2-small-ONNX/resolve/' + REVISION + '/onnx/model_quantized.onnx', model_path)
options = ort.SessionOptions()
options.intra_op_num_threads = 4
options.inter_op_num_threads = 1
session = ort.InferenceSession(model_path, sess_options=options, providers=['CPUExecutionProvider'])

def download(product):
    path = ROOT + '/images/' + str(product['id']) + '.jpg'
    url = urllib.parse.urljoin('https://raw.githubusercontent.com/CLIPSLOCK/clipslock/main/', urllib.parse.quote(product['img'], safe='/'))
    for attempt in range(3):
        try:
            data = urllib.request.urlopen(url, timeout=30).read()
            Image.open(io.BytesIO(data)).verify()
            open(path, 'wb').write(data)
            return product, path, None
        except Exception as error:
            if attempt == 2:
                return product, path, str(error)

def pixels(image):
    image = ImageOps.exif_transpose(image).convert('RGB')
    scale = 208 / max(image.size)
    size = (max(1, round(image.width * scale)), max(1, round(image.height * scale)))
    image = image.resize(size, Image.Resampling.BILINEAR)
    canvas = Image.new('RGB', (224, 224), 'white')
    canvas.paste(image, ((224 - image.width)//2, (224 - image.height)//2))
    arr = np.asarray(canvas, dtype=np.float32) / 255
    arr = (arr - np.array([.485,.456,.406],dtype=np.float32)) / np.array([.229,.224,.225],dtype=np.float32)
    return arr.transpose(2,0,1)[None]

ids, photos, vectors, failures = [], [], [], []
started = time.time()
with concurrent.futures.ThreadPoolExecutor(max_workers=10) as pool:
    for count, (product, path, error) in enumerate(pool.map(download, products), 1):
        if error:
            failures.append({'id': product['id'], 'img': product['img'], 'error': error})
            continue
        try:
            vector = session.run(None, {'pixel_values': pixels(Image.open(path))})[0][0,0]
            vector = vector / np.linalg.norm(vector)
            code = np.clip(np.rint(vector / np.max(np.abs(vector)) * 127), -127, 127).astype(np.int8)
            ids.append(str(product['id']))
            photos.append(product['img'])
            vectors.append(code)
        except Exception as error:
            failures.append({'id':product['id'], 'error':str(error)})
        if count % 100 == 0:
            print(f'{count}/{len(products)} processed, {len(failures)} unavailable, {round(time.time()-started)}s', flush=True)
matrix = np.stack(vectors)
index = {'version':1, 'model':'onnx-community/dinov2-small-ONNX', 'revision':REVISION, 'dimension':384, 'inputSize':224, 'contentSize':208, 'ids':ids, 'photos':photos, 'vectors':base64.b64encode(matrix.tobytes()).decode()}
open(args.output,'w',encoding='utf-8').write(json.dumps(index,separators=(',',':'),ensure_ascii=False))
open(ROOT+'/unavailable-photos.json','w').write(json.dumps(failures,ensure_ascii=False,indent=2))
print(f'DONE: {len(ids)} indexed, {len(failures)} unavailable; index {os.path.getsize(args.output)} bytes',flush=True)
