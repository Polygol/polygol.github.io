// Ambient Background Noise Generator
const AmbientNoiseGenerator = {
    source: null,
    gainNode: null,
    
    start() {
        this.stop();
        if (!SoundManager.audioCtx) return;
        
        const ctx = SoundManager.audioCtx;
        const bufferSize = 2 * ctx.sampleRate;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        
        const type = localStorage.getItem('ambientMusicSelection') || 'white_noise';
        
        let lastOut = 0.0;
        for (let i = 0; i < bufferSize; i++) {
            const white = Math.random() * 2 - 1;
            if (type === 'rain' || type === 'waves') {
                output[i] = (lastOut + (0.02 * white)) / 1.02;
                lastOut = output[i];
                output[i] *= 3.5; 
            } else {
                output[i] = white * 0.5;
            }
        }
        
        this.source = ctx.createBufferSource();
        this.source.buffer = noiseBuffer;
        this.source.loop = true;
        
        this.gainNode = ctx.createGain();
        const vol = parseInt(localStorage.getItem('ambientMusicVolume') || '50') / 100;
        this.gainNode.gain.value = vol * 0.15; 
        
        this.source.connect(this.gainNode);
        this.gainNode.connect(ctx.destination);
        this.source.start(0);
    },
    
    stop() {
        if (this.source) {
            try { this.source.stop(); } catch(e) {}
            this.source = null;
        }
    },
    
    updateVolume() {
        if (this.gainNode) {
            const vol = parseInt(localStorage.getItem('ambientMusicVolume') || '50') / 100;
            this.gainNode.gain.value = vol * 0.15;
        }
    }
};

window.AmbientNoiseGenerator = AmbientNoiseGenerator;

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('ambientMusicEnabled') === 'true') {
        AmbientNoiseGenerator.start();
    }
});