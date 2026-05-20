import { ticketRepository } from "../../../infrastructure/repositories/ticketRepository";

export const getTickets = (options = {}) => ticketRepository.getAll(options);

export const createTicket = (payload) => ticketRepository.add(payload);

export const updateTicketStatus = (payload) =>
  ticketRepository.updateStatus(payload);
