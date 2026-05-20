import { userRepository } from "../../../infrastructure/repositories/userRepository";

export const getUsers = (options = {}) => userRepository.getAll(options);

export const createUser = (payload) => userRepository.add(payload);

export const updateUser = (payload) => userRepository.update(payload);

export const deleteUser = (id_user) => userRepository.remove(id_user);
