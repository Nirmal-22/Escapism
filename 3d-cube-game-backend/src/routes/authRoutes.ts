import { Router } from 'express';
import AuthController from '../controllers/authController';

const router = Router();
const authController = new AuthController();

// GET /api/auth/google — redirect to Google's consent screen
router.get('/google', authController.googleStart);

// GET /api/auth/google/callback — exchange code, upsert player, set session cookie
router.get('/google/callback', authController.googleCallback);

// POST /api/auth/signup — { email, password, name? } → account + session cookie
router.post('/signup', authController.signup);

// POST /api/auth/login — { email, password } → session cookie
router.post('/login', authController.login);

// GET /api/auth/me — { google, password, signedIn, name?, best? }
router.get('/me', authController.me);

// POST /api/auth/logout — clear the session cookie
router.post('/logout', authController.logout);

export default router;
