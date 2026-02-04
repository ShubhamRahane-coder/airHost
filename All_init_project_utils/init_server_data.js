import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcrypt";

// Models
import Listing from "../models/listing.js";
import Review from "../models/review.js";
import User from "../models/user.js";

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ airHost DB Connected for seeding"))
  .catch(err => console.log("❌ Connection error:", err));

// Helper for randomizing
const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

async function seedDB() {
  try {
    // 1. Clean old data
    await Listing.deleteMany({});
    await Review.deleteMany({});
    await User.deleteMany({});
    console.log("🗑️  Cleared existing data");

    // 2. Create Users with Hashed Passwords
    const hashedPassword = await bcrypt.hash("123456", 12);
    const usersData = [
      { username: "amit_travels", email: "amit@airhost.com", password: hashedPassword, role: "admin" },
      { username: "sara_villas", email: "sara@airhost.com", password: hashedPassword },
      { username: "rahul_urban", email: "rahul@airhost.com", password: hashedPassword },
      { username: "priya_beach", email: "priya@airhost.com", password: hashedPassword },
      { username: "john_doe", email: "john@airhost.com", password: hashedPassword }
    ];
    const users = await User.insertMany(usersData);
    console.log("👤 Users created");

    // 3. Define 30 Detailed Sample Listings
    const samples = [
        { title: "Royal Heritage Haveli", location: "Jaipur", country: "India", type: "Palace", price: 5500, img: "https://images.unsplash.com/photo-1590053132232-f30217edd1bf" },
        { title: "Modern Sky Loft", location: "Mumbai", country: "India", type: "Apartment", price: 4500, img: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688" },
        { title: "Tropical Beach Villa", location: "Goa", country: "India", type: "Villa", price: 3500, img: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2" },
        { title: "Snow Peak Cabin", location: "Manali", country: "India", type: "Cabin", price: 2800, img: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" },
        { title: "Backwater Houseboat", location: "Alleppey", country: "India", type: "Boat", price: 4200, img: "https://images.unsplash.com/photo-1593693397690-362cb9666fc2" },
        { title: "Infinity Pool Penthouse", location: "Dubai", country: "UAE", type: "Penthouse", price: 12000, img: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750" },
        { title: "Bamboo Treehouse", location: "Bali", country: "Indonesia", type: "Treehouse", price: 3200, img: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4" },
        { title: "Cozy Studio", location: "Mumbai", country: "India", type: "Studio", price: 2200, img: "https://images.unsplash.com/photo-1536376074432-cd23f5450974" },
        { title: "Desert Luxury Camp", location: "Jaisalmer", country: "India", type: "Tent", price: 3800, img: "https://images.unsplash.com/photo-1533105079780-92b9be482077" },
        { title: "Elegant City Suite", location: "New York", country: "USA", type: "Suite", price: 9500, img: "https://images.unsplash.com/photo-1449156059431-78995541892a" },
        { title: "Vintage Tea Bungalow", location: "Munnar", country: "India", type: "Bungalow", price: 4800, img: "https://images.unsplash.com/photo-1502301103665-0b95cc738def" },
        { title: "Glass Forest Cabin", location: "Waynad", country: "India", type: "Cabin", price: 3100, img: "https://images.unsplash.com/photo-1510798831971-661eb04b3739" },
        { title: "Minimalist Loft", location: "Bangalore", country: "India", type: "Loft", price: 2700, img: "https://images.unsplash.com/photo-1493809842364-78817add7ffb" },
        { title: "Cliffside Mansion", location: "Santorini", country: "Greece", type: "Mansion", price: 15000, img: "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff" },
        { title: "Himalayan Stone Cottage", location: "Leh", country: "India", type: "Cottage", price: 2500, img: "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4" },
        { title: "Sunset Beach Shack", location: "Goa", country: "India", type: "Shack", price: 1500, img: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e" },
        { title: "Downtown Studio", location: "Tokyo", country: "Japan", type: "Studio", price: 7000, img: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26" },
        { title: "Lakeside Glamping", location: "Udaipur", country: "India", type: "Tent", price: 2900, img: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7" },
        { title: "Designer Apartment", location: "Paris", country: "France", type: "Apartment", price: 8800, img: "https://images.unsplash.com/photo-1502672023488-70e25813efdf" },
        { title: "Mountain View Hostel", location: "Rishikesh", country: "India", type: "Hostel", price: 900, img: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5" },
        { title: "Suburban Family Home", location: "Delhi", country: "India", type: "House", price: 3300, img: "https://images.unsplash.com/photo-1568605114967-8130f3a36994" },
        { title: "Nordic Lake Cabin", location: "Oslo", country: "Norway", type: "Cabin", price: 6500, img: "https://images.unsplash.com/photo-1470770841072-f978cf4d019e" },
        { title: "Zen Garden Villa", location: "Kyoto", country: "Japan", type: "Villa", price: 11000, img: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e" },
        { title: "Portuguese Cottage", location: "Pondicherry", country: "India", type: "Cottage", price: 2600, img: "https://images.unsplash.com/photo-1523217582562-09d0def993a6" },
        { title: "Sky High Condominium", location: "Singapore", country: "Singapore", price: 9000, img: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267" },
        { title: "Quiet Farmstay", location: "Coorg", country: "India", type: "Farm", price: 2100, img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef" },
        { title: "Modernist Cube House", location: "Berlin", country: "Germany", type: "Art House", price: 7500, img: "https://images.unsplash.com/photo-1480074568708-e7b720bb3f09" },
        { title: "Colonial Estate", location: "Ooty", country: "India", type: "Estate", price: 5200, img: "https://images.unsplash.com/photo-1512918766671-ad6507962077" },
        { title: "Harbor View Flat", location: "Sydney", country: "Australia", type: "Apartment", price: 10500, img: "https://images.unsplash.com/photo-1523217582562-09d0def993a6" },
        { title: "Rainforest Eco-Lodge", location: "Cherrapunji", country: "India", type: "Lodge", price: 3400, img: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e" }
    ];

    for (const item of samples) {
      const owner = getRandom(users);

      const newListing = new Listing({
        title: item.title,
        description: `Experience luxury at this ${item.type || 'Stay'}. Located in the heart of ${item.location}, this space offers premium comfort, high-speed Wi-Fi, and breathtaking views. Perfect for vacationers and professionals alike.`,
        price: item.price,
        location: item.location,
        country: item.country,
        image: { url: item.img, filename: "listingimage" }, // Fixed structure
        owner: owner._id,
        lat: (Math.random() * (35 - 8) + 8).toFixed(6), // Random Lat for India range
        lng: (Math.random() * (97 - 68) + 68).toFixed(6) // Random Lng for India range
      });

      // 4. Create 2-4 Random Reviews per Listing
      const reviewTexts = [
          "Absolutely stunning views!", "The owner was very helpful.", "Clean and well-maintained.", 
          "A bit noisy but great location.", "Best vacation ever!", "Highly recommended.", 
          "Value for money.", "The pool was amazing."
      ];

      const reviewCount = Math.floor(Math.random() * 3) + 2;
      for (let i = 0; i < reviewCount; i++) {
        const author = getRandom(users);
        const review = await Review.create({
          rating: Math.floor(Math.random() * 2) + 4, // Mostly 4-5 stars
          comment: getRandom(reviewTexts),
          author: author._id,
          listing: newListing._id
        });
        newListing.reviews.push(review._id);
      }

      await newListing.save();
    }

    console.log("🏙️  30 Listings and 100+ Reviews created successfully!");
  } catch (err) {
    console.error("❌ Seeding Error:", err);
  } finally {
    mongoose.connection.close();
    console.log("🔌 Database connection closed");
  }
}

seedDB();