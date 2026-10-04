// DINOv2 image similarity runs locally. Query pixels never leave this worker.
const runtimeBase = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.20.1/dist/';
let ready;
function notify(id, message) { self.postMessage({id, type: 'progress', message}); }
async function loadModel(index, id) {
    const url = `https://huggingface.co/${index.model}/resolve/${index.revision}/onnx/model_quantized.onnx`;
    let cache;
    try {
        cache = await caches.open('clipslock-photo-model-v1');
        const cached = await cache.match(url);
        if (cached) return await cached.arrayBuffer();
    } catch {}
    const response = await fetch(url);
    if (!response.ok) throw new Error('Model unavailable');
    if (!response.body) return response.arrayBuffer();
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0, previousMB = -1;
    while (true) {
        const {done, value} = await reader.read();
        if (done) break;
        chunks.push(value);
        size += value.length;
        const mb = Math.floor(size / 1048576);
        if (mb !== previousMB) {
            previousMB = mb;
            notify(id, `Готуємо пошук за фото: завантажено ${mb} МБ із приблизно 24 МБ…`);
        }
    }
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { buffer.set(chunk, offset); offset += chunk.length; }
    try { await cache?.put(url, new Response(buffer.slice(), {headers: {'Content-Type': 'application/octet-stream'}})); } catch {}
    return buffer.buffer;
}
async function initialize(id) {
    const [ort, response] = await Promise.all([
        import(runtimeBase + 'ort.wasm.min.mjs'),
        fetch(new URL('photo-search-index.json', import.meta.url))
    ]);
    if (!response.ok) throw new Error('Index unavailable');
    const index = await response.json();
    if (index.dimension !== 384 || !Array.isArray(index.ids) || index.ids.length !== index.photos?.length) throw new Error('Invalid index');
    const bytes = atob(index.vectors);
    if (bytes.length !== index.ids.length * index.dimension) throw new Error('Invalid vectors');
    const vectors = new Int8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) vectors[i] = bytes.charCodeAt(i);
    const norms = new Float32Array(index.ids.length);
    for (let row = 0; row < norms.length; row++) {
        let squared = 0;
        for (let col = 0; col < 384; col++) squared += vectors[row * 384 + col] ** 2;
        norms[row] = Math.sqrt(squared) || 1;
    }
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = runtimeBase;
    ort.env.logLevel = 'error';
    const model = await loadModel(index, id);
    notify(id, 'Запускаємо порівняння фотографій…');
    const session = await ort.InferenceSession.create(model, {executionProviders: ['wasm'], graphOptimizationLevel: 'all'});
    return {ort, session, index, vectors, norms};
}
let jobs = Promise.resolve();
async function search(event) {
    const {id, variants} = event.data;
    try {
        if (!ready) ready = initialize(id).catch(error => { ready = null; throw error; });
        const {ort, session, index, vectors, norms} = await ready;
        notify(id, 'Шукаємо схожі кліпси у нашому каталозі…');
        if (!Array.isArray(variants) || variants.length !== 4) throw new Error('Invalid photo variants');
        const scores = new Float32Array(index.ids.length).fill(-Infinity);
        for (let variant = 0; variant < variants.length; variant++) {
            const pixels = variants[variant];
            if (!(pixels instanceof Float32Array) || pixels.length !== 3*224*224) throw new Error('Invalid pixels');
            notify(id, `Порівнюємо поворот ${variant+1} із ${variants.length}…`);
            const input = new ort.Tensor('float32', pixels, [1, 3, 224, 224]);
            let output;
            try {
                output = await session.run({pixel_values: input});
                const embedding = output.last_hidden_state.data.subarray(0, 384);
                let norm = 0;
                for (const value of embedding) norm += value * value;
                norm = Math.sqrt(norm) || 1;
                for (let row = 0; row < index.ids.length; row++) {
                    let dot = 0;
                    for (let col = 0; col < 384; col++) dot += embedding[col] * vectors[row * 384 + col];
                    scores[row] = Math.max(scores[row], dot / (norm * norms[row]));
                }
            } finally {
                input.dispose();
                if (output) Object.values(output).forEach(tensor => tensor.dispose());
            }
        }
        const matches = index.ids.map((productId,row) => ({
            id: productId, img: index.photos[row], score: scores[row]
        })).sort((a,b) => b.score-a.score);
        self.postMessage({id, type: 'results', matches});
    } catch (error) {
        self.postMessage({id, type: 'error', message: String(error.message || error)});
    }
}
self.addEventListener('message', event => { jobs = jobs.then(() => search(event)); });
