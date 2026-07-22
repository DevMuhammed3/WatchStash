import { Router } from 'express';
import { addMovie, getMovies, toggleWatched, deleteMovie } from '../controllers/movie';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { createMovieSchema } from '../validations/movie';

const router = Router();

router.use(authenticate);

router.post('/', validate(createMovieSchema), addMovie);
router.get('/', getMovies);
router.patch('/:id/toggle-watched', toggleWatched);
router.delete('/:id', deleteMovie);

export default router;
