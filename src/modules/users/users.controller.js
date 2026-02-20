import * as usersService from './users.service.js';
import { success, created, noContent } from '../../utils/response.js';

export const list = async (req, res, next) => {
  try {
    const { role, clan, isActive, search, page, limit } = req.query;

    const result = await usersService.listUsers(
      { role, clan, isActive, search },
      { page, limit }
    );

    return success(res, { message: 'Usuarios obtenidos exitosamente', ...result });
  } catch (error) {
    next(error);
  }
};

export const get = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await usersService.getUser(id);

    return success(res, { message: 'Usuario obtenido exitosamente', user });
  } catch (error) {
    next(error);
  }
};

export const create = async (req, res, next) => {
  try {
    const userData = req.body;

    const user = await usersService.createUser(userData);

    const responseData = {
      user: {
        id_user: user.id_user,
        name: user.name,
        email: user.email,
        role: user.role,
        clan: user.clan
      }
    };

    if (user.passwordGenerated) {
      responseData.note = 'Se generó una contraseña automática basada en el número de documento';
    }

    return created(res, { message: 'Usuario creado exitosamente', ...responseData });
  } catch (error) {
    next(error);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const user = await usersService.updateUser(id, updateData);

    return success(res, { message: 'Usuario actualizado exitosamente', user });
  } catch (error) {
    next(error);
  }
};

export const updatePassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    await usersService.changePassword(id, password);

    return success(res, { message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
};

export const toggleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const requesterId = req.user.id_user;

    const user = await usersService.toggleUserStatus(id, isActive, requesterId);

    const message = isActive 
      ? 'Usuario activado exitosamente' 
      : 'Usuario desactivado exitosamente';

    return success(res, { message, user });
  } catch (error) {
    next(error);
  }
};

export const getAvailable = async (req, res, next) => {
  try {
    const { search, page, limit } = req.query;

    const result = await usersService.getAvailableCoders(
      { search },
      { page, limit }
    );

    return success(res, { message: 'Coders disponibles obtenidos exitosamente', ...result });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id_user;

    const user = await usersService.getMe(userId);

    return success(res, { message: 'Perfil obtenido exitosamente', user });
  } catch (error) {
    next(error);
  }
};

export const getStats = async (req, res, next) => {
  try {
    const stats = await usersService.getUserStats();

    return success(res, { message: 'Estadísticas obtenidas exitosamente', stats });
  } catch (error) {
    next(error);
  }
};

export default {
  list,
  get,
  create,
  update,
  updatePassword,
  toggleStatus,
  getAvailable,
  getMe,
  getStats
};
