import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { login } from './auth';

import companiesRouter from './routes/companies';
import productsRouter from './routes/products';
import documentsRouter from './routes/documents';
import expensesRouter from './routes/expenses';
import paymentsRouter from './routes/payments';
import resetRouter from './routes/reset';
import statsRouter from './routes/stats';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
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

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
