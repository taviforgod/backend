// Dummy: implement as needed or integrate with your real RBAC!
export function requirePermission(permission) {
  return (req, res, next) => next();
}