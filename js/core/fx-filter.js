class FxFilter {
    static elements = new WeakMap();
    static filters = new Map();
    static filterOptions = new Map();
    static running = false;
    static noiseCache = new Map();
    static glassCache = new Map();
    static uid = 0;
    static hasRegisteredProperty = false;
    static resizeObserver = new ResizeObserver(entries => {
        for (const entry of entries) {
            FxFilter.markDirty(entry.target);
        }
    });

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
                this.hasRegisteredProperty = true;
            } catch (e) {}
        }

        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // If a style or link element is dynamically added, re-evaluate existing observed elements
                            if (node.tagName === 'STYLE' || node.tagName === 'LINK') {
                                for (const el of this.observedElements) {
                                    this.markDirty(el);
                                }
                            } else if (!node.classList?.contains('fx-container') && !node.classList?.contains('fx-svg')) {
                                this.observeElement(node);
                                const treeWalker = document.createTreeWalker(
                                    node,
                                    NodeFilter.SHOW_ELEMENT
                                );

                                let current;
                                while ((current = treeWalker.nextNode())) {
                                    if (!current.classList?.contains('fx-container') && !current.classList?.contains('fx-svg')) {
                                        this.observeElement(current);
                                    }
                                }
                            }
                        }
                    });

                    m.removedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            this.observedElements.delete(node);
                            this.resizeObserver.unobserve(node);
                            const descendants = node.querySelectorAll('*');
                            descendants.forEach(child => {
                                this.observedElements.delete(child);
                                this.resizeObserver.unobserve(child);
                            });
                        }
                    });
                } else if (m.type === 'attributes') {
                    this.markDirty(m.target);
                }
            }
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
                'class',
                'style'
            ]
        });

        // initial seed: scan stylesheets for selectors defining --fx-filter to capture unclassed static elements
        try {
            for (const sheet of document.styleSheets) {
                let rules;
                try {
                    rules = sheet.cssRules || sheet.rules;
                } catch (e) {
                    continue; // Skip cross-origin stylesheets (CORS)
                }
                if (!rules) continue;
                for (const rule of rules) {
                    if (rule.cssText && rule.cssText.includes('--fx-filter') && rule.selectorText) {
                        document.querySelectorAll(rule.selectorText).forEach(el => {
                            if (el !== document.body && el !== document.documentElement) {
                                this.observeElement(el);
                            }
                        });
                    }
                }
            }
        } catch (e) {}

        // Supplementary scan to catch inline styles, controls, and other potential targets
        document.querySelectorAll('[style*="--fx-filter"],[class]:not(.fx-container):not(.fx-svg),input,select,button,iframe').forEach(el => {
            if (el !== document.body && el !== document.documentElement) {
                this.observeElement(el);
            }
        });
        
        if (!this.running) {
            this.running = true;
        }
    }

    static dirtyElements = new Set();
    static updateScheduled = false;

    static markDirty(element) {
        if (!element || element.nodeType !== 1) return;

        this.dirtyElements.add(element);

        if (!this.updateScheduled) {
            this.updateScheduled = true;

            requestAnimationFrame(() => {
                this.updateScheduled = false;
                this.scanDirtyElements();
            });
        }
    }

    static observeElement(element) {
        if (
            !element ||
            element === document.body ||
            element === document.documentElement
        ) {
            return;
        }

        this.observedElements.add(element);
        this.resizeObserver.observe(element);
        this.markDirty(element);
    }

    static observedElements = new Set();

    static scanDirtyElements() {
        if (this.dirtyElements.size === 0) return;

        const elements = [...this.dirtyElements];
        this.dirtyElements.clear();

        for (const element of elements) {
            this.updateElement(element);
        }
    }

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
                
                // Only trigger expensive layout reads if the active filter specifically tracks dimension changes
                const hasSizeTracking = parsedFilter?.customFilters?.some(f => {
                    const opt = this.filterOptions.get(f.name);
                    return opt && opt.updatesOn && (opt.updatesOn.includes('width') || opt.updatesOn.includes('height'));
                });

                if (hasSizeTracking || !storedState) {
                    const rect = element.getBoundingClientRect();
                    currentStyles.set('width', Math.round(rect.width));
                    currentStyles.set('height', Math.round(rect.height));
                } else if (storedState) {
                    currentStyles.set('width', storedState.trackedStyles.get('width'));
                    currentStyles.set('height', storedState.trackedStyles.get('height'));
                }

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

    static updateElement(element) {
        if (
            !element ||
            element === document.body ||
            element === document.documentElement
        ) {
            return;
        }

        const computed = getComputedStyle(element);

        const fxFilter = this.getFxFilterValue(
            element,
            computed
        );

        const storedState = this.elements.get(element);

        if (!fxFilter) {
            if (storedState) {
                this.removeFxContainer(element);
                this.elements.delete(element);
            }
            return;
        }

        const parsedFilter =
            storedState?.filter === fxFilter
                ? storedState.parsedFilter
                : this.parseFilterValue(fxFilter);

        if (!this.observedElements.has(element)) {
            this.observedElements.add(element);
            this.resizeObserver.observe(element);
        }

        const trackedStyles = this.getTrackedStyles(
            element,
            fxFilter,
            parsedFilter,
            computed
        );

        if (
            storedState &&
            storedState.filter === fxFilter &&
            !this.stylesChanged(
                storedState.trackedStyles,
                trackedStyles
            )
        ) {
            return;
        }

        const built = this.buildFxContainer(
            element,
            fxFilter,
            parsedFilter,
            computed // Performance optimization: Feed 'computed' to prevent redundantly calling it inside building process
        );

        // Required Cleanup Check: If container skipped build due to sizing (display: none/shrunk), 
        // we must clear its history mapping. Missing this skips rebuild evaluations later.
        if (!built) {
            if (storedState) {
                this.removeFxContainer(element);
                this.elements.delete(element);
            }
            return;
        }

        this.removeFxContainer(element);
        this.applyFxContainer(built);

        this.elements.set(element, {
            filter: fxFilter,
            parsedFilter,
            trackedStyles,
            svgWrapper: built.svgWrapper
        });
    }

    static buildFxContainer(element, filterValue, parsedFilter, computed) {
        const comp = computed || getComputedStyle(element);
        const value = comp.getPropertyValue('--fx-filter').trim();
        if (!value || value === 'none' || value.includes('none ')) return null;

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

        const svgNS = "http://www.w3.org/2000/svg";
        const svgWrapper = document.createElementNS(svgNS, "svg");
        svgWrapper.classList.add('fx-svg');
        svgWrapper.style.cssText = "position:absolute;width:0;height:0;pointer-events:none;";
        svgWrapper.innerHTML = svgContent;

        return { element, svgWrapper, backdropFilter };
    }

    static applyFxContainer({ element, svgWrapper, backdropFilter }) {
        element.appendChild(svgWrapper);
        element.style.backdropFilter = backdropFilter;
        element.style.webkitBackdropFilter = backdropFilter;
    }

    static removeFxContainer(element) {
        const state = this.elements.get(element);

        state?.svgWrapper?.remove();
        element.style.removeProperty('backdrop-filter');
        element.style.removeProperty('-webkit-backdrop-filter');
    }

    static getFxFilterValue(element, computed) {
        const comp = computed || getComputedStyle(element);
        const value = comp.getPropertyValue('--fx-filter').trim();
        if (!value || value === 'none' || value.includes('none ')) return null;

        // Fallback for environments where CSS.registerProperty (inherits: false) is not supported or failed
        if (!this.hasRegisteredProperty) {
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

    static getTrackedStyles(element, filterValue, parsedFilter, computed) {
        const comp = computed || getComputedStyle(element);
        const value = comp.getPropertyValue('--fx-filter').trim();
        if (!value || value === 'none' || value.includes('none ')) return null;
        const { customFilters } = parsedFilter || this.parseFilterValue(filterValue);
        const trackedStyles = new Map();

        customFilters.forEach(filter => {
            const filterOptions = this.filterOptions.get(filter.name);
            if (filterOptions && filterOptions.updatesOn) {
                if (!element.__fxComputedCache || performance.now() - element.__fxCacheTime > 200) {
                    element.__fxComputedCache = comp;
                    element.__fxCacheTime = performance.now();
                }

                const cachedComp = element.__fxComputedCache;
                filterOptions.updatesOn.forEach(styleProp => {
                    let val;
                    // For static layout bounds (fixed dimensions in CSS) caching dimension variables tricks 
                    // visibility changes into bypassing redraws. Direct layout dimensions are guaranteed to match visually. 
                    if (styleProp === 'width') {
                        val = element.offsetWidth;
                    } else if (styleProp === 'height') {
                        val = element.offsetHeight;
                    } else {
                        val = cachedComp.getPropertyValue(styleProp);
                    }
                    trackedStyles.set(styleProp, val);
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
        const cssWidth = element.clientWidth;
        const cssHeight = element.clientHeight;

        if (cssWidth <= 0 || cssHeight <= 0) return '';

        if (
            cssWidth >= window.innerWidth * 0.9 &&
            cssHeight >= window.innerHeight * 0.9
        ) {
            return '';
        }

        const zoom = parseFloat(document.body.style.zoom) / 100 || 1;
        const width = Math.max(1, Math.round(cssWidth * zoom));
        const height = Math.max(1, Math.round(cssHeight * zoom));

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
        
        const mult = intensity * 255;
        const invSat = 1 - saturation;
        const alpha = 255 * opacity;

        for (let i = 0; i < dataAdd.length; i += 4) {
            const noiseValue1 = Math.random() * mult;
            const noiseValue2 = Math.random() * mult;
            const noiseValue3 = Math.random() * mult;

            dataAdd[i] = noiseValue1;     
            dataAdd[i + 1] = noiseValue1 * invSat + noiseValue2 * saturation; 
            dataAdd[i + 2] = noiseValue1 * invSat + noiseValue3 * saturation; 
            dataAdd[i + 3] = alpha; 
        }

        ctx.putImageData(imageDataAdd, 0, 0);
        const noiseAdditiveURL = canvas.toDataURL();

        const result = `
            <feImage href="${noiseAdditiveURL}" result="noiseAdd" image-rendering="pixelated"/>
            <feBlend in="SourceGraphic" in2="noiseAdd" mode="overlay" image-rendering="pixelated" result="brightened"/>
        `;

        FxFilter.noiseCache.set(cacheKey, result);
        if (FxFilter.noiseCache.size > 50) {
            FxFilter.noiseCache.delete(FxFilter.noiseCache.keys().next().value);
        }

        return result;
    },
    updatesOn: ['width', 'height']
});

// Register glass Custom Filter
FxFilter.add({
    name: "glass",
    callback: (element, refraction = 1, offset = 10, chromatic = 0) => {
        const offsetWidth = element.offsetWidth;
        const offsetHeight = element.offsetHeight;

        if (offsetWidth <= 0 || offsetHeight <= 0) return '';

        const zoom = parseFloat(document.body.style.zoom) / 100 || 1;
        const width = Math.max(1, Math.round(offsetWidth * zoom));
        const height = Math.max(1, Math.round(offsetHeight * zoom));

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

        const effectiveSize = Math.sqrt(width * height);
        const scaleFactor = effectiveSize / maxDimension;

        // Adjust refraction to compensate for LOD scaling and maintain consistent visual depth
        const refractionValue = (parseFloat(refraction) / 2 || 0) * Math.sqrt(Math.max(1, scaleFactor));
        const chromaticValue = parseFloat(chromatic) || 0;

        const offsetValue = ((parseFloat(offset) || 0) / 2) * zoom;
        const computedStyle = window.getComputedStyle(element);
        const transform = computedStyle.transform;

        const borderRadiusStr = computedStyle.borderRadius || '0';
        let borderRadius = 0;

        if (borderRadiusStr.includes('%')) {
            const percentage = parseFloat(borderRadiusStr);
            const innerElementSize = Math.min(width, height);
            borderRadius = (percentage / 100) * innerElementSize;
        } else {
            borderRadius = parseFloat(borderRadiusStr) * zoom;
        }
        borderRadius = Math.min(borderRadius, Math.min(width, height) / 2);

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

            // Downscale final rendering resolution since it is already blurred anyway
            const downscale = 4;
            const renderWidth = Math.max(8, Math.round(width / downscale));
            const renderHeight = Math.max(8, Math.round(height / downscale));
            const renderBorderRadius = borderRadius / downscale;
            const renderOffsetValue = offsetValue / downscale;

            const canvas = document.createElement('canvas');
            canvas.width = renderWidth;
            canvas.height = renderHeight;
            const ctx = canvas.getContext('2d');

            // Scale the generated displacement map to match the downscaled dimensions
            ctx.drawImage(tempCanvas, 0, 0, renderWidth, renderHeight);
            
            if (renderBorderRadius > 0) {
                const maskCanvas = new OffscreenCanvas(renderWidth, renderHeight);
                const maskCtx = maskCanvas.getContext('2d');
                maskCtx.fillStyle = "rgb(127, 127, 127)";
                maskCtx.beginPath();
                const inset = renderOffsetValue * 1;
                maskCtx.roundRect(inset, inset, renderWidth - (inset * 2), renderHeight - (inset * 2), Math.max(0, renderBorderRadius - inset));
                maskCtx.clip();
                maskCtx.fillRect(0, 0, renderWidth, renderHeight);

                ctx.filter = `blur(${renderOffsetValue}px)`;
                ctx.drawImage(maskCanvas, 0, 0, renderWidth, renderHeight);
            } else if (renderOffsetValue > 0) {
                ctx.filter = `blur(${renderOffsetValue}px)`;
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
            `;
        }

        // Cache the optimized output
        FxFilter.glassCache.set(cacheKey, result);
        if (FxFilter.glassCache.size > 50) {
            FxFilter.glassCache.delete(FxFilter.glassCache.keys().next().value);
        }
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

window.addEventListener('resize', () => {
    for (const element of FxFilter.observedElements) {
        FxFilter.markDirty(element);
    }
});

FxFilter.init();