import sweph from 'sweph';
import path from 'path';
import asyncHandler from 'express-async-handler';
import moment from 'moment-timezone';

// Set the path to the ephemeris files
const ephemerisPath = path.resolve('./ephe/');
sweph.set_ephe_path(ephemerisPath);

/**
 * Function to determine the zodiac sign based on longitude
 */
const getZodiacSign = (() => {
	const cache = {};
	const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];

	return (longitude) => {
		if (cache[longitude] !== undefined) return cache[longitude];
		const index = Math.floor(longitude / 30) % 12; // Ensure index is between 0-11
		const sign = signs[index] || null;
		cache[longitude] = sign;
		return sign;
	};
})();

/**
 * Function to format decimal degrees into DMS (degrees, minutes, seconds)
 */
function formatDMS(decimalDegrees) {
	const degrees = Math.floor(decimalDegrees);
	const minutes = Math.floor((decimalDegrees % 1) * 60);
	const seconds = ((((decimalDegrees % 1) * 60) % 1) * 60).toFixed(2);
	return `${degrees}°${minutes}'${seconds}"`;
}

/**
 * Function to determine if the chart is a day chart
 */
function isDayChart(sunLongitude, ascendantLongitude) {
	const descendantLongitude = (ascendantLongitude + 180) % 360;
	return (sunLongitude >= ascendantLongitude && sunLongitude <= descendantLongitude) || (sunLongitude + 360 >= ascendantLongitude && sunLongitude + 360 <= descendantLongitude + 360);
}

/**
 * Function to process results from sweph.calc_ut
 */
function processSwephResult(result, pointName) {
	if (!result || result.error) {
		console.error(`Error calculating ${pointName}:`, result ? result.error : 'Unknown error');
		return null;
	}
	let longitude = result.data[0];

	// Subtract one degree from the North Node's longitude
	if (pointName === 'node') {
		longitude = (longitude + 360) % 360; // Ensure longitude stays within 0-360 degrees
	}

	return {
		[pointName]: {
			apparentLongitudeDms30: formatDMS(longitude % 30),
			apparentLongitudeDms360: formatDMS(longitude),
			apparentLongitudeDd: longitude,
			zodiacSign: getZodiacSign(longitude)
		}
	};
}

/**
 * Function to compute additional points (including planets)
 */
async function computeAdditionalPoints(julianDay, latitude, longitude) {
	const additionalPoints = {};

	// Calculate houses to get Ascendant (AC) and Midheaven (MC)
	const housesResult = sweph.houses(julianDay, latitude, longitude, 'P'); // 'P' for Placidus house system

	if (housesResult.error) {
		console.error('Error calculating houses:', housesResult.error);
	} else {
		const acLongitude = housesResult.data.points[0];
		const mcLongitude = housesResult.data.points[1];
		const vertexLongitude = housesResult.data.points[3];

		additionalPoints['AC'] = {
			apparentLongitudeDms30: formatDMS(acLongitude % 30),
			apparentLongitudeDms360: formatDMS(acLongitude),
			apparentLongitudeDd: acLongitude,
			zodiacSign: getZodiacSign(acLongitude)
		};

		additionalPoints['MC'] = {
			apparentLongitudeDms30: formatDMS(mcLongitude % 30),
			apparentLongitudeDms360: formatDMS(mcLongitude),
			apparentLongitudeDd: mcLongitude,
			zodiacSign: getZodiacSign(mcLongitude)
		};

		additionalPoints['Vertex'] = {
			apparentLongitudeDms30: formatDMS(vertexLongitude % 30),
			apparentLongitudeDms360: formatDMS(vertexLongitude),
			apparentLongitudeDd: vertexLongitude,
			zodiacSign: getZodiacSign(vertexLongitude)
		};
	}

	// List of planets and points to calculate
	const pointsCalculations = [
		{ key: 'sun', code: sweph.constants.SE_SUN },
		{ key: 'moon', code: sweph.constants.SE_MOON },
		{ key: 'mercury', code: sweph.constants.SE_MERCURY },
		{ key: 'venus', code: sweph.constants.SE_VENUS },
		{ key: 'mars', code: sweph.constants.SE_MARS },
		{ key: 'jupiter', code: sweph.constants.SE_JUPITER },
		{ key: 'saturn', code: sweph.constants.SE_SATURN },
		{ key: 'uranus', code: sweph.constants.SE_URANUS },
		{ key: 'neptune', code: sweph.constants.SE_NEPTUNE },
		{ key: 'pluto', code: sweph.constants.SE_PLUTO },
		{ key: 'node', code: sweph.constants.SE_TRUE_NODE }, // True Node
		{ key: 'lilith', code: sweph.constants.SE_MEAN_APOG }, // Lilith
		{ key: 'chiron', code: sweph.constants.SE_CHIRON },
		{ key: 'fortune', code: 'FORTUNE' } // Part of Fortune will be calculated manually
	];

	// Calculate planets and points
	for (const point of pointsCalculations) {
		try {
			if (point.key === 'fortune') {
				// Calculate Part of Fortune
				if (additionalPoints['AC'] && additionalPoints['sun'] && additionalPoints['moon']) {
					const ascendant = additionalPoints['AC'].apparentLongitudeDd;
					const sunLongitude = additionalPoints['sun'].apparentLongitudeDd;
					const moonLongitude = additionalPoints['moon'].apparentLongitudeDd;

					const isDay = isDayChart(sunLongitude, ascendant);

					let fortuneLongitude;
					if (!isDay) {
						fortuneLongitude = (ascendant + moonLongitude - sunLongitude + 360) % 360;
					} else {
						fortuneLongitude = (ascendant - moonLongitude + sunLongitude + 360) % 360;
					}

					additionalPoints['fortune'] = {
						apparentLongitudeDms30: formatDMS(fortuneLongitude % 30),
						apparentLongitudeDms360: formatDMS(fortuneLongitude),
						apparentLongitudeDd: fortuneLongitude,
						zodiacSign: getZodiacSign(fortuneLongitude)
					};
				} else {
					console.error('Error: Missing necessary data (AC, Sun, Moon) for calculating Part of Fortune.');
				}
			} else {
				// Calculate planets using sweph.calc_ut
				const calcResult = sweph.calc_ut(julianDay, point.code, sweph.constants.SEFLG_SWIEPH);
				const processedResult = processSwephResult(calcResult, point.key);
				if (processedResult) Object.assign(additionalPoints, processedResult);
			}
		} catch (err) {
			console.error(`Error calculating ${point.key}:`, err);
		}
	}

	return additionalPoints;
}

/**
 * Function to get the date and data
 */
const getDate = asyncHandler(async (req, res) => {
	const { year, month, day, hour, minute = 0, country, city } = req.body;

	if (!year || !month || !day || !country || !city || hour === undefined) {
		res.status(400).json({ message: 'Please fill all the fields' });
		return;
	}

	// Use the coordinates of Tel Aviv
	const latitude = 32.0853;
	const longitude = 34.7818;

	// Use the time zone of Tel Aviv
	const timeZone = 'Asia/Jerusalem';

	// Create a moment object with the local time in Tel Aviv
	const localTime = moment.tz(
		{
			year: Number(year),
			month: Number(month) - 1, // moment months are 0-indexed
			day: Number(day),
			hour: Number(hour),
			minute: Number(minute),
			second: 0
		},
		timeZone
	);

	// Convert local time to UT
	const utTime = localTime.clone().tz('UTC');

	// Extract UT components
	const utYear = utTime.year();
	const utMonth = utTime.month() + 1; // moment months are 0-indexed
	const utDay = utTime.date();
	const utHourDecimal = utTime.hour() + utTime.minute() / 60 + utTime.second() / 3600;
	console.log('Time:', utYear, '/', utMonth, '/', utDay, '/', utHourDecimal);

	// Calculate Julian Day
	const julianDay = sweph.utc_to_jd(utYear, utMonth, utDay, utHourDecimal, minute, 0, sweph.constants.SE_GREG_CAL).data[0];

	// Compute all planets and points using computeAdditionalPoints
	const allPoints = await computeAdditionalPoints(julianDay, latitude, longitude);

	return allPoints;
});

/**
 * Function to create the astrology birth map
 */
function createAstrologyBirthMap(planetData) {
	const birthMap = {};
	for (const planet in planetData) {
		if (planetData.hasOwnProperty(planet)) {
			const { apparentLongitudeDms30, apparentLongitudeDms360, apparentLongitudeDd, zodiacSign } = planetData[planet];

			birthMap[planet] = {
				long30: apparentLongitudeDms30,
				long360: apparentLongitudeDms360,
				longDd: apparentLongitudeDd,
				zodiacSign
			};
		}
	}

	return birthMap;
}

/**
 * Main controller function
 */
export const birthMapController = asyncHandler(async (req, res) => {
	try {
		const data = await getDate(req, res);
		const newData = createAstrologyBirthMap(data);
		res.json(newData);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});
