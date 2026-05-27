import { backendApiAdapter } from "../adapters/backendApiAdapter";
import { toTicketModel, toTicketReplyModel } from "../../domain/models/ticketModel";
import { mapListResponseData } from "../../domain/mappers/apiResponseMappers";

export const ticketRepository = {
  async getAll(options = {}) {
    const response = await backendApiAdapter.get("getTickets", {}, options);
    return mapListResponseData(response, toTicketModel);
  },

  add(payload) {
    return backendApiAdapter.post("addTicket", payload);
  },

  updateStatus(payload) {
    return backendApiAdapter.post("updateTicketStatus", payload);
  },

  async getReplies(id_tiket, options = {}) {
    const response = await backendApiAdapter.get("getTicketReplies", { id_tiket }, options);
    return mapListResponseData(response, toTicketReplyModel);
  },

  addReply(payload) {
    return backendApiAdapter.post("addTicketReply", payload);
  },
};
