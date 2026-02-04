import mongoose from "mongoose";
const Schema = mongoose.Schema;

const ReviewSchema = new Schema({
  rating: { 
    type: Number, 
    required: [true, "Rating is required"], 
    min: [1, "Rating must be at least 1"], 
    max: [5, "Rating cannot exceed 5"] 
  },
  comment: { 
    type: String, 
    required: [true, "Review text is required"], 
    trim: true,
    minlength: [5, "Review must be at least 5 characters"]
  },
  author: { 
    type: Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  listing: { 
    type: Schema.Types.ObjectId, 
    ref: "Listing", 
    required: true 
  }
}, { timestamps: true });

export default mongoose.model("Review", ReviewSchema);
