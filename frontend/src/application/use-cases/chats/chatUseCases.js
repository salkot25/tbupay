import { backendApiAdapter } from "../../../infrastructure/adapters/backendApiAdapter";

export async function getGeneralChats(options = {}) {
  try {
    return await backendApiAdapter.get("getGeneralChats", {}, options);
  } catch (error) {
    return { status: "error", message: error.message || "Gagal mengambil obrolan." };
  }
}

export async function createGeneralChat(payload) {
  try {
    return await backendApiAdapter.post("addGeneralChat", payload);
  } catch (error) {
    return { status: "error", message: error.message || "Gagal mengirim pesan obrolan." };
  }
}
