function createError(code, message, details) {
  var safeCode = String(code || "");
  var safeMessage = String(message || "");
  var safeDetails = (details && typeof details === "object" && !Array.isArray(details))
    ? details
    : {};

  return {
    ok: false,
    error: {
      code: safeCode,
      message: safeMessage,
      details: safeDetails
    }
  };
}
