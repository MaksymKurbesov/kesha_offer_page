
function popupOpen() {
	const popup = document.querySelector('.popup')
	if (!popup) return

	setTimeout(() => {
		document.body.classList.add('popup-open')
		const closeButton = document.querySelector('.popup__close')
		if (closeButton) {
			closeButton.addEventListener('click', () => {
				document.body.classList.remove('popup-open')
			})
		}
	}, 80)
}
function initActions() {
	const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
	const scratchCards = document.querySelectorAll('.scratch-card');
	const popupText = document.querySelector('.popup__text');
	const popupBtn = document.querySelector('.popup__btn');
	let activeCard = null;

	scratchCards.forEach(scratchCard => {
		const canvas = scratchCard.querySelector('.scratch-card-canvas');
		const scratchCardCover = scratchCard.querySelector('.scratch-card-cover');
		const scratchCardCanvasRender = scratchCard.querySelector('.scratch-card-canvas-render');

		if (!canvas) {
			console.error('Canvas element not found in scratch card');
			return;
		}

		const context = canvas.getContext('2d');
		let isPointerDown = false;
		let positionX;
		let positionY;
		let clearDetectionTimeout = null;

		const devicePixelRatio = window.devicePixelRatio || 1;

		canvas.width = canvas.offsetWidth * devicePixelRatio;
		canvas.height = canvas.offsetHeight * devicePixelRatio;

		context.scale(devicePixelRatio, devicePixelRatio);

		if (isSafari) {
			canvas.classList.add('hidden');
		}

		canvas.addEventListener('pointerdown', (e) => {
			if (activeCard && activeCard !== scratchCard) {
				return; // Ignore if another card is active
			}

			activeCard = scratchCard;
			scratchCards.forEach(card => {
				if (card !== activeCard) {
					// card.style.pointerEvents = 'none';
					card.classList.add('remove-action')
				}
			});

			if (scratchCardCover) scratchCardCover.classList.remove('shine');
			({ x: positionX, y: positionY } = getPosition(e, canvas));
			clearTimeout(clearDetectionTimeout);

			const plot = (e) => {
				const { x, y } = getPosition(e, canvas);
				plotLine(context, positionX, positionY, x, y);
				positionX = x;
				positionY = y;
				if (isSafari && scratchCardCanvasRender) {
					clearTimeout(setImageTimeout);
					setImageTimeout = setTimeout(() => {
						setImageFromCanvas(canvas, scratchCardCanvasRender);
					}, 5);
				}
			};

			canvas.addEventListener('pointermove', plot);

			window.addEventListener('pointerup', (e) => {
				canvas.removeEventListener('pointermove', plot);
				clearDetectionTimeout = setTimeout(() => {
					checkBlackFillPercentage(context, canvas.width, canvas.height, scratchCard);
				}, 500);
			}, { once: true });
		});
	});

	function getPosition(e, canvas) {
		const { left, top } = canvas.getBoundingClientRect();
		return {
			x: e.clientX - left,
			y: e.clientY - top,
		};
	}

	function plotLine(context, x1, y1, x2, y2) {
		var diffX = Math.abs(x2 - x1);
		var diffY = Math.abs(y2 - y1);
		var dist = Math.sqrt(diffX * diffX + diffY * diffY);
		var step = dist / 50;
		var i = 0;
		var t;
		var x;
		var y;

		while (i < dist) {
			t = Math.min(1, i / dist);
			x = x1 + (x2 - x1) * t;
			y = y1 + (y2 - y1) * t;
			context.beginPath();
			context.arc(x, y, 16, 0, Math.PI * 2);
			context.fill();
			i += step;
		}
	}

	function setImageFromCanvas(canvas, scratchCardCanvasRender) {
		canvas.toBlob((blob) => {
			const url = URL.createObjectURL(blob);
			const previousUrl = scratchCardCanvasRender.src;
			scratchCardCanvasRender.src = url;
			if (!previousUrl) {
				scratchCardCanvasRender.classList.remove('hidden');
			} else {
				URL.revokeObjectURL(previousUrl);
			}
		});
	}

	function checkBlackFillPercentage(context, canvasWidth, canvasHeight, scratchCard) {
		const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
		const pixelData = imageData.data;

		let blackPixelCount = 0;

		for (let i = 0; i < pixelData.length; i += 4) {
			const red = pixelData[i];
			const green = pixelData[i + 1];
			const blue = pixelData[i + 2];
			const alpha = pixelData[i + 3];

			if (red === 0 && green === 0 && blue === 0 && alpha === 255) {
				blackPixelCount++;
			}
		}

		const blackFillPercentage = blackPixelCount * 100 / (canvasWidth * canvasHeight);

		if (blackFillPercentage >= 45) {
			revealPrize(scratchCard);
		}
	}

	function revealPrize(scratchCard) {
		const scratchCardCoverContainer = scratchCard.querySelector('.scratch-card-cover-container');
		if (scratchCardCoverContainer) scratchCardCoverContainer.classList.add('clear');

		if (typeof confetti === 'function') {
			confetti({
				particleCount: 100,
				spread: 90,
				origin: { y: 0.6 }
			});
		} else {
			console.warn('Confetti function is not available');
		}

		if (popupText) popupText.textContent = 'You got a $1000!';
		if (popupBtn) popupBtn.style.display = 'block';

		const prizeElement = scratchCard.querySelector('.scratch-card-prize');
		if (prizeElement) prizeElement.classList.add('animate');

		if (scratchCardCoverContainer) {
			scratchCardCoverContainer.addEventListener('transitionend', () => {
				scratchCardCoverContainer.classList.add('hidden');
			}, { once: true });
		}
	}
}

// Загрузка библиотеки canvas-confetti
function loadConfetti() {
	return new Promise((resolve, reject) => {
		const script = document.createElement('script');
		script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js';
		script.onload = resolve;
		script.onerror = reject;
		document.head.appendChild(script);
	});
}

window.onload = async () => {
	popupOpen()
	try {
		await loadConfetti();
		console.log('Confetti library loaded successfully');
	} catch (error) {
		console.error('Failed to load confetti library:', error);
	}
	initActions();
}
