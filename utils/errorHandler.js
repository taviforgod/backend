/**
 * Centralized error handler utility
 */

/**
 * Handle errors in Express routes
 * @param {Object} res - Express response object
 * @param {string} context - Context description for logging
 * @param {Error} err - The error object
 * @returns {Object} Express response
 */
export function handleError(res, context, err) {
  console.error(`${context}:`, err);
  return res.status(500).json({
    message: err.message || `${context} failed`,
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

/**
 * Handle validation errors
 * @param {Object} res - Express response object
 * @param {Object} errors - Validation errors object
 * @returns {Object} Express response
 */
export function handleValidationError(res, errors) {
  console.error('Validation error:', errors);
  return res.status(400).json({
    message: 'Validation failed',
    errors
  });
}

/**
 * Handle not found errors
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name
 * @returns {Object} Express response
 */
export function handleNotFound(res, resource = 'Resource') {
  return res.status(404).json({
    message: `${resource} not found`
  });
}