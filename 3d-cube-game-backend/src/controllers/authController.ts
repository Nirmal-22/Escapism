import { NextFunction, Request, Response } from 'express';
import {
  SESSION_COOKIE,
  SESSION_TTL_MS,
  SessionPlayer,
  bestScoreFor,
  buildAuthUrl,
  completeGoogleSignIn,
  createSessionToken,
  googleAuthEnabled,
  loginWithPassword,
  passwordAuthEnabled,
  readSession,
  signupWithPassword
} from '../services/authService';

function redirectUri(req: Request): string {
  // APP_URL wins if set; otherwise derive from the request
  // (app.set('trust proxy') makes req.protocol correct behind Vercel's proxy).
  const base = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  return `${base}/api/auth/google/callback`;
}

class AuthController {
  private setSessionCookie(req: Request, res: Response, player: SessionPlayer): void {
    res.cookie(SESSION_COOKIE, createSessionToken(player), {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.protocol === 'https',
      maxAge: SESSION_TTL_MS,
      path: '/'
    });
  }

  public googleStart = (req: Request, res: Response): void => {
    if (!googleAuthEnabled()) {
      res.status(503).json({ error: 'Google sign-in is not configured on this server' });
      return;
    }
    res.redirect(buildAuthUrl(redirectUri(req)));
  };

  public googleCallback = async (req: Request, res: Response): Promise<void> => {
    if (!googleAuthEnabled()) {
      res.redirect('/?auth_failed=1');
      return;
    }
    try {
      const player = await completeGoogleSignIn(String(req.query.code || ''), req.query.state, redirectUri(req));
      this.setSessionCookie(req, res, player);
      res.redirect('/');
    } catch (err) {
      console.error('Google OAuth callback failed:', err);
      res.redirect('/?auth_failed=1');
    }
  };

  public signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password, name } = req.body ?? {};
      const player = await signupWithPassword(email, password, name);
      this.setSessionCookie(req, res, player);
      res.status(201).json({ signedIn: true, name: player.name, best: 0 });
    } catch (err) {
      next(err);
    }
  };

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { email, password } = req.body ?? {};
      const player = await loginWithPassword(email, password);
      this.setSessionCookie(req, res, player);
      let best = 0;
      try {
        best = await bestScoreFor(player.id);
      } catch {
        // DB hiccup on the best lookup shouldn't fail the login
      }
      res.json({ signedIn: true, name: player.name, best });
    } catch (err) {
      next(err);
    }
  };

  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const session = readSession(req.cookies?.[SESSION_COOKIE]);
      const methods = { google: googleAuthEnabled(), password: passwordAuthEnabled() };
      if (!session) {
        res.json({ ...methods, signedIn: false });
        return;
      }
      let best = 0;
      try {
        best = await bestScoreFor(session.id);
      } catch {
        // DB unreachable — still report the signed-in identity
      }
      res.json({ ...methods, signedIn: true, name: session.name, best });
    } catch (err) {
      next(err);
    }
  };

  public logout = (_req: Request, res: Response): void => {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  };
}

export default AuthController;
