/**
 * API Versioning Middleware
 * Checks the Accept-Version header or X-API-Version header and attaches it to req.apiVersion.
 * Defaults to 'v1' if not provided.
 */
module.exports = (req, res, next) => {
  const version = req.headers['accept-version'] || req.headers['x-api-version'] || 'v1';
  req.apiVersion = version.toLowerCase();

  // We could theoretically route traffic based on req.apiVersion here if needed,
  // but for now, we just attach it to the request and expose it in the response header.
  res.setHeader('X-API-Version', req.apiVersion);

  next();
};
