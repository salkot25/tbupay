import { backendApiAdapter } from "../adapters/backendApiAdapter";
import { toUserModel } from "../../domain/models/userModel";
import { mapListResponseData } from "../../domain/mappers/apiResponseMappers";

export const userRepository = {
  async getAll(options = {}) {
    const response = await backendApiAdapter.get("getUsers", {}, options);
    return mapListResponseData(response, toUserModel);
  },

  add(payload) {
    return backendApiAdapter.post("addUser", payload);
  },

  update(payload) {
    return backendApiAdapter.post("updateUser", payload);
  },

  remove(id_user) {
    return backendApiAdapter.post("deleteUser", { id_user });
  },
};
