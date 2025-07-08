import logger from "./logger";
// * Validates the content of a chat message.
//  * @param {string} content - The content of the message to validate.
//  * @param {function} [callback] - Optional callback function to handle validation errors.
//  * @returns {string | false} - Returns the trimmed content if valid, or false if invalid.
//  */
export const validateMessageContent = (
  content: string,
  callback?: (res: { error: string }) => void
): string | false => {
  const trimmed = content?.trim();

  if (!trimmed) {
    const error = 'Message content is empty';
    logger.warn(error);
    callback?.({ error });
    return false;
  }

  if (trimmed.length > 500) {
    const error = 'Message content exceeds 500 characters';
    logger.warn(error);
    callback?.({ error });
    return false;
  }

  return trimmed;
};
