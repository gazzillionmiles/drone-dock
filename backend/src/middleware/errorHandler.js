/**
 * Catches malformed JSON bodies (thrown by express.json()) and anything
 * else that bubbles up, so the process never crashes on a bad request.
 */
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'MALFORMED_JSON', message: 'Request body is not valid JSON.' });
  }
  console.error('[error]', err); // eslint-disable-line no-console
  res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Something went wrong.' });
}

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` });
}

module.exports = { errorHandler, notFoundHandler };
