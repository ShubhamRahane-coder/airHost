import Joi from "joi";

// ========================
// USER SCHEMA
// ========================
export const userRegisterSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
});

// ========================
// LISTING SCHEMA
// ========================
export const listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required(),
    price: Joi.number().min(0).required(),
    description: Joi.string().allow("").optional(),
    location: Joi.string().required(),
    country: Joi.string().required(),
    image: Joi.object({
      url: Joi.string().uri().allow("", null).optional(),
    }).optional(),
    
    // FIX: Allow these to be empty strings or null so the form doesn't crash
    lat: Joi.number().allow("", null).optional(),
    lng: Joi.number().allow("", null).optional(),
  }).required(),
});

// ========================
// REVIEW SCHEMA
// ========================
export const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(1).required(), // Ensure this matches your Mongoose model field name
});