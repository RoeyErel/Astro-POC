import React, { useState } from 'react';
import { TbZodiacAries, TbZodiacTaurus, TbZodiacGemini, TbZodiacCancer, TbZodiacLeo, TbZodiacVirgo, TbZodiacLibra, TbZodiacScorpio, TbZodiacSagittarius, TbZodiacCapricorn, TbZodiacAquarius, TbZodiacPisces } from 'react-icons/tb';

function App() {
	const [form, setForm] = useState({ year: '', month: '', day: '', hour: '', minute: '', country: '', city: '' });
	const [results, setResults] = useState(null);
	const [error, setError] = useState(null);

	const handleSubmit = async (e) => {
		e.preventDefault();
		setError(null);
		try {
			if (!form.year || !form.month || !form.day || !form.hour || !form.minute || !form.country || !form.city) {
				setError('All fields are required.');
				return;
			}

			const response = await fetch('https://astro-map.guardian-tech.co.il/api/birth-map', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					year: Number(form.year),
					month: Number(form.month),
					day: Number(form.day),
					hour: Number(form.hour),
					minute: Number(form.minute),
					country: form.country,
					city: form.city
				})
			});

			if (!response.ok) {
				const errorData = await response.json();
				setError(`Server Error: ${errorData.message}`);
				return;
			}

			const data = await response.json();
			console.log(data);

			setResults(data);
		} catch (err) {
			console.error('Error:', err);
			setError('An unexpected error occurred. Please try again.');
		}
	};

	const handleInput = (e) => {
		setForm({
			...form,
			[e.target.name]: e.target.value
		});
	};

	// Define the desired order of planets and points
	const orderedPlanets = [
		'sun',
		'moon',
		'mercury',
		'venus',
		'mars',
		'jupiter',
		'saturn',
		'uranus',
		'neptune',
		'pluto',
		'node', // Assuming 'node' corresponds to 'North Node' or 'ראש דרקון'
		'lilith',
		'chiron',
		'AC',
		'MC',
		'Vertex',
		'fortune'
	];

	// Update planetIcons keys to match the results keys exactly
	const planetIcons = {
		sun: '☀️',
		moon: '🌙',
		mercury: '☿️',
		venus: '♀️',
		mars: '♂️',
		jupiter: '♃',
		saturn: '♄',
		uranus: '♅',
		neptune: '♆',
		pluto: '♇',
		chiron: '⚷',
		lilith: '⚸',
		node: '☊', // North Node
		fortune: '⚷',
		Vertex: '⛛',
		AC: '⬈', // Ascendant
		MC: '⬆️' // Midheaven
	};

	const zodiacIcons = {
		Aries: <TbZodiacAries />,
		Taurus: <TbZodiacTaurus />,
		Gemini: <TbZodiacGemini />,
		Cancer: <TbZodiacCancer />,
		Leo: <TbZodiacLeo />,
		Virgo: <TbZodiacVirgo />,
		Libra: <TbZodiacLibra />,
		Scorpio: <TbZodiacScorpio />,
		Sagittarius: <TbZodiacSagittarius />,
		Capricorn: <TbZodiacCapricorn />,
		Aquarius: <TbZodiacAquarius />,
		Pisces: <TbZodiacPisces />
	};

	// Function to capitalize and format planet names
	function formatPlanetName(name) {
		const planetNames = {
			sun: 'Sun',
			moon: 'Moon',
			mercury: 'Mercury',
			venus: 'Venus',
			mars: 'Mars',
			jupiter: 'Jupiter',
			saturn: 'Saturn',
			uranus: 'Uranus',
			neptune: 'Neptune',
			pluto: 'Pluto',
			node: 'North Node',
			lilith: 'Lilith',
			chiron: 'Chiron',
			AC: 'AC',
			MC: 'MC',
			Vertex: 'Vertex',
			fortune: 'Fortune'
		};
		return planetNames[name] || name;
	}

	return (
		<div className='min-w-full h-full flex flex-col justify-center items-center py-8 bg-gray-100'>
			<form onSubmit={handleSubmit} className='flex flex-col justify-center items-center bg-white shadow-md rounded-lg px-8 py-6 border border-gray-200'>
				<h1 className='text-2xl font-bold text-gray-700 mb-4'>Submit Birth Data</h1>
				{error && <p className='text-red-500 mb-4'>{error}</p>}
				<input type='number' className='my-2 w-full rounded-md px-4 py-2 border border-gray-300' onChange={handleInput} name='year' placeholder='Year' />
				<input type='number' className='my-2 w-full rounded-md px-4 py-2 border border-gray-300' onChange={handleInput} name='month' placeholder='Month' />
				<input type='number' className='my-2 w-full rounded-md px-4 py-2 border border-gray-300' onChange={handleInput} name='day' placeholder='Day' />
				<input type='number' className='my-2 w-full rounded-md px-4 py-2 border border-gray-300' onChange={handleInput} name='hour' placeholder='Hour' />
				<input type='number' className='my-2 w-full rounded-md px-4 py-2 border border-gray-300' onChange={handleInput} name='minute' placeholder='Minute' />
				<input className='my-2 w-full rounded-md px-4 py-2 border border-gray-300' onChange={handleInput} name='country' placeholder='Country' />
				<input className='my-2 w-full rounded-md px-4 py-2 border border-gray-300' onChange={handleInput} name='city' placeholder='City' />
				<input type='submit' value='Submit' className='my-2 px-6 py-2 bg-blue-500 text-white rounded-md' />
			</form>

			{results && (
				<div id='results' className='mt-8 w-full max-w-3xl p-6 bg-white rounded-lg shadow-lg border border-gray-200'>
					<h2 className='text-xl font-bold text-gray-800 mb-4'>Planets and Points</h2>
					<ul className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						{orderedPlanets.map((planet) => {
							const data = results[planet];
							if (!data) return null; // Skip if data is not available
							return (
								<li key={planet} className='flex items-start p-4 bg-gray-50 rounded-md border border-gray-200'>
									<span className='mr-4 text-2xl'>{planetIcons[planet]}</span>
									<div className='flex flex-col'>
										<span className='font-semibold text-lg text-gray-700'>
											{formatPlanetName(planet)} {data.long30}
										</span>
										<div className='flex items-center mt-1 text-sm text-gray-600'>
											<span className='mr-2 text-2xl'>{zodiacIcons[data.zodiacSign]}</span>
											<span className='font-bold text-lg'>{data.zodiacSign}</span>
										</div>
									</div>
								</li>
							);
						})}
					</ul>
				</div>
			)}
		</div>
	);
}

export default App;
