import mongoose from "mongoose";

const reservationSchema = new mongoose.Schema({
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    price: Number,
    
    // Add these to match your EJS form inputs
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['Pending', 'Confirmed', 'Cancelled'],
        default: 'Pending'
    },
    isVerified: { type: Boolean, default: false },
    guest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing"
    }
}, { timestamps: true }); // Highly recommended for sorting your dashboard by "newest"

export default mongoose.model("Reservation", reservationSchema);