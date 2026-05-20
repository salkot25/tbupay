import { backendApiAdapter } from "../adapters/backendApiAdapter";
import {
  toTransactionModel,
  toTransactionCategoryModel,
} from "../../domain/models/transactionModel";
import {
  mapListResponseData,
  mapObjectResponseData,
} from "../../domain/mappers/apiResponseMappers";

export const transactionRepository = {
  async getAll(options = {}) {
    const response = await backendApiAdapter.get(
      "getTransactions",
      {},
      options,
    );
    return mapListResponseData(response, toTransactionModel);
  },

  add(payload) {
    return backendApiAdapter.post("addTransaction", payload);
  },

  verify(payload) {
    return backendApiAdapter.post("verifyTransaction", payload);
  },

  async getCategories(options = {}) {
    const response = await backendApiAdapter.get(
      "getTransactionCategories",
      {},
      options,
    );
    return mapObjectResponseData(response, toTransactionCategoryModel);
  },

  addCategory(payload) {
    return backendApiAdapter.post("addTransactionCategory", payload);
  },

  deleteCategory(payload) {
    return backendApiAdapter.post("deleteTransactionCategory", payload);
  },

  reorderCategories(payload) {
    return backendApiAdapter.post("reorderTransactionCategories", payload);
  },
};
