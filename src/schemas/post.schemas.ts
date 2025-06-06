import Joi from 'joi';

export const createPostSchema = Joi.object({
  title: Joi.string().min(2).required().messages({
    'string.empty': 'Title is required',
  }),
  category: Joi.string().min(3).required().messages({
    'string.empty': 'Category must be a string  and have at least 3 char',
  }),
  content: Joi.string().min(10).required().messages({
    'string.empty': 'Сontent must be a string and have at least 10 char',
  }),
  image: Joi.string().uri().optional().messages({
    'string.empty': 'Image path must be a string',
  }),
});

export const schemas = {
  createPostSchema,
};
