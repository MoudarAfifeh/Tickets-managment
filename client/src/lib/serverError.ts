import axios from "axios";

/** The `{ error }` message from a failed API response, or a generic fallback. */
export function getServerErrorMessage(error: unknown): string {
  return axios.isAxiosError(error) && error.response?.data?.error
    ? error.response.data.error
    : "Something went wrong. Please try again.";
}
