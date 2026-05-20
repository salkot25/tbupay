const byCode = (code, message, details = {}, retryable = false) => ({
  code,
  message,
  retryable,
  details,
});

export const mapAdapterError = ({
  type,
  error,
  statusCode,
  action,
  responseBody,
}) => {
  if (type === "config") {
    return {
      status: "error",
      message: "Konfigurasi backend belum diatur. Isi VITE_GAS_URL.",
      error: byCode(
        "CONFIG_MISSING_BACKEND_URL",
        "Backend URL tidak tersedia",
        {
          action,
        },
      ),
    };
  }

  if (type === "network") {
    return {
      status: "error",
      message: "Tidak dapat terhubung ke server.",
      error: byCode(
        "NETWORK_ERROR",
        error?.message || "Network error",
        { action },
        true,
      ),
    };
  }

  if (type === "http") {
    return {
      status: "error",
      message: `Server merespons error (${statusCode}).`,
      error: byCode(
        "HTTP_ERROR",
        `HTTP ${statusCode}`,
        { action, statusCode, responseBody },
        statusCode >= 500,
      ),
    };
  }

  if (type === "parse") {
    return {
      status: "error",
      message: "Format respons server tidak valid.",
      error: byCode(
        "INVALID_RESPONSE_FORMAT",
        error?.message || "Invalid JSON",
        {
          action,
        },
      ),
    };
  }

  if (type === "backend") {
    return {
      status: "error",
      message: responseBody?.message || "Operasi gagal diproses server.",
      error: byCode(
        "BACKEND_OPERATION_FAILED",
        responseBody?.message || "Backend rejected request",
        {
          action,
          responseBody,
        },
      ),
    };
  }

  return {
    status: "error",
    message: "Terjadi kesalahan yang tidak diketahui.",
    error: byCode("UNKNOWN_ERROR", error?.message || "Unknown error", {
      action,
    }),
  };
};
