import { authRepository } from "../../../infrastructure/repositories/authRepository";

export const loginUser = ({ username, password }) => {
  return authRepository.login(username, password);
};
