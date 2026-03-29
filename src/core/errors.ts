import { error } from './output.ts';

interface AxiosLikeError {
  response?: {
    status?: number;
    data?: {
      message?: string;
      errors?: Array<{ field?: string; message?: string }>;
    };
  };
  code?: string;
  message?: string;
}

export function handleError(err: unknown): never {
  const axErr = err as AxiosLikeError;

  if (axErr.response) {
    const status = axErr.response.status;
    const data = axErr.response.data;

    switch (status) {
      case 401:
        error('Not authenticated. Run: desi auth login');
        break;
      case 403:
        error('Permission denied. You may need admin access.');
        break;
      case 404:
        error('Resource not found.');
        break;
      case 422: {
        const details =
          data?.errors?.map((e) => `${e.field}: ${e.message}`).join(', ') ??
          data?.message ??
          'Unknown validation error';
        error(`Validation error: ${details}`);
        break;
      }
      case 429:
        error('Rate limited. Please retry later.');
        break;
      default:
        if (status && status >= 500) {
          error('Server error. Try again later.');
        } else {
          error(data?.message ?? `Request failed (${status})`);
        }
    }
  } else if (axErr.code === 'ECONNREFUSED' || axErr.code === 'ENOTFOUND') {
    error(`Cannot reach server. Is it running?`);
  } else if (err instanceof Error) {
    error(err.message);
  } else {
    error('An unexpected error occurred.');
  }

  process.exit(1);
}
