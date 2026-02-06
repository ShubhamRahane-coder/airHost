import mongoose from "mongoose";
const Schema = mongoose.Schema;

const UserSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      minlength: [3, "Username must be at least 3 characters"],
      maxlength: [30, "Username cannot exceed 30 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/.+@.+\..+/, "Please enter a valid email address"],
    },
    // --- NEW CONTACT FIELDS ---
    phone: {
      type: String,
      trim: true,
    },
    location: {
      type: String,
      trim: true,
    },
    // --------------------------
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
    status: {
        type: String,
        enum: ['active', 'blocked'],
        default: 'active'
    }
  },
  { 
    timestamps: true,
    // CRITICAL: Allow virtuals to be seen in EJS/JSON
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// --- VIRTUAL POPULATE FIX ---
// This creates a "fake" field called 'listings' that 
// Mongoose fills by searching the Listing model for this user's ID.
UserSchema.virtual('listings', {
  ref: 'Listing',       // The model to use
  localField: '_id',    // Find listings where 'owner' is this user's _id
  foreignField: 'owner' // The field name in the Listing model
});
// ----------------------------

UserSchema.post("findOneAndDelete", async function (user) {
    if (user) {
        const Listing = mongoose.model("Listing");
        const Review = mongoose.model("Review");

        const userListings = await Listing.find({ owner: user._id });
        const listingIds = userListings.map(l => l._id);

        await Review.deleteMany({ listing: { $in: listingIds } });
        await Listing.deleteMany({ owner: user._id });
        await Review.deleteMany({ author: user._id });
    }
});

export default mongoose.model("User", UserSchema);