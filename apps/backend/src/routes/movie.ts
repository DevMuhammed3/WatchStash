import { Router } from 'express';
import { addMovie, getMovies, toggleWatched, deleteMovie } from '../controllers/movie.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createMovieSchema } from '../validations/movie.js';

const router = Router();

router.use(authenticate);

router.post('/', validate(createMovieSchema), addMovie);
router.get('/', getMovies);
router.patch('/:id/toggle-watched', toggleWatched);
router.delete('/:id', deleteMovie);

export default router;
