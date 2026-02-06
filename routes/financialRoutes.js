import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { requirePermission } from '../middleware/rbacMiddleware.js';
import {
  createBudgetCategoryHandler,
  getBudgetCategoriesHandler,
  createBudgetHandler,
  getBudgetHandler,
  createFinancialTransactionHandler,
  getFinancialTransactionsHandler,
  getBudgetVsActualHandler,
  getFinancialSummaryHandler,
  getMonthlyFinancialTrendsHandler,
  getCategorySpendingAnalysisHandler
} from '../controllers/financialController.js';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Budget Categories
router.post('/categories', requirePermission('create_member'), createBudgetCategoryHandler);
router.get('/categories', requirePermission('view_members'), getBudgetCategoriesHandler);

// Budget Management
router.post('/budget', requirePermission('create_member'), createBudgetHandler);
router.get('/budget/:year/:month', requirePermission('view_members'), getBudgetHandler);
router.get('/budget/:year', requirePermission('view_members'), getBudgetHandler);

// Financial Transactions
router.post('/transactions', requirePermission('create_member'), createFinancialTransactionHandler);
router.get('/transactions', requirePermission('view_members'), getFinancialTransactionsHandler);

// Financial Reports and Analytics
router.get('/reports/budget-vs-actual/:year/:month', requirePermission('view_members'), getBudgetVsActualHandler);
router.get('/reports/budget-vs-actual/:year', requirePermission('view_members'), getBudgetVsActualHandler);
router.get('/reports/summary/:year/:month', requirePermission('view_members'), getFinancialSummaryHandler);
router.get('/reports/summary/:year', requirePermission('view_members'), getFinancialSummaryHandler);
router.get('/reports/trends', requirePermission('view_members'), getMonthlyFinancialTrendsHandler);
router.get('/reports/category-analysis/:year/:month', requirePermission('view_members'), getCategorySpendingAnalysisHandler);
router.get('/reports/category-analysis/:year', requirePermission('view_members'), getCategorySpendingAnalysisHandler);

export default router;