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

    // ✅ Image as object (important)
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

    // ✅ Map support
    lat: {
      type: Number,
      min: [-90, "Latitude must be >= -90"],
      max: [90, "Latitude must be <= 90"],
    },

    lng: {
      type: Number,
      min: [-180, "Longitude must be >= -180"],
      max: [180, "Longitude must be <= 180"],
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Listing", listingSchema);
