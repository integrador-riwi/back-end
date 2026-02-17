export const success = (res, data, status = 200) => {
  return res.status(status).json({
    success: true,
    data
  });
};

export const error = (res, message, status = 400) => {
  return res.status(status).json({
    success: false,
    error: message
  });
};

export const paginated = (res, data, page, limit, total) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit)
    }
  });
};

export const created = (res, data) => {
  return success(res, data, 201);
};

export const noContent = (res) => {
  return res.status(204).send();
};

export const notFound = (res, message = 'Recurso no encontrado') => {
  return error(res, message, 404);
};

export const unauthorized = (res, message = 'No autorizado') => {
  return error(res, message, 401);
};

export const forbidden = (res, message = 'Acceso denegado') => {
  return error(res, message, 403);
};

export const serverError = (res, message = 'Error interno del servidor') => {
  return error(res, message, 500);
};
