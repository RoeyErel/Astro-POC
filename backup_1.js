import sweph from 'sweph';
import path from 'path';
import asyncHandler from 'express-async-handler';
import ephemeris from 'ephemeris';

// Set the path to the ephemeris files
const ephemerisPath = path.resolve('./ephe/');
sweph.set_ephe_path(ephemerisPath);

/**
 * Determines the zodiac sign based on a given longitude.
 * @param {number} longitude - The longitude of the celestial body.
 * @returns {string|null} The zodiac sign corresponding to the longitude, or null if invalid.
 */
const getZodiacSign = (() => {
	const cache = {};
	const signs = ['טלה', 'שור', 'תאומים', 'סרטן', 'אריה', 'בתולה', 'מאזניים', 'עקרב', 'קשת', 'גדי', 'דלי', 'דגים'];

	return (longitude) => {
		if (cache[longitude] !== undefined) return cache[longitude];
		const index = Math.floor(longitude / 30);
		const sign = signs[index] || null;
		cache[longitude] = sign;
		return sign;
	};
})();

/**
 * Formats a number into degrees, minutes, and seconds.
 * @param {number} decimalDegrees - The decimal degrees to format.
 * @returns {string} The formatted DMS string.
 */
function formatDMS(decimalDegrees) {
	const degrees = Math.floor(decimalDegrees);
	const minutes = Math.floor((decimalDegrees % 1) * 60);
	const seconds = ((((decimalDegrees % 1) * 60) % 1) * 60).toFixed(2);
	return `${degrees}°${minutes}'${seconds}"`;
}

/**
 * Determines whether the chart is a day chart (if the Sun is above the Ascendant).
 * @param {number} sunLongitude - The longitude of the Sun.
 * @param {number} ascendantLongitude - The longitude of the Ascendant.
 * @returns {boolean} True if it's a day chart, otherwise false.
 */
function isADayChart(sunLongitude, ascendantLongitude) {
	const descendantLongitude = (ascendantLongitude + 180) % 360;
	return sunLongitude >= ascendantLongitude && sunLongitude <= descendantLongitude;
}

/**
 * Computes the Vertex using Swiss Ephemeris.
 * @param {number} julianDay - The Julian Day calculated from the given date and time.
 * @param {number} latitude - Latitude of the observer's location.
 * @param {number} longitude - Longitude of the observer's location.
 * @returns {number} The ecliptic longitude of the Vertex in degrees.
 */
function computeVertex(julianDay, latitude, longitude) {
	// Get the obliquity of the ecliptic
	const obliquityResult = sweph.calc_ut(julianDay, sweph.constants.SE_ECL_NUT, sweph.constants.SEFLG_SWIEPH);
	const obliquity = obliquityResult.data[0] * (Math.PI / 180); // Convert to radians

	// Calculate sidereal time in degrees
	const gst = sweph.sidtime(julianDay + sweph.deltat(julianDay)); // Greenwich Sidereal Time (GST)

	// Convert GST to Local Sidereal Time (LST)
	const lst = (gst + longitude / 15) % 24; // LST in hours

	// Convert LST to degrees (1 hour = 15 degrees)
	const ramc = (lst * 15) % 360; // RAMC in degrees

	// Convert RAMC to radians
	const ramcRad = ramc * (Math.PI / 180);

	// Convert latitude to radians
	const latRad = latitude * (Math.PI / 180);

	// Calculate the cotangent of latitude
	const cotL = 1 / Math.tan(latRad);

	// Calculate the Vertex using the corrected formula
	const vxNumerator = Math.cos(ramcRad);
	const vxDenominator = Math.sin(obliquity) * cotL - Math.cos(obliquity) * Math.sin(ramcRad);

	// Corrected atan2 calculation for proper quadrant determination
	let vertexLongitude = Math.atan2(vxNumerator, vxDenominator) * (180 / Math.PI); // Convert result back to degrees

	// Normalize the Vertex to the 0-360 degree range
	if (vertexLongitude < 0) {
		vertexLongitude += 360;
	}

	return (vertexLongitude + 180) % 360; // Adjust to get the correct quadrant for Vertex
}

/**
 * Processes a result from sweph.calc_ut or sweph.houses to extract the longitude and calculate the DMS format and zodiac sign.
 * @param {Object} result - Result object from sweph calculation.
 * @param {string} pointName - Name of the celestial point.
 * @returns {Object|null} Processed data for the point, or null if an error occurred.
 */
function processSwephResult(result, pointName) {
	if (!result || (result.flag !== 0 && result.flag !== 2)) return null;
	const longitude = result.data[0];
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
 * Calculates the Midheaven (MC) using Swiss Ephemeris.
 * @param {number} julianDay - The Julian Day calculated from the given date and time.
 * @param {number} latitude - Latitude of the observer's location.
 * @param {number} longitude - Longitude of the observer's location.
 * @returns {number} The ecliptic longitude of the MC in degrees.
 */
function calculateMC(julianDay, longitude) {
	const gst = sweph.sidtime(julianDay + sweph.deltat(julianDay)); // Greenwich Sidereal Time (GST)
	const lst = (gst + longitude / 15) % 24; // LST in hours
	const ramc = (lst * 15) % 360; // RAMC in degrees
	const obliquityResult = sweph.calc_ut(julianDay, sweph.constants.SE_ECL_NUT, 0);
	const obliquity = obliquityResult.data[0] * (Math.PI / 180); // Convert to radians
	const mcRad = Math.atan2(Math.sin(ramc * (Math.PI / 180)), Math.cos(ramc * (Math.PI / 180)) * Math.cos(obliquity)) * (180 / Math.PI);

	return (mcRad + 360) % 360; // Ensure the value is between 0 and 360 degrees
}

/**
 * Computes additional celestial points (AC, MC, Vertex, Fortune).
 * @param {number} julianDay - The Julian Day calculated from the given date and time.
 * @param {number} latitude - Latitude of the observer's location.
 * @param {number} longitude - Longitude of the observer's location.
 * @param {Object} result - The result from the planetary calculations.
 * @returns {Promise<Object>} Additional points data including AC, MC, Vertex, etc.
 */
async function computeAdditionalPoints(julianDay, latitude, longitude, result) {
	const additionalPoints = {};
	const pointsCalculations = [
		{ key: 'lilith', code: sweph.constants.SE_MEAN_APOG },
		{ key: 'northNode', code: sweph.constants.SE_TRUE_NODE },
		{ key: 'AC', code: sweph.constants.SE_ASC },
		{ key: 'MC', code: sweph.constants.SE_MC },
		{ key: 'vertex', code: sweph.constants.SE_VERTEX }
	];

	for (const point of pointsCalculations) {
		try {
			const result = sweph.calc_ut(julianDay, point.code, sweph.constants.SEFLG_SWIEPH);
			const processedResult = processSwephResult(result, point.key);
			if (processedResult) Object.assign(additionalPoints, processedResult);
		} catch (err) {
			console.error(`Error calculating ${point.key}:`, err);
		}
	}
	console.log("julian day: ", julianDay);
	console.log("AC code: ", sweph.constants.SE_ASC);
	console.log("Calculation flag: ", sweph.constants.SEFLG_SWIEPH);

	const test = sweph.calc_ut(julianDay, sweph.constants.SE_MOON, sweph.constants.SEFLG_SWIEPH);
	console.log("AC result: ", test);
	
	// Calculate Vertex using computeVertex function
	const vertexLongitude = computeVertex(julianDay, latitude, longitude);
	additionalPoints['vertex'] = {
		apparentLongitudeDms30: formatDMS(vertexLongitude % 30),
		apparentLongitudeDms360: formatDMS(vertexLongitude),
		apparentLongitudeDd: vertexLongitude,
		zodiacSign: getZodiacSign(vertexLongitude)
	};

	// Proper calculation for MC
	const mc = calculateMC(julianDay, longitude);
	additionalPoints['MC'] = {
		apparentLongitudeDms30: formatDMS(mc % 30),
		apparentLongitudeDms360: formatDMS(mc),
		apparentLongitudeDd: mc,
		zodiacSign: getZodiacSign(mc)
	};

	// Calculate Part of Fortune (Fortuna)
	if (additionalPoints['AC'] && additionalPoints['MC']) {
		const ascendant = additionalPoints['AC'].apparentLongitudeDd;
		const mc = additionalPoints['MC'].apparentLongitudeDd;
		const moonLongitude = result.observed.moon.raw.position.apparentLongitude;
		const sunLongitude = result.observed.sun.raw.position.apparentLongitude;

		const isDayChart = isADayChart(sunLongitude, ascendant);

		let fortuneLongitude = isDayChart ? (ascendant + moonLongitude - sunLongitude) % 360 : (ascendant - moonLongitude + sunLongitude) % 360;
		if (fortuneLongitude < 0) fortuneLongitude += 360;

		additionalPoints['Fortune'] = {
			apparentLongitudeDms30: formatDMS(fortuneLongitude % 30),
			apparentLongitudeDms360: formatDMS(fortuneLongitude),
			apparentLongitudeDd: fortuneLongitude,
			zodiacSign: getZodiacSign(fortuneLongitude)
		};
	} else {
		console.error('Error: Missing necessary data (AC, MC, Moon, Sun) for calculating Part of Fortune.');
	}

	return additionalPoints;
}



/**
 * Extracts and processes planetary data for a given date, location (city and country).
 * @param {Object} req - Express request object containing the input data.
 * @param {Object} res - Express response object for sending the response.
 * @returns {Promise<Object>} Filtered and enriched planet data with additional points.
 */
const getDate = asyncHandler(async (req, res) => {
	const { year, month, day, hour, minute = 0, country, city } = req.body;

	if (!year || !month || !day || !country || !city || !hour) {
		res.status(400).json({ message: 'Please fill all the fields' });
		return;
	}

	const userDate = new Date(year, month - 1, day, hour - 2, minute);
	const julianDay = sweph.utc_to_jd(year, month, day, (hour-2), minute, 0, sweph.constants.SE_GREG_CAL).data[0];
	const result = ephemeris.getAllPlanets(userDate, 34.855499, 32.109333, 0);

	let filteredResult = filterPlanetData(result.observed);

	const additionalPoints = await computeAdditionalPoints(julianDay, 32.0853, 34.781769, result);
	filteredResult = { ...filteredResult, ...additionalPoints };

	return filteredResult;
});

/**
 * Filters out unnecessary celestial bodies from the planet data and enriches it with zodiac signs.
 * @param {Object} planetData - The raw data of celestial bodies.
 * @returns {Object} Filtered and enriched planet data.
 */
function filterPlanetData(planetData) {
	const filteredData = {};

	for (const planetName in planetData) {
		if (planetData.hasOwnProperty(planetName) && planetName !== 'sirius') {
			const { apparentLongitudeDms30, apparentLongitudeDms360, apparentLongitudeDd } = planetData[planetName];
			const zodiacSign = getZodiacSign(apparentLongitudeDd);

			filteredData[planetName] = {
				apparentLongitudeDms30,
				apparentLongitudeDms360,
				apparentLongitudeDd,
				zodiacSign
			};
		}
	}

	return filteredData;
}

/**
 * Creates an astrology birth map enriched with zodiac signs.
 * @param {Object} planetData - Data containing planetary positions.
 * @returns {Object} A structured birth map with detailed planetary data and zodiac signs.
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
 * Main controller function handling birth map calculation requests.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
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
