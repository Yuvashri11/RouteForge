export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type ErrorResponse = {
  success: false;
  message: string;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function success<T>(data: T): SuccessResponse<T> {
  return { success: true, data };
}

export function error(message: string): ErrorResponse {
  return { success: false, message };
}
