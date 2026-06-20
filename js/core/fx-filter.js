class FxFilter {
    static elements = new WeakMap();
    static filters = new Map();
    static filterOptions = new Map();
    static running = false;
    static noiseCache = new Map();
    static glassCache = new Map();
    static uid = 0;

    static add(options) {
        if (typeof options === 'string') {
            const name = arguments[0];
            const callback = arguments[1];
            this.filters.set(name, callback);
            this.filterOptions.set(name, { name, callback, updatesOn: [] });
        } else {
            const { name, callback, updatesOn = [] } = options;
            this.filters.set(name, callback);
            this.filterOptions.set(name, { name, callback, updatesOn });
        }
    }

    static init() {
        if (!document.getElementById('fx-filter-styles')) {
            const style = document.createElement('style');
            style.id = 'fx-filter-styles';
            style.textContent = `
                @keyframes fx-container-fade {
                    0% { opacity: 0; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }

        if ('CSS' in window && 'registerProperty' in CSS) {
            try {
                CSS.registerProperty({
                    name: '--fx-filter',
                    syntax: '*',
                    inherits: false
                });
            } catch (e) {}
        }

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && !node.classList?.contains('fx-container') && !node.classList?.contains('fx-svg')) {
                            this.observedElements.add(node);
                            node.querySelectorAll?.('*').forEach(el => {
                                if (!el.classList?.contains('fx-container') && !el.classList?.contains('fx-svg')) {
                                    this.observedElements.add(el);
                                }
                            });
                        }
                    });

                    m.removedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            this.observedElements.delete(node);
                        }
                    });
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });

        // initial seed
        document.querySelectorAll('[style*="--fx-filter"],[class]:not(.fx-container):not(.fx-svg)').forEach(el => {
            if (el !== document.body && el !== document.documentElement) {
                this.observedElements.add(el);
            }
        });
        
        if (!this.running) {
            this.running = true;
            this.tick();
        }
    }

    static lastTick = 0;

    static tick(now = 0) {
        const elapsed = now - this.lastTick;

        // cap at ~10fps (100ms)
        if (elapsed >= 100) {
            this.lastTick = now;
            this.scanElements();
        }

        setTimeout(() => requestAnimationFrame((t) => this.tick(t)), 100);
    }

    static observedElements = new Set();

    static scanElements() {
        const toRemove = [];
        const toUpdate = []; // { element, filterValue, parsedFilter }

        // ---- READ PHASE: no DOM writes, just figure out what needs to change ----
        for (const element of this.observedElements) {
            const fxFilter = this.getFxFilterValue(element);
            const storedState = this.elements.get(element);

            if (fxFilter) {
                let parsedFilter;

                if (storedState && storedState.filter === fxFilter && storedState.parsedFilter) {
                    parsedFilter = storedState.parsedFilter;
                } else {
                    parsedFilter = this.parseFilterValue(fxFilter);
                }

                const currentStyles = this.getTrackedStyles(element, fxFilter, parsedFilter);
                const rect = element.getBoundingClientRect();
                currentStyles.set('width', Math.round(rect.width));
                currentStyles.set('height', Math.round(rect.height));

                if (!storedState) {
                    toUpdate.push({ element, filterValue: fxFilter, parsedFilter });
                    this.elements.set(element, {
                        filter: fxFilter,
                        hasContainer: true,
                        trackedStyles: currentStyles,
                        parsedFilter
                    });
                } else if (
                    storedState.filter !== fxFilter ||
                    this.stylesChanged(storedState.trackedStyles, currentStyles)
                ) {
                    toUpdate.push({ element, filterValue: fxFilter, parsedFilter });
                    this.elements.set(element, {
                        filter: fxFilter,
                        hasContainer: true,
                        trackedStyles: currentStyles,
                        parsedFilter
                    });
                }
            } else if (storedState && storedState.hasContainer) {
                toRemove.push(element);
                this.elements.delete(element);
            }
        }

        if (toRemove.length === 0 && toUpdate.length === 0) return;

        // ---- BUILD PHASE: still read-only (rect, computed style, canvas generation) ----
        const built = [];
        for (const { element, filterValue, parsedFilter } of toUpdate) {
            const result = this.buildFxContainer(element, filterValue, parsedFilter);
            if (result) built.push(result);
        }

        // ---- WRITE PHASE: pure DOM mutation, no reads, so nothing forces a reflow ----
        for (const element of toRemove) {
            this.removeFxContainer(element);
        }
        for (const item of built) {
            this.removeFxContainer(item.element);
            this.applyFxContainer(item);
        }
    }

    static buildFxContainer(element, filterValue, parsedFilter) {
        if (element === document.body || element === document.documentElement) return null;

        const width = element.offsetWidth || 0;
        const height = element.offsetHeight || 0;
        if (width >= window.innerWidth * 0.95 && height >= window.innerHeight * 0.95) {
            return null;
        }

        const { orderedFilters } = parsedFilter || this.parseFilterValue(filterValue);
        const filterParts = [];
        let svgContent = '';

        orderedFilters.forEach(item => {
            if (item.type === 'custom') {
                const filter = item.filter;
                const callback = this.filters.get(filter.name);

                if (callback) {
                    const filterContent = callback(element, ...filter.params);

                    if (filterContent && filterContent.trim() !== '') {
                        const filterId = `fx-${filter.name}-${++this.uid}`;
                        svgContent += `<filter id="${filterId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">${filterContent}</filter>`;
                        filterParts.push(`url(#${filterId})`);
                    }
                }
            } else if (item.type === 'css') {
                filterParts.push(item.filter);
            }
        });

        const backdropFilter = filterParts.join(' ');
        if (!backdropFilter.trim()) return null;

        const computedStyle = window.getComputedStyle(element);
        const needsPositionRelative = computedStyle.position === 'static';

        const parentBoxShadow = computedStyle.boxShadow;
        let containerBoxShadow = 'none';
        if (parentBoxShadow && parentBoxShadow !== 'none' && parentBoxShadow.includes('inset')) {
            containerBoxShadow = parentBoxShadow;
        }

        const svgNS = "http://www.w3.org/2000/svg";
        const svgWrapper = document.createElementNS(svgNS, "svg");
        svgWrapper.classList.add('fx-svg');
        svgWrapper.style.cssText = "position:absolute;width:0;height:0;pointer-events:none;";
        svgWrapper.innerHTML = svgContent;

        const containerDiv = document.createElement('div');
        containerDiv.className = 'fx-container';
        containerDiv.style.cssText = `
            position: absolute;
            inset: 0;
            width: 100%;
            height: 100%;
            backdrop-filter: ${backdropFilter};
            -webkit-backdrop-filter: ${backdropFilter};
            background: transparent;
            box-shadow: ${containerBoxShadow};
            pointer-events: none;
            z-index: -1;
            overflow: hidden;
            border-radius: inherit;
            corner-shape: inherit;
        `;

        return { element, svgWrapper, containerDiv, needsPositionRelative };
    }

    static applyFxContainer({ element, svgWrapper, containerDiv, needsPositionRelative }) {
        if (needsPositionRelative) {
            element.style.position = 'relative';
        }
        
        element.appendChild(svgWrapper);
        element.appendChild(containerDiv);
    }

    static removeFxContainer(element) {
        element.querySelectorAll('.fx-container, .fx-svg').forEach(el => el.remove());
    }

    static getFxFilterValue(element) {
        const computed = getComputedStyle(element);
        const value = computed.getPropertyValue('--fx-filter').trim();
        if (!value) return null;

        // Fallback for environments where CSS.registerProperty (inherits: false) is not supported
        if (!('CSS' in window && 'registerProperty' in CSS)) {
            const parent = element.parentElement;
            if (parent && parent.nodeType === 1) {
                const parentValue = getComputedStyle(parent).getPropertyValue('--fx-filter').trim();
                if (value === parentValue) {
                    return null;
                }
            }
        }
        return value;
    }

    static parseFilterValue(filterValue) {
        const orderedFilters = [];
        const customFilters = [];
        const filterRegex = /(\w+(?:-\w+)*)\s*\(([^)]*)\)/g;

        let match;
        while ((match = filterRegex.exec(filterValue)) !== null) {
            const filterName = match[1];
            const params = match[2];

            if (this.filters.has(filterName)) {
                let paramArray = [];
                if (params.trim() !== '') {
                    paramArray = params.split(',').map(p => {
                        const trimmed = p.trim();
                        if (trimmed === '') return undefined;
                        const number = parseFloat(trimmed);
                        return !isNaN(number) ? number : trimmed;
                    }).filter(p => p !== undefined);
                }
                const customFilter = { name: filterName, params: paramArray };
                customFilters.push(customFilter);
                orderedFilters.push({ type: 'custom', filter: customFilter });
            } else {
                orderedFilters.push({ type: 'css', filter: `${filterName}(${params})` });
            }
        }
        return { orderedFilters, customFilters };
    }

    static getTrackedStyles(element, filterValue, parsedFilter) {
        const { customFilters } = parsedFilter || this.parseFilterValue(filterValue);
        const trackedStyles = new Map();

        customFilters.forEach(filter => {
            const filterOptions = this.filterOptions.get(filter.name);
            if (filterOptions && filterOptions.updatesOn) {
                if (!element.__fxComputedCache || performance.now() - element.__fxCacheTime > 200) {
                    element.__fxComputedCache = getComputedStyle(element);
                    element.__fxCacheTime = performance.now();
                }

                const computed = element.__fxComputedCache;
                filterOptions.updatesOn.forEach(styleProp => {
                    const value = computed.getPropertyValue(styleProp);
                    trackedStyles.set(styleProp, value);
                });
            }
        });

        return trackedStyles;
    }

    static stylesChanged(oldStyles, newStyles) {
        if (!oldStyles || !newStyles) return true;
        if (oldStyles.size !== newStyles.size) return true;

        for (const [prop, value] of newStyles) {
            if (oldStyles.get(prop) !== value) {
                return true;
            }
        }
        return false;
    }
}

// Register noise Custom Filter
FxFilter.add({
    name: "noise",
    callback: (element, saturation = 0, intensity = 1, opacity = .25) => {
        const width = element.clientWidth;
        const height = element.clientHeight;

        if (width <= 0 || height <= 0) return '';

        if (
            width >= window.innerWidth * 0.9 &&
            height >= window.innerHeight * 0.9
        ) {
            return '';
        }

        const cacheKey = `${width}x${height}-${saturation}-${intensity}-${opacity}`;

        if (FxFilter.noiseCache.has(cacheKey)) {
            return FxFilter.noiseCache.get(cacheKey);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = false;

        const imageDataAdd = ctx.createImageData(canvas.width, canvas.height);
        const dataAdd = imageDataAdd.data;
        const additiveIntensity = intensity;

        for (let i = 0; i < dataAdd.length; i += 4) {
            const noiseValue1 = Math.random() * additiveIntensity * 255;
            const noiseValue2 = Math.random() * additiveIntensity * 255;
            const noiseValue3 = Math.random() * additiveIntensity * 255;

            const baseNoise = noiseValue1;
            dataAdd[i] = baseNoise * (1 - saturation) + noiseValue1 * saturation;     
            dataAdd[i + 1] = baseNoise * (1 - saturation) + noiseValue2 * saturation; 
            dataAdd[i + 2] = baseNoise * (1 - saturation) + noiseValue3 * saturation; 
            dataAdd[i + 3] = 255 * opacity; 
        }

        ctx.putImageData(imageDataAdd, 0, 0);
        const noiseAdditiveURL = canvas.toDataURL();

        const result = `
            <feImage href="${noiseAdditiveURL}" result="noiseAdd" image-rendering="pixelated"/>
            <feBlend in="SourceGraphic" in2="noiseAdd" mode="overlay" image-rendering="pixelated" result="brightened"/>
        `;

        FxFilter.noiseCache.set(cacheKey, result);

        return result;
    },
    updatesOn: ['width', 'height']
});

// Register glass Custom Filter
FxFilter.add({
    name: "glass",
    callback: (element, refraction = 1, offset = 10, chromatic = 0) => {
        const width = Math.round(element.offsetWidth);
        const height = Math.round(element.offsetHeight);

        if (width <= 0 || height <= 0) return '';

        const maxElementSize = Math.max(width, height);

        // Level of Detail (LOD) for displacement map resolution based on element size
        let maxDimension;
        if (maxElementSize > 800) {
            maxDimension = 128; // LOD Low: high performance on large areas
        } else if (maxElementSize > 400) {
            maxDimension = 192; // LOD Medium
        } else {
            maxDimension = Math.max(32, Math.min(256, Math.ceil(maxElementSize))); // LOD High: high fidelity on small areas
        }

        const scaleFactor = maxElementSize / maxDimension;

        // Adjust refraction to compensate for LOD scaling and maintain consistent visual depth
        const refractionValue = (parseFloat(refraction) / 2 || 0) * Math.sqrt(scaleFactor);
        const chromaticValue = parseFloat(chromatic) || 0;

        const offsetValue = (parseFloat(offset) || 0) / 2;
        const computedStyle = window.getComputedStyle(element);
        const transform = computedStyle.transform;

        const borderRadiusStr = computedStyle.borderRadius || '0';
        let borderRadius = 0;

        if (borderRadiusStr.includes('%')) {
            const percentage = parseFloat(borderRadiusStr);
            const innerElementSize = Math.min(element.offsetWidth, element.offsetHeight);
            borderRadius = (percentage / 100) * innerElementSize;
        } else {
            borderRadius = parseFloat(borderRadiusStr);
        }

        // High-performance Cache Lookup
        const cacheKey = `${width}x${height}-${refraction}-${offset}-${chromatic}-${borderRadius}-${maxDimension}`;
        if (FxFilter.glassCache.has(cacheKey)) {
            return FxFilter.glassCache.get(cacheKey);
        }

        // Parse scale coefficients to detect dynamic zoom/scale operations
        let scale = 1;
        if (transform && transform !== 'none') {
            const matrixMatch = transform.match(/^matrix\(([^)]+)\)$/);
            if (matrixMatch) {
                const vals = matrixMatch[1].split(',').map(parseFloat);
                scale = Math.max(vals[0], vals[3]);
            } else {
                const matrix3dMatch = transform.match(/^matrix3d\(([^)]+)\)$/);
                if (matrix3dMatch) {
                    const vals = matrix3dMatch[1].split(',').map(parseFloat);
                    scale = Math.max(vals[0], vals[5], vals[10]);
                }
            }
        }

        // Apply dynamic brightness scaling when scaled up
        let brightnessFilter = '';
        if (scale > 1.01) {
            const slope = Math.min(3.5, 1 + (scale - 1) * 5.0);
            brightnessFilter = `
                <feComponentTransfer color-interpolation-filters="sRGB">
                    <feFuncR type="linear" slope="${slope}" />
                    <feFuncG type="linear" slope="${slope}" />
                    <feFuncB type="linear" slope="${slope}" />
                </feComponentTransfer>
            `;
        }

        function createDisplacementMap(refractionMod) {
            const adjustedRefraction = refractionValue + refractionMod;
            const imageData = new ImageData(maxDimension, maxDimension);
            const data = imageData.data;

            // Fast typed array baseline allocation
            data.fill(127);
            for (let i = 3; i < data.length; i += 4) {
                data[i] = 255;
            }

            const topOffset = Math.floor(maxDimension / 2);

            // 1. Top Offset Loop (optimized out of inner loop)
            const vyValueTop = 1 * adjustedRefraction;
            for (let y = 0; y < topOffset; y++) {
                const gradientSegment = (topOffset - y) / topOffset;
                const value = Math.max(0, Math.min(255, Math.round(127 + 127 * vyValueTop * gradientSegment)));
                const rowOffset = y * maxDimension * 4;
                for (let x = 0; x < maxDimension; x++) {
                    data[rowOffset + x * 4 + 2] = value;
                }
            }

            // 2. Bottom Offset Loop (optimized out of inner loop)
            const vyValueBottom = -1 * adjustedRefraction;
            for (let y = maxDimension - topOffset; y < maxDimension; y++) {
                const gradientSegment = (y - (maxDimension - topOffset)) / topOffset;
                const value = Math.max(0, Math.min(255, Math.round(127 + 127 * vyValueBottom * gradientSegment)));
                const rowOffset = y * maxDimension * 4;
                for (let x = 0; x < maxDimension; x++) {
                    data[rowOffset + x * 4 + 2] = value;
                }
            }

            // 3. Left Offset Loop (precomputed columns)
            const leftOffset = Math.floor(maxDimension / 2);
            const leftValues = new Uint8Array(leftOffset);
            const vxValueLeft = 1 * adjustedRefraction;
            for (let x = 0; x < leftOffset; x++) {
                const gradientSegment = (leftOffset - x) / leftOffset;
                leftValues[x] = Math.max(0, Math.min(255, Math.round(127 + 127 * vxValueLeft * gradientSegment)));
            }

            for (let y = 0; y < maxDimension; y++) {
                const rowOffset = y * maxDimension * 4;
                for (let x = 0; x < leftOffset; x++) {
                    data[rowOffset + x * 4] = leftValues[x];
                }
            }

            // 4. Right Offset Loop (precomputed columns)
            const rightValues = new Uint8Array(leftOffset);
            const vxValueRight = -1 * adjustedRefraction;
            for (let i = 0; i < leftOffset; i++) {
                const x = maxDimension - leftOffset + i;
                const gradientSegment = (x - (maxDimension - leftOffset)) / leftOffset;
                rightValues[i] = Math.max(0, Math.min(255, Math.round(127 + 127 * vxValueRight * gradientSegment)));
            }

            for (let y = 0; y < maxDimension; y++) {
                const rowOffset = y * maxDimension * 4;
                for (let i = 0; i < leftOffset; i++) {
                    const x = maxDimension - leftOffset + i;
                    data[rowOffset + x * 4] = rightValues[i];
                }
            }
            return imageData;
        }

        function createCanvasFromImageData(imageData) {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = maxDimension;
            tempCanvas.height = maxDimension;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.putImageData(imageData, 0, 0);

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');

            // Scale the generated displacement map to match the element dimensions
            ctx.drawImage(tempCanvas, 0, 0, width, height);
            
            if (borderRadius > 0) {
                const maskCanvas = new OffscreenCanvas(width, height);
                const maskCtx = maskCanvas.getContext('2d');
                maskCtx.fillStyle = "rgb(127, 127, 127)";
                maskCtx.beginPath();
                const inset = offsetValue * 1;
                maskCtx.roundRect(inset, inset, width - (inset * 2), height - (inset * 2), Math.max(0, borderRadius - inset));
                maskCtx.clip();
                maskCtx.fillRect(0, 0, width, height);

                ctx.filter = `blur(${offsetValue}px)`;
                ctx.drawImage(maskCanvas, 0, 0, width, height);
            } else if (offsetValue > 0) {
                ctx.filter = `blur(${offsetValue}px)`;
                ctx.drawImage(canvas, 0, 0);
            }

            const dataURL = canvas.toDataURL();
            canvas.remove();
            return dataURL;
        }

        let result = '';

        if (chromaticValue === 0) {
            const imageData = createDisplacementMap(0);
            const dataURL = createCanvasFromImageData(imageData);
            result = `
                <feImage result="FEIMG" href="${dataURL}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="FEIMG" scale="127" yChannelSelector="B" xChannelSelector="R" color-interpolation-filters="sRGB"/>
                ${brightnessFilter}
            `;
        } else {
            const chromaticOffset = chromaticValue * 0.25;
            const redImageData = createDisplacementMap(chromaticOffset);
            const greenImageData = createDisplacementMap(0);
            const blueImageData = createDisplacementMap(-chromaticOffset);

            const redDataURL = createCanvasFromImageData(redImageData);
            const greenDataURL = createCanvasFromImageData(greenImageData);
            const blueDataURL = createCanvasFromImageData(blueImageData);

            result = `
                <feImage result="redImg" href="${redDataURL}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="redImg" scale="127" yChannelSelector="B" xChannelSelector="R" color-interpolation-filters="sRGB" result="redDisplaced"/>
                <feComponentTransfer in="redDisplaced" result="redChannel">
                    <feFuncR type="identity"/>
                    <feFuncG type="discrete" tableValues="0"/>
                    <feFuncB type="discrete" tableValues="0"/>
                    <feFuncA type="identity"/>
                </feComponentTransfer>
                <feImage result="greenImg" href="${greenDataURL}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="greenImg" scale="127" yChannelSelector="B" xChannelSelector="R" color-interpolation-filters="sRGB" result="greenDisplaced"/>
                <feComponentTransfer in="greenDisplaced" result="greenChannel">
                    <feFuncR type="discrete" tableValues="0"/>
                    <feFuncG type="identity"/>
                    <feFuncB type="discrete" tableValues="0"/>
                    <feFuncA type="identity"/>
                </feComponentTransfer>
                <feImage result="blueImg" href="${blueDataURL}" color-interpolation-filters="sRGB"/>
                <feDisplacementMap in="SourceGraphic" in2="blueImg" scale="127" yChannelSelector="B" xChannelSelector="R" color-interpolation-filters="sRGB" result="blueDisplaced"/>
                <feComponentTransfer in="blueDisplaced" result="blueChannel">
                    <feFuncR type="discrete" tableValues="0"/>
                    <feFuncG type="discrete" tableValues="0"/>
                    <feFuncB type="identity"/>
                    <feFuncA type="identity"/>
                </feComponentTransfer>
                <feComposite in="redChannel" in2="greenChannel" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="redGreen"/>
                <feComposite in="redGreen" in2="blueChannel" operator="arithmetic" k1="0" k2="1" k3="1" k4="0" result="final"/>
                ${brightnessFilter}
            `;
        }

        // Cache the optimized output
        FxFilter.glassCache.set(cacheKey, result);
        return result;
    },
    updatesOn: ['border-radius', 'width', 'height']
});

// Register simple color-overlay Custom Filter
FxFilter.add({
    name: 'color-overlay',
    callback: (element, color = 'black', opacity = 0.5) => {
        const alpha = typeof opacity === 'string' ? parseFloat(opacity) : opacity;
        return `
            <feFlood flood-color="${color}" flood-opacity="${alpha}" result="flood"/>
            <feComposite in="flood" in2="SourceGraphic" operator="atop"/>
        `;
    },
    updatesOn: []
});

FxFilter.init();