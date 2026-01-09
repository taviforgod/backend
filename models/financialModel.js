import db from '../config/db.js';

// Budget Categories CRUD
export async function createBudgetCategory(data) {
  const {
    church_id,
    category_name,
    category_type,
    parent_category_id,
    description,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO budget_categories (
      church_id, category_name, category_type, parent_category_id,
      description, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
  `, [church_id, category_name, category_type, parent_category_id, description, created_by]);

  return result.rows[0];
}

export async function getBudgetCategories(churchId, categoryType = null) {
  let query = `
    SELECT
      bc.*,
      pbc.category_name as parent_category_name,
      cb.first_name as created_by_first_name, cb.surname as created_by_surname
    FROM budget_categories bc
    LEFT JOIN budget_categories pbc ON bc.parent_category_id = pbc.id
    LEFT JOIN members cb ON bc.created_by = cb.id
    WHERE bc.church_id = $1 AND bc.is_active = TRUE
  `;

  const params = [churchId];

  if (categoryType) {
    query += ` AND bc.category_type = $2`;
    params.push(categoryType);
  }

  query += ` ORDER BY bc.category_type ASC, bc.category_name ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

// Budget CRUD
export async function createBudget(data) {
  const {
    church_id,
    budget_year,
    budget_month,
    category_id,
    budgeted_amount,
    budget_type,
    description,
    approved_by,
    created_by
  } = data;

  const result = await db.query(`
    INSERT INTO church_budget (
      church_id, budget_year, budget_month, category_id, budgeted_amount,
      budget_type, description, approved_by, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *
  `, [
    church_id, budget_year, budget_month, category_id, budgeted_amount,
    budget_type, description, approved_by, created_by
  ]);

  return result.rows[0];
}

export async function getBudget(churchId, year, month = null) {
  let query = `
    SELECT
      cb.*,
      bc.category_name, bc.category_type,
      ab.first_name as approved_by_first_name, ab.surname as approved_by_surname
    FROM church_budget cb
    JOIN budget_categories bc ON cb.category_id = bc.id
    LEFT JOIN members ab ON cb.approved_by = ab.id
    WHERE cb.church_id = $1 AND cb.budget_year = $2
  `;

  const params = [churchId, year];

  if (month !== null) {
    query += ` AND cb.budget_month = $3`;
    params.push(month);
  }

  query += ` ORDER BY bc.category_type ASC, bc.category_name ASC`;

  const result = await db.query(query, params);
  return result.rows;
}

// Financial Transactions CRUD
export async function createFinancialTransaction(data) {
  const {
    church_id,
    transaction_date,
    transaction_type,
    category_id,
    amount,
    currency,
    description,
    vendor_supplier,
    invoice_number,
    payment_method,
    giving_log_id,
    member_id,
    recorded_by,
    approved_by
  } = data;

  const result = await db.query(`
    INSERT INTO financial_transactions (
      church_id, transaction_date, transaction_type, category_id, amount,
      currency, description, vendor_supplier, invoice_number, payment_method,
      giving_log_id, member_id, recorded_by, approved_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING *
  `, [
    church_id, transaction_date, transaction_type, category_id, amount,
    currency, description, vendor_supplier, invoice_number, payment_method,
    giving_log_id, member_id, recorded_by, approved_by
  ]);

  return result.rows[0];
}

export async function getFinancialTransactions(churchId, filters = {}) {
  let query = `
    SELECT
      ft.*,
      bc.category_name, bc.category_type,
      m.first_name, m.surname,
      rb.first_name as recorded_by_first_name, rb.surname as recorded_by_surname
    FROM financial_transactions ft
    LEFT JOIN budget_categories bc ON ft.category_id = bc.id
    LEFT JOIN members m ON ft.member_id = m.id
    LEFT JOIN members rb ON ft.recorded_by = rb.id
    WHERE ft.church_id = $1
  `;

  const params = [churchId];
  let paramIndex = 2;

  if (filters.transaction_type) {
    query += ` AND ft.transaction_type = $${paramIndex}`;
    params.push(filters.transaction_type);
    paramIndex++;
  }

  if (filters.category_id) {
    query += ` AND ft.category_id = $${paramIndex}`;
    params.push(filters.category_id);
    paramIndex++;
  }

  if (filters.date_from) {
    query += ` AND ft.transaction_date >= $${paramIndex}`;
    params.push(filters.date_from);
    paramIndex++;
  }

  if (filters.date_to) {
    query += ` AND ft.transaction_date <= $${paramIndex}`;
    params.push(filters.date_to);
    paramIndex++;
  }

  query += ` ORDER BY ft.transaction_date DESC, ft.created_at DESC`;

  if (filters.limit) {
    query += ` LIMIT $${paramIndex}`;
    params.push(filters.limit);
    paramIndex++;
  }

  const result = await db.query(query, params);
  return result.rows;
}

// Financial Reports and Analytics
export async function getBudgetVsActual(churchId, year, month = null) {
  // Get budget amounts
  let budgetQuery = `
    SELECT
      bc.category_name,
      bc.category_type,
      COALESCE(SUM(cb.budgeted_amount), 0) as budgeted_amount
    FROM budget_categories bc
    LEFT JOIN church_budget cb ON bc.id = cb.category_id
      AND cb.budget_year = $2
      ${month !== null ? 'AND cb.budget_month = $3' : ''}
    WHERE bc.church_id = $1 AND bc.is_active = TRUE
    GROUP BY bc.id, bc.category_name, bc.category_type
    ORDER BY bc.category_type ASC, bc.category_name ASC
  `;

  const budgetParams = month !== null ? [churchId, year, month] : [churchId, year];
  const budgetResult = await db.query(budgetQuery, budgetParams);

  // Get actual amounts for the period
  const startDate = month ? `${year}-${month.toString().padStart(2, '0')}-01` :
                           `${year}-01-01`;
  const endDate = month ? new Date(year, month, 0).toISOString().split('T')[0] :
                         `${year}-12-31`;

  const actualResult = await db.query(`
    SELECT
      bc.category_name,
      bc.category_type,
      COALESCE(SUM(ft.amount), 0) as actual_amount
    FROM budget_categories bc
    LEFT JOIN financial_transactions ft ON bc.id = ft.category_id
      AND ft.transaction_date BETWEEN $2 AND $3
    WHERE bc.church_id = $1 AND bc.is_active = TRUE
    GROUP BY bc.id, bc.category_name, bc.category_type
    ORDER BY bc.category_type ASC, bc.category_name ASC
  `, [churchId, startDate, endDate]);

  // Combine budget and actual data
  const combined = budgetResult.rows.map(budget => {
    const actual = actualResult.rows.find(a =>
      a.category_name === budget.category_name && a.category_type === budget.category_type
    );
    return {
      category_name: budget.category_name,
      category_type: budget.category_type,
      budgeted_amount: parseFloat(budget.budgeted_amount),
      actual_amount: actual ? parseFloat(actual.actual_amount) : 0,
      variance: parseFloat(budget.budgeted_amount) - (actual ? parseFloat(actual.actual_amount) : 0),
      variance_percentage: budget.budgeted_amount > 0 ?
        ((parseFloat(budget.budgeted_amount) - (actual ? parseFloat(actual.actual_amount) : 0)) / parseFloat(budget.budgeted_amount) * 100) : 0
    };
  });

  return combined;
}

export async function getFinancialSummary(churchId, year, month = null) {
  // Determine date range
  const startDate = month ? `${year}-${month.toString().padStart(2, '0')}-01` :
                           `${year}-01-01`;
  const endDate = month ? new Date(year, month, 0).toISOString().split('T')[0] :
                         `${year}-12-31`;

  const result = await db.query(`
    SELECT
      SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
      SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expenses,
      SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) -
      SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as net_income,
      COUNT(CASE WHEN transaction_type = 'income' THEN 1 END) as income_transactions,
      COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as expense_transactions,
      AVG(CASE WHEN transaction_type = 'income' THEN amount END) as avg_income_amount,
      AVG(CASE WHEN transaction_type = 'expense' THEN amount END) as avg_expense_amount
    FROM financial_transactions
    WHERE church_id = $1 AND transaction_date BETWEEN $2 AND $3
  `, [churchId, startDate, endDate]);

  return result.rows[0];
}

export async function getMonthlyFinancialTrends(churchId, months = 12) {
  const result = await db.query(`
    SELECT
      DATE_TRUNC('month', transaction_date) as month,
      SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as monthly_income,
      SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as monthly_expenses,
      SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) -
      SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as monthly_net,
      COUNT(*) as transaction_count
    FROM financial_transactions
    WHERE church_id = $1 AND transaction_date >= CURRENT_DATE - INTERVAL '${months} months'
    GROUP BY DATE_TRUNC('month', transaction_date)
    ORDER BY month ASC
  `, [churchId]);

  return result.rows;
}

export async function getCategorySpendingAnalysis(churchId, year, month = null) {
  // Determine date range
  const startDate = month ? `${year}-${month.toString().padStart(2, '0')}-01` :
                           `${year}-01-01`;
  const endDate = month ? new Date(year, month, 0).toISOString().split('T')[0] :
                         `${year}-12-31`;

  const result = await db.query(`
    SELECT
      bc.category_name,
      bc.category_type,
      SUM(ft.amount) as total_amount,
      COUNT(ft.id) as transaction_count,
      AVG(ft.amount) as avg_transaction_amount,
      MAX(ft.transaction_date) as last_transaction_date
    FROM budget_categories bc
    LEFT JOIN financial_transactions ft ON bc.id = ft.category_id
      AND ft.transaction_date BETWEEN $2 AND $3
    WHERE bc.church_id = $1 AND bc.is_active = TRUE
    GROUP BY bc.id, bc.category_name, bc.category_type
    HAVING SUM(ft.amount) > 0
    ORDER BY total_amount DESC
  `, [churchId, startDate, endDate]);

  return result.rows;
}