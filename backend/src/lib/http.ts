import { Request, Response, NextFunction, RequestHandler } from 'express';

// Évite de répéter try/catch(err) { res.status(500)... } dans chaque route.
// Les erreurs remontent au middleware global d'erreurs de server.ts (pas de détail de l'erreur exposé au client).
export const asyncHandler = (fn: RequestHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export const paginate = (req: Request) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};
