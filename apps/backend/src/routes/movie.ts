import { Router } from 'express';
import { addMovie, getMovies, toggleWatched, deleteMovie } from '../controllers/movie.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createMovieSchema, movieParamsSchema } from '../validations/movie.js';
import { paginationQuerySchema } from '../validations/common.js';

const router: Router = Router();

router.use(authenticate);

router.post('/', validate(createMovieSchema), addMovie);
router.get('/', validate(paginationQuerySchema, 'query'), getMovies);
router.patch('/:id/toggle-watched', validate(movieParamsSchema, 'params'), toggleWatched);
router.delete('/:id', validate(movieParamsSchema, 'params'), deleteMovie);

export default router;
