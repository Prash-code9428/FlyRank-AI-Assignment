import { supabase } from '../supabaseClient.js';

/**
 * Reusable Express authentication middleware.
 * Verifies Supabase Bearer JWT from Authorization header.
 */
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({
      error: "Access token required"
    });
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
    return res.status(401).json({
      error: "Access token required"
    });
  }

  const token = parts[1].trim();

  if (!supabase) {
    return res.status(500).json({
      error: "Supabase client is not configured"
    });
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data || !data.user) {
      return res.status(401).json({
        error: "Invalid or expired token"
      });
    }

    req.user = data.user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(500).json({
      error: err.message
    });
  }
};
