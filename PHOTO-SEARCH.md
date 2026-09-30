# Photo search

The camera button finds up to 24 visually similar products from the catalog. DINOv2 runs in a Web Worker using ONNX Runtime Web. Uploaded photo pixels stay in the browser; only the public model and catalog index are downloaded. The model is loaded on demand and cached where the browser permits it.

The index contains 1486 available images from 1487 products at initial build. Product 879 references a missing `clipsa879.jpg` and is skipped. The search checks product IDs and image paths against the current catalog, so removed or renamed photos are not returned from a stale index.

## Refresh the index after adding or replacing product photos

```sh
python -m pip install onnxruntime pillow numpy
python tools/build-photo-index.py --catalog products.json --output photo-search-index.json
```

Commit the generated `photo-search-index.json`. The script fixes the model revision and applies the same 224px white canvas / 208px contained image preprocessing used in the browser. Unavailable photos are listed in the temporary cache's `unavailable-photos.json`.

The browser ranks cosine similarity of 384-dimensional CLS features; catalog vectors are compressed to signed 8-bit values and normalized again when loaded. Results are visual suggestions, not OEM identification or a compatibility guarantee. Real photos with several objects, hands, clutter, different angles or damaged clips need further evaluation.

## Dependencies

- DINOv2 small: https://github.com/facebookresearch/dinov2 (Apache 2.0)
- Pinned ONNX model: `onnx-community/dinov2-small-ONNX` revision `08c606e3123472a388efa59181b677d428f69bbd`
- ONNX Runtime Web 1.20.1: https://github.com/microsoft/onnxruntime (MIT)

A first search downloads a model of about 24 MB plus the runtime and index. If loading fails, the UI shows an error and leaves ordinary catalog search available. No secret key or backend service is needed.
