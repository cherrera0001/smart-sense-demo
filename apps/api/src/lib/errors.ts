/**
 * Errores de negocio de la API. Mapeados a HTTP + código por el error-handler.
 * Códigos alineados a specs/04-api/error-model.md.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  unauthorized: (msg = 'No autenticado') => new AppError(401, 'UNAUTHORIZED', msg),
  invalidCredentials: () =>
    // Mensaje genérico: no revela si el email existe (specs/auth-and-permissions).
    new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas'),
  forbidden: (msg = 'Sin permisos suficientes') => new AppError(403, 'FORBIDDEN', msg),
  crossTenant: () =>
    new AppError(403, 'CROSS_TENANT_DENIED', 'Acceso a recurso de otra organización denegado'),
  notFound: (entity = 'Recurso') => new AppError(404, 'NOT_FOUND', `${entity} no encontrado`),
  conflict: (code: string, msg: string) => new AppError(409, code, msg),
  emailTaken: () => new AppError(409, 'EMAIL_TAKEN', 'El email ya está registrado'),
  kitAlreadyClaimed: () =>
    new AppError(409, 'KIT_ALREADY_CLAIMED', 'El kit ya está activo en otra instalación'),
  validation: (details: unknown) =>
    new AppError(422, 'VALIDATION_ERROR', 'Payload inválido', details),
} as const;
