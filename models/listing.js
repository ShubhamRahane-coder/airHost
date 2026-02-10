import mongoose from "mongoose";

const Schema = mongoose.Schema;

const listingSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      minlength: [3, "Title must be at least 3 characters"],
      maxlength: [100, "Title cannot exceed 100 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      minlength: [10, "Description must be at least 10 characters"],
    },

    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },

    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },

    country: {
      type: String,
      required: [true, "Country is required"],
      trim: true,
    },

    image: {
      url: {
        type: String,
        required: [true, "Image URL is required"],
        validate: {
          validator: function (v) {
            return /^https?:\/\/.+/.test(v);
          },
          message: "Image must be a valid URL",
        },
      },
      filename: {
        type: String,
        default: "",
      },
    },

    // --- NEW FIELDS: CATEGORY & GUESTS ---
    

    guests: {
      type: Number,
      required: [true, "Guest capacity is required"],
      min: [1, "Minimum 1 guest required"],
      default: 1,
    },

    // --- NEW FIELD: NESTED AMENITIES ---
    amenities: {
      wifi: { type: Boolean, default: false },
      ac: { type: Boolean, default: false },
      kitchen: { type: Boolean, default: false },
      parking: { type: Boolean, default: false },
      pool: { type: Boolean, default: false },
      gym: { type: Boolean, default: false },
      workspacer: { type: Boolean, default: false },
      pets: { type: Boolean, default: false },
      cctv: { type: Boolean, default: false },
    },

    lat: {
      type: Number,
      min: [-90, "Latitude must be >= -90"],
      max: [90, "Latitude must be <= 90"],
      default: 18.879702,
    },

    lng: {
      type: Number,
      min: [-180, "Longitude must be >= -180"],
      max: [180, "Longitude must be <= 180"],
      default: 72.140273,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviews: [
      {
        type: Schema.Types.ObjectId,
        ref: "Review",
      },
    ],

    reservations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Reservation",
      },
    ],

    cleaningFee: {
      type: Number,
      default: 0,
      min: [0, "Cleaning fee cannot be negative"]
    },

    serviceFeePct: {
      type: Number,
      default: 3, 
      min: [0, "Service fee percent cannot be negative"],
      max: [100, "Service fee cannot exceed 100%"]
    },
    badgesCategory: { // Fixed spelling here
    type: String,
    enum: [
        "Standard",
        "Premium",
        "Budget",
        "Luxury",
        "Trending",
        "Popular",
        "New",
        "Top Rated",
        "Featured",
        "Iconic",
        "", // Allows "None"
    ],
    required: false,
    default: "Standard",
},
category: { // Stay Type
    type: String,
    enum: ["Rooms", "Hotels", "Entire Home", "Cabins", "Luxe"],
    required: true,
    default: "Rooms",
},
isVerified: {
        type: Boolean,
        default: false // New listings are unverified by default
    }
  },
  {
    timestamps: true,
  },
);

listingSchema.post("findOneAndDelete", async function (listing) {
    if (listing) {
        // Access models inside the middleware to avoid circular imports
        const Review = mongoose.model("Review");
        const Reservation = mongoose.model("Reservation");

        // 1. Delete all reviews associated with this listing
        if (listing.reviews.length > 0) {
            await Review.deleteMany({ _id: { $in: listing.reviews } });
        }

        // 2. Delete all reservations associated with this listing
        if (listing.reservations.length > 0) {
            await Reservation.deleteMany({ _id: { $in: listing.reservations } });
        }
        
        console.log(`Successfully cleaned up reviews and reservations for listing: ${listing.title}`);
    }
});




export default mongoose.model("Listing", listingSchema);