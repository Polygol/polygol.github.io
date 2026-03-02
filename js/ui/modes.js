function updateMinimalMode() {
    if (minimalMode) {
        // Add minimal-active class to body for potential CSS styling
        document.body.classList.add('minimal-active');
    } else {
        // Remove minimal-active class
        document.body.classList.remove('minimal-active');
    }
}

    // Function to update night mode icon
    function updateNightModeIcon(isNightMode) {
        // Get the control element directly inside this function
        const nightModeControl = document.getElementById('night-mode-qc');
        if (!nightModeControl) return;

        const nightModeIcon = nightModeControl.querySelector('.material-symbols-rounded');
        if (!nightModeIcon) return;
        
        if (isNightMode) {
            nightModeIcon.textContent = 'moon_stars'; // Active icon
        } else {
            nightModeIcon.textContent = 'bedtime'; // Default icon
        }

		updateStatusIndicator();
    }

function updateNightMode() {
    const nightModeControl = document.getElementById('night-mode-qc');
    if (!nightModeControl) return;

    // Toggle all visual states based on the global nightMode variable
    document.body.classList.toggle('night-mode-active', nightMode);
    nightModeControl.classList.toggle('active', nightMode);
    updateNightModeIcon(nightMode);
}