import Joi from "joi";

// ========================
// USER SCHEMA
// ========================
export const userRegisterSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),

   location: Joi.string().min(3).max(30).required(), 
  phone: Joi.string()
  .pattern(/^[0-9]{10,12}$/)
  .required()
  .messages({
    "string.pattern.base": "Contact number must be 10–12 digits",
  }),
});






// ========================
// LISTING SCHEMA
// ========================
export const listingSchema = Joi.object({
  listing: Joi.object({
    title: Joi.string().required().messages({
      "string.empty": "Title is required for your listing",
    }),
    price: Joi.number().min(0).required(),
    description: Joi.string().required().min(10).messages({
      "string.min": "Description must be at least 10 characters long",
      "any.required": "Description is a required field"
    }),
    location: Joi.string().required(),
    country: Joi.string().required(),
    
    category: Joi.string()
      .valid("Rooms", "Hotels", "Entire Home", "Cabins", "Luxe")
      .required(),

    badgesCategory: Joi.string()
      .valid(
        "Standard", "Premium", "Budget", "Luxury", 
        "Trending", "Popular", "New", "Top Rated", 
        "Featured", "Iconic", ""
      )
      .allow("", null)
      .default("Standard"),

    isVerified: Joi.boolean()
      .allow("true", "false")
      .default(false),
    
    guests: Joi.number().min(1).required(),

    // 1. Updated Image Schema to handle Array of Objects {url, filename}
    image: Joi.array()
      .items(
        Joi.alternatives().try(
          Joi.string().uri().allow(""), // Handles raw strings if sent
          Joi.object({                  // Handles our final structured objects
            url: Joi.string().required(),
            filename: Joi.string().allow("", null)
          })
        )
      )
      .optional()
      .default([]),

    // 2. CRITICAL: Allow the temporary fileImages field from Multer
    // This stops Joi from throwing "fileImages is not allowed" errors
    fileImages: Joi.any().optional(),
    
    cleaningFee: Joi.number().min(0).allow("", null).default(0),
    serviceFeePct: Joi.number().min(0).max(100).allow("", null).default(3),
    
    amenities: Joi.object({
      wifi: Joi.boolean().default(false),
      ac: Joi.boolean().default(false),
      kitchen: Joi.boolean().default(false),
      parking: Joi.boolean().default(false),
      pool: Joi.boolean().default(false),
      gym: Joi.boolean().default(false),
      workspacer: Joi.boolean().default(false),
      pets: Joi.boolean().default(false),
      cctv: Joi.boolean().default(false),
    }).optional(),

    lat: Joi.number().allow("", null).optional(),
    lng: Joi.number().allow("", null).optional(),
  }).required(),
});





// ========================
// REVIEW SCHEMA
// ========================
export const reviewSchema = Joi.object({
  rating: Joi.number().min(1).max(5).required(),
  comment: Joi.string().min(1).required(), 
});