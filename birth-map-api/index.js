import express from 'express';
import dotenv from 'dotenv';
import birthMapRoute from './Routes/BirthMapRouter.js';
import cors from 'cors';
// d
dotenv.config();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
	cors({
		origin: 'http://localhost:5173' // Allow only your React app's origin
	})
);

// Use the birthMapRoute for /api paths
app.use('/api', birthMapRoute);

// Root route
app.get('/', (req, res) => {
	res.send('Server Is Running');
});

// Error handling middleware
app.use((err, req, res, next) => {
	console.error(err.stack);
	res.status(500).send('Something went wrong!');
});

// Start the server
app.listen(process.env.PORT || 6001, () => {
	console.log('Backend Connected.');
});
