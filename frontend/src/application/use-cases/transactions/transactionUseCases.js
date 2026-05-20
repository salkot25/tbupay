import { transactionRepository } from "../../../infrastructure/repositories/transactionRepository";

export const getTransactions = (options = {}) =>
  transactionRepository.getAll(options);

export const createTransaction = (payload) =>
  transactionRepository.add(payload);

export const verifyTransaction = (payload) =>
  transactionRepository.verify(payload);

export const getTransactionCategories = (options = {}) =>
  transactionRepository.getCategories(options);

export const addTransactionCategory = (payload) =>
  transactionRepository.addCategory(payload);

export const deleteTransactionCategory = (payload) =>
  transactionRepository.deleteCategory(payload);

export const reorderTransactionCategories = (payload) =>
  transactionRepository.reorderCategories(payload);
