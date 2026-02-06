import * as model from '../models/financialModel.js';
import * as memberModel from '../models/memberModel.js';
import { handleError } from '../utils/errorHandler.js';

// Budget Categories CRUD
export async function createBudgetCategoryHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const categoryData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const category = await model.createBudgetCategory(categoryData);
    res.status(201).json({
      message: 'Budget category created successfully',
      category
    });
  } catch (err) {
    return handleError(res, 'createBudgetCategoryHandler', err);
  }
}

export async function getBudgetCategoriesHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const categoryType = req.query.category_type;

    const categories = await model.getBudgetCategories(churchId, categoryType);
    res.json(categories);
  } catch (err) {
    return handleError(res, 'getBudgetCategoriesHandler', err);
  }
}

// Budget CRUD
export async function createBudgetHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const creatorId = member ? member.id : null;

    const budgetData = {
      ...req.body,
      church_id: churchId,
      created_by: creatorId
    };

    const budget = await model.createBudget(budgetData);
    res.status(201).json({
      message: 'Budget created successfully',
      budget
    });
  } catch (err) {
    return handleError(res, 'createBudgetHandler', err);
  }
}

export async function getBudgetHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const year = parseInt(req.params.year);
    const month = req.params.month ? parseInt(req.params.month) : null;

    const budget = await model.getBudget(churchId, year, month);
    res.json(budget);
  } catch (err) {
    return handleError(res, 'getBudgetHandler', err);
  }
}

// Financial Transactions CRUD
export async function createFinancialTransactionHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const member = await memberModel.getMemberByUserId(req.user.userId, churchId);
    const recorderId = member ? member.id : null;

    const transactionData = {
      ...req.body,
      church_id: churchId,
      recorded_by: recorderId
    };

    const transaction = await model.createFinancialTransaction(transactionData);
    res.status(201).json({
      message: 'Financial transaction recorded successfully',
      transaction
    });
  } catch (err) {
    return handleError(res, 'createFinancialTransactionHandler', err);
  }
}

export async function getFinancialTransactionsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const filters = {
      transaction_type: req.query.transaction_type,
      category_id: req.query.category_id ? parseInt(req.query.category_id) : undefined,
      date_from: req.query.date_from,
      date_to: req.query.date_to,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    };

    const transactions = await model.getFinancialTransactions(churchId, filters);
    res.json(transactions);
  } catch (err) {
    return handleError(res, 'getFinancialTransactionsHandler', err);
  }
}

// Financial Reports and Analytics
export async function getBudgetVsActualHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const year = parseInt(req.params.year);
    const month = req.params.month ? parseInt(req.params.month) : null;

    const budgetVsActual = await model.getBudgetVsActual(churchId, year, month);
    res.json(budgetVsActual);
  } catch (err) {
    return handleError(res, 'getBudgetVsActualHandler', err);
  }
}

export async function getFinancialSummaryHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const year = parseInt(req.params.year);
    const month = req.params.month ? parseInt(req.params.month) : null;

    const summary = await model.getFinancialSummary(churchId, year, month);
    res.json(summary);
  } catch (err) {
    return handleError(res, 'getFinancialSummaryHandler', err);
  }
}

export async function getMonthlyFinancialTrendsHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const months = req.query.months ? parseInt(req.query.months) : 12;

    const trends = await model.getMonthlyFinancialTrends(churchId, months);
    res.json(trends);
  } catch (err) {
    return handleError(res, 'getMonthlyFinancialTrendsHandler', err);
  }
}

export async function getCategorySpendingAnalysisHandler(req, res) {
  try {
    const churchId = req.user?.church_id || 1;
    const year = parseInt(req.params.year);
    const month = req.params.month ? parseInt(req.params.month) : null;

    const analysis = await model.getCategorySpendingAnalysis(churchId, year, month);
    res.json(analysis);
  } catch (err) {
    return handleError(res, 'getCategorySpendingAnalysisHandler', err);
  }
}