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
        
        // Register Airy temporarily if it's not in the main apps list yet
        if (typeof apps === 'undefined') window.apps = {};
        apps['Airy'] = { url: '/assets/gurapp/intl/airy/index.html', icon: 'airy.png' };

        // Launch Airy as the setup environment
        createFullscreenEmbed('/assets/gurapp/intl/airy/index.html');

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