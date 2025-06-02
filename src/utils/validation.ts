import Joi from 'joi';

export const signUpSchema = Joi.object({
  name: Joi.string()
    .min(4)
    .max(30)
    .messages({
      'string.min': 'Name must be at least 6 characters',
      'string.max': 'Name must be more then 30 characters',
    }),
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(6)
    .messages({
      'string.min': 'Password must be at least 6 characters',
    }),
});

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6),
});