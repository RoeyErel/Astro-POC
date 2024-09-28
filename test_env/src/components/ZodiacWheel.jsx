import React, { useRef, useEffect } from 'react';

const ZodiacWheel = ({ planets = [] }) => {
	const canvasRef = useRef(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext('2d');
		const width = canvas.width;
		const height = canvas.height;
		const centerX = width / 2;
		const centerY = height / 2;
		const radius = Math.min(width, height) / 2 - 20;

		const zodiacSigns = ['טלה', 'שור', 'תאומים', 'סרטן', 'אריה', 'בתולה', 'מאזניים', 'עקרב', 'קשת', 'גדי', 'דלי', 'דגים'];
		const signAngles = zodiacSigns.map((_, index) => index * 30 * (Math.PI / 180)); // 30 degrees for each sign

		// Draw the zodiac wheel
		const drawZodiacWheel = () => {
			ctx.clearRect(0, 0, width, height);

			// Draw outer circle
			ctx.strokeStyle = '#000';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
			ctx.stroke();

			// Draw zodiac signs and lines
			zodiacSigns.forEach((sign, index) => {
				const angle = signAngles[index];
				const x = centerX + radius * Math.cos(angle);
				const y = centerY + radius * Math.sin(angle);

				// Draw lines between signs
				ctx.beginPath();
				ctx.moveTo(centerX, centerY);
				ctx.lineTo(x, y);
				ctx.stroke();

				// Add zodiac sign labels
				const textX = centerX + (radius - 40) * Math.cos(angle + 15 * (Math.PI / 180));
				const textY = centerY + (radius - 40) * Math.sin(angle + 15 * (Math.PI / 180));
				ctx.fillText(sign, textX, textY);
			});
		};

		// Draw planets on the wheel based on their longitude
		const drawPlanets = (planets) => {
			if (!planets || planets.length === 0) return;

			planets.forEach((planet) => {
				// Convert planet's longitude from degrees to radians
				const angle = ((planet.longitude - 90) * Math.PI) / 180;
				const x = centerX + (radius - 50) * Math.cos(angle);
				const y = centerY + (radius - 50) * Math.sin(angle);

				// Draw the planet's position
				ctx.beginPath();
				ctx.arc(x, y, 5, 0, Math.PI * 2);
				ctx.fillStyle = planet.color || 'black';
				ctx.fill();

				// Add planet's name
				ctx.fillText(planet.name, x + 10, y + 5);
			});
		};

		drawZodiacWheel();
		drawPlanets(planets);
	}, [planets]);

	return <canvas ref={canvasRef} width={500} height={500} />;
};

export default ZodiacWheel;
