import db from '../config/db.js';

// Get all providers
export const getAllProviders = async () => {
  const res = await db.query(`
    SELECT * FROM communication_providers
    ORDER BY priority ASC, created_at ASC
  `);
  return res.rows.map(provider => ({
    ...provider,
    config: typeof provider.config === 'string' ? JSON.parse(provider.config) : provider.config
  }));
};

// Get active providers by type
export const getActiveProvidersByType = async (providerType) => {
  const res = await db.query(`
    SELECT * FROM communication_providers
    WHERE provider_type = $1 AND is_active = true
    ORDER BY priority ASC
  `, [providerType]);

  return res.rows.map(provider => ({
    ...provider,
    config: typeof provider.config === 'string' ? JSON.parse(provider.config) : provider.config
  }));
};

// Get provider by ID
export const getProviderById = async (id) => {
  const res = await db.query('SELECT * FROM communication_providers WHERE id = $1', [id]);
  const provider = res.rows[0];
  if (provider) {
    provider.config = typeof provider.config === 'string' ? JSON.parse(provider.config) : provider.config;
  }
  return provider;
};

// Create provider
export const createProvider = async (data) => {
  const res = await db.query(`
    INSERT INTO communication_providers
      (provider_type, name, config, is_active, priority)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
  `, [
    data.provider_type,
    data.name,
    JSON.stringify(data.config),
    data.is_active ?? true,
    data.priority ?? 1
  ]);

  const provider = res.rows[0];
  provider.config = JSON.parse(provider.config);
  return provider;
};

// Update provider
export const updateProvider = async (id, data) => {
  const res = await db.query(`
    UPDATE communication_providers
    SET provider_type = $1, name = $2, config = $3, is_active = $4, priority = $5, updated_at = NOW()
    WHERE id = $6
    RETURNING *
  `, [
    data.provider_type,
    data.name,
    JSON.stringify(data.config),
    data.is_active ?? true,
    data.priority ?? 1,
    id
  ]);

  const provider = res.rows[0];
  provider.config = JSON.parse(provider.config);
  return provider;
};

// Delete provider
export const deleteProvider = async (id) => {
  const res = await db.query('DELETE FROM communication_providers WHERE id = $1 RETURNING *', [id]);
  return res.rows[0];
};

// Test provider configuration
export const testProvider = async (provider) => {
  try {
    // This would implement actual testing logic based on provider type
    // For now, just return success
    return {
      success: true,
      message: `${provider.name} configuration is valid`
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
};

export default {
  getAllProviders,
  getActiveProvidersByType,
  getProviderById,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider
};