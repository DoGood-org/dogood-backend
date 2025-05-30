import Joi from 'joi';

export const createEventSchema = Joi.object({
  title: Joi.string().min(1).required().messages({
    'string.empty': 'Title is required',
  }),
  description: Joi.string().min(1).required().messages({
    'string.empty': 'Description is required',
  }),
  hostId: Joi.number().integer().positive().required().messages({
    'number.base': 'hostId must be a number',
    'number.positive': 'hostId must be a positive integer',
  }),
  categories: Joi.array()
    .items(Joi.number().integer().positive())
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one category is required',
    }),
  startTime: Joi.date().iso().required().messages({
    'date.base': 'startTime must be a valid ISO date',
  }),
  endTime: Joi.date().iso().required().messages({
    'date.base': 'endTime must be a valid ISO date',
  }),
  latitude: Joi.number().min(-90).max(90).required().messages({
    'number.base': 'Latitude must be a number',
    'number.min': 'Latitude must be >= -90',
    'number.max': 'Latitude must be <= 90',
  }),
  longitude: Joi.number().min(-180).max(180).required().messages({
    'number.base': 'Longitude must be a number',
    'number.min': 'Longitude must be >= -180',
    'number.max': 'Longitude must be <= 180',
  }),
});

export const schemas = {
  createEventSchema,
};
