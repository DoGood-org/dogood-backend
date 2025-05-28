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
  category: Joi.number().integer().min(0).required().messages({
    'number.base': 'Category must be a number',
    'number.min': 'Category must be a non-negative integer',
  }),
  startTime: Joi.date().iso().required().messages({
    'date.base': 'startTime must be a valid ISO date',
  }),
  endTime: Joi.date().iso().required().messages({
    'date.base': 'endTime must be a valid ISO date',
  }),
  location: Joi.object({
    type: Joi.string().valid('Point').required(),
    coordinates: Joi.array()
      .ordered(
        Joi.number().min(-180).max(180), // longitude
        Joi.number().min(-90).max(90) // latitude
      )
      .length(2)
      .required()
      .messages({
        'array.length': 'Coordinates must be a tuple of [longitude, latitude]',
      }),
  }).required(),
});
