import { BACKEND_BASE_URL } from "../infrastructure/adapters/backendApiAdapter";
import { loginUser } from "../application/use-cases/auth/authUseCases";
import {
  getTransactions,
  createTransaction,
  verifyTransaction,
  getTransactionCategories,
  addTransactionCategory,
  deleteTransactionCategory,
  reorderTransactionCategories,
} from "../application/use-cases/transactions/transactionUseCases";
import {
  getTickets,
  createTicket,
  updateTicketStatus,
} from "../application/use-cases/tickets/ticketUseCases";
import {
  getNews,
  createNews,
  getNewsReplies,
  createNewsReply,
} from "../application/use-cases/news/newsUseCases";
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
} from "../application/use-cases/users/userUseCases";

export const GAS_URL = BACKEND_BASE_URL;

// Legacy compatibility layer.
export const loginApi = async (username, password) =>
  loginUser({ username, password });

export const getTransactionsApi = async () => getTransactions();
export const addTransactionApi = async (data) => createTransaction(data);
export const verifyTransactionApi = async (data) => verifyTransaction(data);
export const getTransactionCategoriesApi = async () =>
  getTransactionCategories();
export const addTransactionCategoryApi = async (data) =>
  addTransactionCategory(data);
export const deleteTransactionCategoryApi = async (data) =>
  deleteTransactionCategory(data);
export const reorderTransactionCategoriesApi = async (data) =>
  reorderTransactionCategories(data);

export const getTicketsApi = async () => getTickets();
export const addTicketApi = async (data) => createTicket(data);
export const updateTicketStatusApi = async (data) => updateTicketStatus(data);

export const getNewsApi = async () => getNews();
export const addNewsApi = async (data) => createNews(data);
export const getNewsRepliesApi = async (id_berita) => getNewsReplies(id_berita);
export const addNewsReplyApi = async (data) => createNewsReply(data);

export const getUsersApi = async () => getUsers();
export const addUserApi = async (data) => createUser(data);
export const updateUserApi = async (data) => updateUser(data);
export const deleteUserApi = async (id_user) => deleteUser(id_user);
