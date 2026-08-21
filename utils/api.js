export function sendSuccess(res, message, data = {}, statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  })
}

export function sendError(res, message, statusCode = 400, details = undefined) {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(details ? { details } : {}),
  })
}

