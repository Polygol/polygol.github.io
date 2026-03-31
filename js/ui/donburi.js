function openDonburi() {
    const disabledSys = JSON.parse(localStorage.getItem('disabledSystemComponents') || '[]');
	if (disabledSys.includes('Donburi')) {
		document.querySelector('#donburi-container')?.remove();
		return;
	}
	
	const donburi = document.getElementById('donburi-container');
	if (!donburi) return;
	
	donburi.style.display = 'block';
	donburi.style.pointerEvents = 'none'; // Disable during transition
	donburi.style.opacity = '1';
	
	requestAnimationFrame(() => {
		donburi.classList.add('open');
		donburi.style.transform = 'translateY(0)';
		donburi.style.contentVisibility = 'auto';
	});

	// Enable interaction only after the gesture is fully complete
	setTimeout(() => {
		if (donburi.classList.contains('open')) donburi.style.pointerEvents = 'auto';
		HomeActivityManager.updateVisibility();
	}, 400);

	// Hide Home UI and system handles
	document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid, .drawer-handle, #dynamic-area, #split-screen-trigger, #one-button-nav-handle').forEach(el => {
		el.style.opacity = '0';
		el.style.pointerEvents = 'none';
		setTimeout(() => el.classList.add('force-hide'), 300);
	});
}

window.closeDonburi = function() {
	const donburi = document.getElementById('donburi-container');
	if (!donburi) return;

	donburi.classList.remove('open');
	donburi.style.transform = 'translateY(-100%)';

	// Restore Home UI and system handles
	document.querySelectorAll('.container, .settings-grid.home-settings, .widget-grid, .drawer-handle, #dynamic-area, #split-screen-trigger, #one-button-nav-handle').forEach(el => {
		el.classList.remove('force-hide');
		el.style.display = el.dataset.originalDisplay || '';
		el.style.pointerEvents = ''; // Restore pointer events
		requestAnimationFrame(() => el.style.opacity = '1');
	});

	setTimeout(() => {
		if (!donburi.classList.contains('open')) {
		    donburi.style.contentVisibility = 'none';
		    donburi.style.display = 'none';
			HomeActivityManager.updateVisibility();
		}
	}, 400);
	
};