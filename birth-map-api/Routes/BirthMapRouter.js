import express from 'express';
import * as birthMapControllers from '../controllers/birthMapController.js';

const router = express.Router();

// Route that returns birth map data
router.post('/birth-map', birthMapControllers.birthMapController);

export default router;
