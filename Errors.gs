function createError(code, message, details) {
  return {
    ok: false,
    error: {
      code: code,
      message: message,
      details: details
    }
  };
}
