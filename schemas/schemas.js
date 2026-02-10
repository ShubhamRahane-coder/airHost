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
    description: Joi.string().required().min(10),
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

    // --- ADDED THIS FIELD ---
    isVerified: Joi.boolean()
      .allow("true", "false") // Allows strings if your form sends them that way
      .default(false),
    // ------------------------
    
    guests: Joi.number().min(1).required(),

    image: Joi.object({
      url: Joi.string().uri().allow("", null).optional(),
      filename: Joi.string().allow("", null).optional(),
    }).optional(),
    
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