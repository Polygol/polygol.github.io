let isDuringFirstSetup = false;

const generateNonsenseNameForSetup = () => {
    const pre = ["Zork", "Bli", "Phro", "Kran", "Velt", "Spli", "Grom", "Twi", "Quar", "Mox"];
    const mid = ["a", "o", "u", "e", "i", "ee", "oo", "ou", "y", "ia"];
    const post = ["nix", "zap", "loid", "tron", "vax", "mutt", "gle", "dax", "kin", "th"];
    const getWord = () => pre[Math.floor(Math.random() * pre.length)] + mid[Math.floor(Math.random() * mid.length)] + post[Math.floor(Math.random() * post.length)];
    return `${getWord()} ${getWord()}`;
};

async function firstSetup() {
    // Generate a permanent device name if it doesn't exist
    if (!localStorage.getItem('system_device_name')) {
        localStorage.setItem('system_device_name', generateNonsenseNameForSetup());
    }

    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    const selectedLanguage = localStorage.getItem('selectedLanguage') || 'EN';
    
    await selectLanguage(selectedLanguage);

    if (!hasVisitedBefore) {
        document.body.classList.add('onboarding-active');
        isDuringFirstSetup = true;

        const splash = document.createElement('div');
        splash.className = 'splash-screen';
        splash.innerHTML = `<svg class="logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 2560"><style>.logo{width:200px;opacity:0;animation:intro 2.2s cubic-bezier(.22,1,.36,1) forwards}.bg{fill:#90d0b3}.mountain{fill:#7a90c9;transform-origin:center;transform:scale(.6) translateY(40px);opacity:0;animation:mountainPop 1.3s cubic-bezier(.2,1.3,.64,1) .25s forwards}.stroke{fill:none;stroke:#ebf1bc;stroke-linecap:round;stroke-linejoin:round;stroke-width:400;stroke-dasharray:2000;stroke-dashoffset:2000;opacity:0;animation:draw 1.2s cubic-bezier(.65,0,.35,1) .45s forwards,strokeFade .4s ease-out .45s forwards}@keyframes intro{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}@keyframes mountainPop{0%{transform:scale(.6) translateY(40px);opacity:0}70%{transform:scale(.9) translateY(-6px);opacity:1}100%{transform:scale(1) translateY(0);opacity:1}}@keyframes draw{0%{stroke-dashoffset:2000}80%{stroke-dashoffset:-100}100%{stroke-dashoffset:0}}@keyframes strokeFade{from{opacity:0}to{opacity:1}}</style><path class="bg" d="M1280 0C573 0 0 573 0 1280s573 1280 1280 1280h526c416 0 754-338 754-754V1280C2560 573 1987 0 1280 0"./><path class="mountain" d="m1143 1160-303 456c-268 404 22 944 506 944h606c484 0 774-540 506-944l-303-456c-240-362-772-362-1012 0Z"./><path class="stroke" d="M550 1150c0-332 268-600 600-600"./></svg>`;
        document.body.appendChild(splash);

        setTimeout(() => {
            splash.style.opacity = '0';
            splash.style.filter = 'blur(10px)';
            splash.style.pointerEvents = 'none';
            setTimeout(() => {
                splash.remove();
            }, 5000);
        }, 4000);
        
        // Register Airy temporarily if it's not in the main apps list yet
        if (typeof apps === 'undefined') window.apps = {};
        apps['Airy'] = { url: './assets/gurapp/intl/airy/index.html', icon: 'airy.png' };

        // Launch Airy as the setup environment
        createFullscreenEmbed('./assets/gurapp/intl/airy/index.html');

        // Listen for completion
        const onOnboardingComplete = (event) => {
            if (event.data && event.data.type === 'onboarding-complete') {
                window.removeEventListener('message', onOnboardingComplete);
                document.body.classList.remove('onboarding-active');
                localStorage.setItem('hasVisitedBefore', 'true');
                window.allowPageLeave = true;
                window.location.reload();
            }
        };
        window.addEventListener('message', onOnboardingComplete);
    }
}