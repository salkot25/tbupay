export const mapListResponseData = (response, mapper) => {
  if (response?.status !== "success") return response;
  const list = Array.isArray(response.data) ? response.data : [];
  return { ...response, data: list.map((item) => mapper(item)) };
};

export const mapObjectResponseData = (response, mapper) => {
  if (response?.status !== "success") return response;
  return { ...response, data: mapper(response.data || {}) };
};

export const mapNamedFieldResponse = (response, field, mapper) => {
  if (response?.status !== "success") return response;
  return { ...response, [field]: mapper(response[field] || {}) };
};
