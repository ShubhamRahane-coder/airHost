// validate.js
export const validateBody = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    // 1. Join the Joi error messages
    const msg = error.details.map(el => el.message).join(", ");
    
    // 2. Save the message to Flash
    req.flash("error", msg);
    
    // 3. Redirect back to the form instead of sending a raw string
    return res.redirect("back");
  }
  next();
};