import * as providerModel from '../models/communicationProviderModel.js';

// Get all providers (admin only)
export const getProviders = async (req, res) => {
  try {
    // TODO: Add admin permission check
    const providers = await providerModel.getAllProviders();
    res.json(providers);
  } catch (err) {
    console.error('Error fetching providers:', err);
    res.status(500).json({ error: 'Failed to fetch communication providers' });
  }
};

// Get provider by ID
export const getProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await providerModel.getProviderById(id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(provider);
  } catch (err) {
    console.error('Error fetching provider:', err);
    res.status(500).json({ error: 'Failed to fetch provider' });
  }
};

// Create provider
export const createProvider = async (req, res) => {
  try {
    // TODO: Add admin permission check
    const provider = await providerModel.createProvider(req.body);
    res.status(201).json(provider);
  } catch (err) {
    console.error('Error creating provider:', err);
    res.status(500).json({ error: 'Failed to create provider' });
  }
};

// Update provider
export const updateProvider = async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Add admin permission check
    const provider = await providerModel.updateProvider(id, req.body);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json(provider);
  } catch (err) {
    console.error('Error updating provider:', err);
    res.status(500).json({ error: 'Failed to update provider' });
  }
};

// Delete provider
export const deleteProvider = async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Add admin permission check
    const provider = await providerModel.deleteProvider(id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    res.json({ message: 'Provider deleted successfully' });
  } catch (err) {
    console.error('Error deleting provider:', err);
    res.status(500).json({ error: 'Failed to delete provider' });
  }
};

// Test provider
export const testProvider = async (req, res) => {
  try {
    const { id } = req.params;
    const provider = await providerModel.getProviderById(id);

    if (!provider) {
      return res.status(404).json({ error: 'Provider not found' });
    }

    const testResult = await providerModel.testProvider(provider);
    res.json(testResult);
  } catch (err) {
    console.error('Error testing provider:', err);
    res.status(500).json({ error: 'Failed to test provider' });
  }
};

export default {
  getProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider,
  testProvider
};