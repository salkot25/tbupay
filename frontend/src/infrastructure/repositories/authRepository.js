import { backendApiAdapter } from "../adapters/backendApiAdapter";
import { toAuthUserModel } from "../../domain/models/authUserModel";
import { mapNamedFieldResponse } from "../../domain/mappers/apiResponseMappers";

export const authRepository = {
  async login(username, password) {
    const response = await backendApiAdapter.post("login", {
      username,
      password,
    });
    return mapNamedFieldResponse(response, "user", toAuthUserModel);
  },
};
