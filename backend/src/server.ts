import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import { login } from './auth';

import companiesRouter from './routes/companies';
import productsRouter from './routes/products';
import documentsRouter from './routes/documents';
import expensesRouter from './routes/expenses';
import paymentsRouter from './routes/payments';
import resetRouter from './routes/reset';
import statsRouter from './routes/stats';
import usersRouter from './routes/users';
import stockRouter from './routes/stock';

const app = express();

// Middleware
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: allowedOrigins.length > 0 ? allowedOrigins : true,
  credentials: true
}));
app.use(express.json());

// Routes de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KTM CRM API is running' });
});

// Authentification
app.post('/api/login', login);

// Routes de l'API
app.use('/api/companies', companiesRouter);
app.use('/api/products', productsRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/reset', resetRouter);
app.use('/api/stats', statsRouter);
app.use('/api/users', usersRouter);
app.use('/api/stock', stockRouter);

// Middleware global d'erreurs (doit rester en dernier)
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erreur non gérée:', err);
  res.status(500).json({ error: 'Erreur interne du serveur.' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
