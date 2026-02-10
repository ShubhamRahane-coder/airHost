import express from "express";
import mongoose from "mongoose";
import session from "express-session";
import flash from "connect-flash";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import ejsMate from "ejs-mate";
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url";

// Models
import User from "./models/user.js";
import Listing from "./models/listing.js";
import Review from "./models/review.js";
import Reservation from "./models/reservation.js"; 


// Middleware
import { validateBody } from "./middleware/validate.js";
import { userRegisterSchema, listingSchema, reviewSchema } from "./schemas/schemas.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ================= ERROR UTILS =================
const asyncWrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

class ExpressError extends Error {
    constructor(statusCode, message) {
        super();
        this.statusCode = statusCode;
        this.message = message;
    }
}

// ================= VIEW ENGINE & MIDDLEWARE =================
app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(methodOverride("_method"));

app.use(session({
    secret: process.env.SESSION_SECRET || "airHost_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        maxAge: 7 * 24 * 60 * 60 * 1000
    }
}));

app.use(flash());

// ================= LOCALS MIDDLEWARE =================

// Keep this one (around line 75)
app.use(asyncWrap(async (req, res, next) => {
    const { userId } = req.session; 
    res.locals.currentUser = userId ? await User.findById(userId).select("username role") : null;
    
    const s = req.flash("success");
    const e = req.flash("error");
    res.locals.success = s.length > 0 ? s : null;
    res.locals.error = e.length > 0 ? e : null;
    next();
}));



// ================= mongoodh middleware to delete =================

// ================= HELPERS & FIXES =================
const isLoggedIn = (req, res, next) => {
    if (!req.session.userId) {
        req.flash("error", "You must be logged in to airHost first!");
        return res.redirect("/login");
    }
    next();
};

const validateObjectId = (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        throw new ExpressError(400, "Invalid ID Format");
    }
    next();
};

// ADD THIS HERE:
const fixAmenities = (req, res, next) => {
    if (req.body.listing) {
        req.body.listing.amenities = req.body.listing.amenities || {};
        const possibleAmenities = ['wifi', 'ac', 'kitchen', 'parking', 'pool', 'gym', 'workspacer', 'pets', 'cctv'];
        
        possibleAmenities.forEach(key => {
            // Converts "on" to true, and missing keys (unchecked) to false
            req.body.listing.amenities[key] = req.body.listing.amenities[key] === 'on';
        });
    }
    next();
};

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/airhost")
    .then(() => console.log("✅ airHost Database Connected"))
    .catch(err => console.error("❌ airHost DB Error:", err));


// ================= AUTH ROUTES =================

app.get("/register", (req, res) => res.render("log/register", { title: "Join airHost" }));

app.post("/register", validateBody(userRegisterSchema), asyncWrap(async (req, res) => {
    try {
        const { username, email, password, phone ,location} = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ username, email, password: hashedPassword, phone, location });
        await user.save(); 
        req.session.userId = user._id;
        req.flash("success", `Welcome to airHost, ${username}!`);
        res.redirect("/");
    } catch (e) {
        req.flash("error", e.code === 11000 ? "Username or Email already exists" : e.message);
        res.redirect("/register");
    }
}));

app.get("/login", (req, res) => res.render("log/login", { title: "Login to airHost" }));

app.post("/login", asyncWrap(async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        req.flash("error", "Invalid username or password");
        return res.redirect("/login");
    }
    req.session.userId = user._id;
    req.flash("success", `Welcome back, ${user.username}!`);
    res.redirect("/");
}));

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

// ================= admin dashborad  ROUTES =================
// ================= ADMIN ROUTES =================

// Middleware to check if user is an Admin
const isAdmin = (req, res, next) => {
    if (res.locals.currentUser?.role !== "admin") {
        req.flash("error", "Access Denied: Administrative privileges required.");
        return res.redirect("/");
    }
    next();
};

// 1. ADMIN DASHBOARD - View all users
app.get("/admin/dashboard", isLoggedIn, asyncWrap(async (req, res) => {

    if (res.locals.currentUser?.role !== "admin") {
        req.flash("error", "Access denied.");
        return res.redirect("/listings");
    }

    const totalListings = await Listing.countDocuments();
    const totalUsers = await User.countDocuments();
    const pendingCount = await Listing.countDocuments({ isVerified: false });

    const revenueResult = await Reservation.aggregate([
        { $match: { status: "Confirmed" } },
        {
            $group: {
                _id: null,
                totalRevenue: { $sum: "$price" }
            }
        }
    ]);

    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.render("admin/adminDashbord", {
        stats: {
            totalListings,
            totalUsers,
            pendingCount,
            totalRevenue
        },
        title: "Admin Dashboard | airHost"
    });
}));


// Route to view All Listings for Admin
app.get("/admin/all-listings", isLoggedIn, asyncWrap(async (req, res) => {
    // 1. Authorization Check
    if (res.locals.currentUser?.role !== "admin") {
        req.flash("error", "Access denied. Admins only.");
        return res.redirect("/listings");
    }

    // 2. Fetch all listings and populate owner details
    const allListings = await Listing.find({})
        .populate("owner", "username email")
        .sort({ createdAt: -1 });

    // 3. Render the page (Passing 'listings' and 'title' to prevent errors)
    res.render("admin/allListings", { 
        listings: allListings, 
        title: "All Properties | Admin" 
    });
}));

app.get("/admin/dashboard/user-management", isLoggedIn, isAdmin, asyncWrap(async (req, res) => {
    // We populate listings to show how many properties each user owns
    const users = await User.find({}).sort({ createdAt: -1 });
    res.render("admin/userManagement", { users, title: "User Management | airHost" });
}));

// 2. INDIVIDUAL ACCESS FORM - Edit a specific user's role
app.get("/admin/users/:id/edit", isLoggedIn, isAdmin, validateObjectId, asyncWrap(async (req, res) => {
    const { id } = req.params;
    
    // We fetch the user AND fill the 'listings' array with actual property data
    const user = await User.findById(id).populate("listings");
    
    if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/admin"); // Or wherever your dashboard lives
    }

    // Ensure the filename 'admin/edit' matches your actual .ejs filename
    res.render("admin/edit", { 
        user, 
        title: `Edit Access: ${user.username}` 
    });
}));



// Route to view All Bookings for Admin
// Route to view All Bookings for Admin
app.get("/admin/bookings", isLoggedIn, asyncWrap(async (req, res) => {
    if (res.locals.currentUser?.role !== "admin") {
        req.flash("error", "Access denied.");
        return res.redirect("/listings");
    }

    // Use 'Reservation' instead of 'Booking'
    const allBookings = await Reservation.find({})
        .populate("listing")
        .populate("guest")
        .sort({ createdAt: -1 });

    res.render("admin/bookings", { 
        bookings: allBookings, 
        title: "Manage Bookings | Admin" 
    });
}));



// CANCEL Route (Not Delete)
app.patch("/admin/bookings/:id/cancel", isLoggedIn, asyncWrap(async (req, res) => {
    if (res.locals.currentUser?.role !== "admin") {
        req.flash("error", "Unauthorized.");
        return res.redirect("/listings");
    }

    const { id } = req.params;

    // We only update the status field
    await Reservation.findByIdAndUpdate(id, { status: "Cancelled" });

    req.flash("success", "Booking status updated to Cancelled.");
    res.redirect("/admin/bookings");
}));





// 3. UPDATE USER ACCESS - Save changes to role/email
// PUT Route to update user details
app.put("/admin/users/:id", isLoggedIn, isAdmin, asyncWrap(async (req, res) => {
    const { id } = req.params;
    const { user: updatedData } = req.body;

    // findByIdAndUpdate handles the mapping of the 'user' object from the form
    const user = await User.findByIdAndUpdate(id, { ...updatedData }, { runValidators: true, new: true });

    if (!user) {
        req.flash("error", "User not found.");
        return res.redirect("/admin");
    }

    req.flash("success", `Account for ${user.username} has been updated.`);
    res.redirect("/admin/users/" + id + "/edit"); 
}));

app.get("/admin/users/:id/stats", isLoggedIn, isAdmin, asyncWrap(async (req, res) => {
    const { id } = req.params;
    
    // 1. Basic Counts & Identity
    // We fetch email and createdAt here so we can send them to the modal
    const user = await User.findById(id).select("username email createdAt");
    const listings = await Listing.find({ owner: id });
    const listingIds = listings.map(l => l._id);

    const totalListings = listings.length;
    const totalReviews = await Review.countDocuments({ 
        $or: [{ author: id }, { listing: { $in: listingIds } }] 
    });

    // 2. CASH IN: What the user spent as a Guest
    const userTrips = await Reservation.find({ guest: id, status: "Confirmed" });
    const totalSpent = userTrips.reduce((acc, curr) => acc + curr.price, 0);

    // 3. CASH OUT: What the user earned as a Host
    const hostReservations = await Reservation.find({ listing: { $in: listingIds }, status: "Confirmed" });
    const totalEarnings = hostReservations.reduce((acc, curr) => acc + curr.price, 0);

    // 4. THE JSON RESPONSE
    res.json({
        username: user.username,
        email: user.email,         // Added for the Modal Header
        joinedAt: user.createdAt,  // Added for the Info Tab
        totalListings,
        totalReviews,
        totalTrips: userTrips.length,
        totalSpent: totalSpent.toLocaleString("en-IN"),
        totalEarnings: totalEarnings.toLocaleString("en-IN")
    });
}));

// 4. CASCADE DELETE - Remove user + their listings + their reviews
app.delete("/admin/users/:id", isLoggedIn, isAdmin, validateObjectId, asyncWrap(async (req, res) => {
    const { id } = req.params;
    
    // 1. SAFETY CHECK: Prevent self-deletion
    // We compare the ID from the URL with the ID stored in the session
    if (id === req.session.userId.toString()) {
        req.flash("error", "Security Alert: You cannot delete the account you are currently logged into.");
        return res.redirect("/admin/dashboard");
    }

    // 2. TRIGGER CASCADE DELETE
    // This single line triggers UserSchema.post("findOneAndDelete") in models/user.js
    // which then cleans up all Listings, Reviews, and Reservations automatically.
    const deletedUser = await User.findByIdAndDelete(id);

    if (!deletedUser) {
        req.flash("error", "User not found.");
        return res.redirect("/admin/dashboard");
    }

    req.flash("success", `Account for ${deletedUser.username} and all linked properties/reviews have been purged.`);
    res.redirect("/admin/dashboard");
}));






// ================= admin verifying LISTING  =================



// Route to view all unverified listings
app.get("/admin/pending-listings", isLoggedIn, asyncWrap(async (req, res) => {
    if (res.locals.currentUser?.role !== "admin") {
        req.flash("error", "Access denied. Admins only.");
        return res.redirect("/listings");
    }

    const pendingListings = await Listing.find({ isVerified: false }).populate("owner", "username");

    res.render("listings/pendingListings", { 
        listings: pendingListings, // Change 'pendingListings' to 'listings' here
        title: "Pending Approval | Admin" 
    });
}));




// ================= LISTING ROUTES =================

app.get("/", asyncWrap(async (req, res) => {
    // 1. Filter: Only find listings where isVerified is explicitly true
    const listings = await Listing.find({ isVerified: true }).populate("owner", "username");
    
    // Passing empty searchData to prevent 'searchData is not defined' in header/navbar
    res.render("listings/index", { 
        listings, 
        searchData: {}, 
        title: "airHost | Vacation Rentals" 
    });
}));

app.post('/listings/find', asyncWrap(async (req, res) => {
    const { location } = req.body;
    const filter = location ? { 
        $or: [
            { location: { $regex: location, $options: "i" } }, 
            { country: { $regex: location, $options: "i" } }
        ] 
    } : {};
    
    const listings = await Listing.find(filter).populate("owner", "username");
    // Pass req.body as searchData so the view knows what was searched
    res.render('listings/find', { listings, searchData: req.body, title: "airHost Search Results" });
}));

// Route to show only the current user's listings
app.get("/user/listings", isLoggedIn, asyncWrap(async (req, res) => {
    const userId = req.session.userId;
    // Find listings where the owner is the logged-in user
    const listings = await Listing.find({ owner: userId }).populate("owner", "username");
    
    // We reuse the 'find.ejs' view but pass a custom title
    res.render("listings/find", { 
        listings, 
        searchData: { location: "Your Properties" }, 
        title: "My Listings | airHost" 
    });
}));

app.get("/listings/new", isLoggedIn, (req, res) => {
    // Pass isEdit: false and an empty listing object so the form doesn't crash
    res.render("listings/new", { 
        title: "Become an airHost", 
        isEdit: false, 
        listing: {} 
    });
});


app.post("/listings/createListing", isLoggedIn, fixAmenities, validateBody(listingSchema), asyncWrap(async (req, res) => {
    // 1. Extract listing data (already cleaned by fixAmenities middleware)
    const { listing } = req.body;

    // 2. Ensure Numeric Fields are valid numbers
    // Note: We use || 0 to prevent NaN if the user leaves optional fields blank
    listing.price = Number(listing.price);
    listing.cleaningFee = Number(listing.cleaningFee || 0);
    listing.serviceFeePct = Number(listing.serviceFeePct || 3);
    listing.guests = Number(listing.guests || 1);

    // 3. Create the Listing
    const newListing = new Listing({ 
        ...listing, 
        owner: req.session.userId // FIXED: Using manual session ID instead of req.user
    });

    // 4. Save and Redirect
    await newListing.save();
    
    req.flash("success", "New airHost listing created!");
    res.redirect(`/listings/${newListing._id}`);
}));

app.get("/listings/:id", validateObjectId, asyncWrap(async (req, res) => {
    const listing = await Listing.findById(req.params.id)
        .populate("owner", "username")
        .populate({ path: "reviews", populate: { path: "author", select: "username" } });
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/");
    }
    res.render("listings/show", { listing, title: listing.title });
}));

app.get("/listings/:id/edit", isLoggedIn, validateObjectId, asyncWrap(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    const isAdmin = res.locals.currentUser?.role === "admin";
    
    if (!listing.owner.equals(req.session.userId) && !isAdmin) {
        req.flash("error", "Permission denied.");
        return res.redirect(`/listings/${req.params.id}`);
    }
    // Pass isEdit: true and the existing listing data
    res.render("listings/edit", { 
        listing, 
        isEdit: true, 
        title: "Edit airHost Listing" 
    });
}));

app.put("/listings/:id", isLoggedIn, validateObjectId, fixAmenities, validateBody(listingSchema), asyncWrap(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    
    // Authorization Check
    const isAdmin = res.locals.currentUser?.role === "admin";
    if (!listing.owner.equals(req.session.userId) && !isAdmin) {
        req.flash("error", "Unauthorized.");
        return res.redirect(`/listings/${id}`);
    }

    // 1. Extract cleaned data from body
    const updateData = { ...req.body.listing };

    // 2. Clean up Numeric Fields
    updateData.price = Number(updateData.price);
    updateData.cleaningFee = Number(updateData.cleaningFee || 0);
    updateData.serviceFeePct = Number(updateData.serviceFeePct || 3);
    updateData.guests = Number(updateData.guests || 1);

    // 3. Logic for isVerified (Boolean Conversion)
    // Only allow update if isVerified is present in the request
    if (updateData.isVerified !== undefined) {
        // Form sends "true"/"false" as strings, we need actual Booleans
        updateData.isVerified = updateData.isVerified === "true";
    }

    // 4. Security: If NOT an admin, delete isVerified from updateData 
    // This prevents malicious users from injecting "isVerified: true" via Postman
    if (!isAdmin) {
        delete updateData.isVerified;
    }

    // 5. Update the Database
    await Listing.findByIdAndUpdate(id, updateData, { runValidators: true });

    req.flash("success", "Updated successfully!");
    res.redirect(`/listings/${id}`);
}));

app.delete("/listings/:id", isLoggedIn, validateObjectId, asyncWrap(async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);

    // 1. Authorization Check
    const isAdmin = res.locals.currentUser?.role === "admin";
    if (!listing || (!listing.owner.equals(req.session.userId) && !isAdmin)) {
        req.flash("error", "Unauthorized or Listing not found.");
        return res.redirect("/");
    }

    // 2. Simple Removal
    // This triggers listingSchema.post("findOneAndDelete") in listing.js
    // which automatically purges related Reviews and Reservations.
    await Listing.findByIdAndDelete(id); 
    
    req.flash("success", "Listing and all associated data removed.");
    res.redirect("/");
}));

// ================= REVIEW ROUTES =================

app.post("/listings/:id/reviews", isLoggedIn, validateObjectId, validateBody(reviewSchema), async (req, res, next) => {
    try {
        const review = new Review({ 
            ...req.body, 
            author: req.session.userId, 
            listing: req.params.id 
        });

        // 1. Manually try to save
        await review.save();

        // 2. If successful, link to listing and redirect
        await Listing.findByIdAndUpdate(req.params.id, { $push: { reviews: review._id } });
        req.flash("success", "Review added!");
        res.redirect(`/listings/${req.params.id}`);

    } catch (err) {
        // 3. If Mongoose validation fails, catch it HERE
        if (err.name === "ValidationError") {
            const msg = Object.values(err.errors).map(el => el.message).join(", ");
            req.flash("error", msg);
            return res.redirect(`/listings/${req.params.id}`); // Redirect back to the listing
        }
        // 4. If it's a different scary error (database down), send it to the global handler
        next(err);
    }
});

app.delete("/reviews/:id", isLoggedIn, asyncWrap(async (req, res) => {
    const review = await Review.findById(req.params.id);
    const isAdmin = res.locals.currentUser?.role === "admin";
    if (!review.author.equals(req.session.userId) && !isAdmin) {
        req.flash("error", "Unauthorized.");
        return res.redirect("/");
    }
    await Listing.findByIdAndUpdate(review.listing, { $pull: { reviews: req.params.id } });
    await Review.findByIdAndDelete(req.params.id);
    req.flash("success", "Review removed.");
    res.redirect(`/listings/${review.listing}`);
}));



// / ================= user Profile SECTION =================

app.get("/profile", isLoggedIn, asyncWrap(async (req, res) => {
    const userId = req.session.userId;

    // Fetch counts from database
    const listingsCount = await Listing.countDocuments({ owner: userId });
    const reservationsCount = await Reservation.countDocuments({ guest: userId });

    res.render("dashboard/profile", { 
        title: "My Profile | airHost", 
        listingsCount, 
        reservationsCount 
    });
}));


// / ================= Dashboard SECTION =================

app.get("/dashboard/reservations", isLoggedIn, asyncWrap(async (req, res) => {
    // 1. Find listings and sort them by 'createdAt' in descending order (-1)
    const listings = await Listing.find({ owner: req.session.userId })
        .sort({ createdAt: -1 }) 
        .populate({
            path: 'reservations',
            // 2. Sort the nested reservations by 'createdAt' descending so newest bookings are first
            options: { sort: { 'createdAt': -1 } }, 
            populate: { path: 'guest', select: 'username' }
        });

    res.render("dashboard/reservationDashboard", { 
        listings, 
        title: "Reservation Dashboard | airHost" 
    });
}));

// ================= USER BOOKING HISTORY =================
app.get("/dashboard/trips/history", isLoggedIn, asyncWrap(async (req, res) => {
    // Find reservations made by the logged-in user
    const reservations = await Reservation.find({ guest: req.session.userId })
        .populate("listing") // To show the property name/image
        .sort({ createdAt: -1 }); // Newest bookings first

    res.render("dashboard/userHistory", { 
        reservations, 
        title: "My Trips | airHost" 
    });
}));

// Route for guests to mark their trip as Cancelled (Soft Delete)
app.put("/dashboard/trips/:id/cancel", isLoggedIn, asyncWrap(async (req, res) => {
    const { id } = req.params;
    const reservation = await Reservation.findById(id);

    if (!reservation) {
        req.flash("error", "Reservation not found.");
        return res.redirect("/dashboard/trips/history");
    }

    // Security Check: Ensure the guest owns this reservation
    if (!reservation.guest.equals(req.session.userId)) {
        req.flash("error", "Unauthorized action.");
        return res.redirect("/dashboard/trips/history");
    }

    // Instead of deleting, we update the status
    await Reservation.findByIdAndUpdate(id, { status: "Cancelled" });

    req.flash("success", "Trip has been cancelled. It will remain in your history.");
    res.redirect("/dashboard/trips/history");
}));


// Route to update reservation details (The "Reflex")
// Route to update reservation details (The "Reflex")
app.put("/dashboard/reservations/:id", isLoggedIn, asyncWrap(async (req, res) => {
    const { id } = req.params;
    const { reservation } = req.body;

    // 1. Fetch the existing reservation first
    const existingReservation = await Reservation.findById(id);

    if (!existingReservation) {
        req.flash("error", "Reservation not found.");
        return res.redirect("/dashboard/reservations");
    }

    // 2. BLOCKER: Check if the guest has already cancelled it
    if (existingReservation.status === "Cancelled") {
        req.flash("error", "This reservation has been cancelled by the guest and cannot be modified.");
        return res.redirect("/dashboard/reservations");
    }

    // 3. Convert checkbox 'on' value to Boolean (for your verification toggle)
    if(req.body.reservation) {
        reservation.isVerified = req.body.reservation.isVerified === 'on';
    }

    // 4. Proceed with update if not cancelled
    await Reservation.findByIdAndUpdate(id, { ...reservation }, { new: true });
    
    req.flash("success", "Reservation details updated!");
    res.redirect("/dashboard/reservations");
}));


app.delete("/dashboard/reservations/:id", isLoggedIn, asyncWrap(async (req, res) => {
    const { id } = req.params;
    
    // 1. Find the reservation to get the listing ID it belongs to
    const reservation = await Reservation.findById(id);
    if (reservation) {
        // 2. Remove the reservation reference from the Listing
        await Listing.findByIdAndUpdate(reservation.listing, { $pull: { reservations: id } });
        // 3. Delete the actual reservation
        await Reservation.findByIdAndDelete(id);
    }

    req.flash("success", "Reservation deleted.");
    res.redirect("/dashboard/reservations");
}));


app.post("/listings/:id/reserve", isLoggedIn, asyncWrap(async (req, res) => {
    const { id } = req.params;
    const { checkIn, checkOut, adults, children } = req.body.reservation;

    // 1. Fetch the listing to get the AUTHORITATIVE prices
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Listing not found!");
        return res.redirect("/");
    }

    // 2. Calculate Date Difference (Days)
    const d1 = new Date(checkIn);
    const d2 = new Date(checkOut);
    const diffTime = d2 - d1;
    const dayCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (dayCount <= 0) {
        req.flash("error", "Invalid check-in/check-out dates.");
        return res.redirect(`/listings/${id}`);
    }

    // 3. The Math (Replicating your EJS Logic)
    const basePrice = listing.price * dayCount;
    const cleaningFee = listing.cleaningFee || 0;
    const serviceFee = Math.round(basePrice * ((listing.serviceFeePct || 0) / 100));
    
    const subtotal = basePrice + cleaningFee + serviceFee;
    const gst = Math.round(subtotal * 0.18); // 18% GST
    const finalCalculatedTotal = subtotal + gst;

    // 4. Create the Reservation with the verified price
    const newReservation = new Reservation({
        checkIn,
        checkOut,
        price: finalCalculatedTotal, // This is the final 18% GST included price
        guests: {
            adults: parseInt(adults) || 1,
            children: parseInt(children) || 0
        },
        guest: req.session.userId,
        listing: id,
        status: "Pending"
    });

    await newReservation.save();
    await Listing.findByIdAndUpdate(id, { $push: { reservations: newReservation._id } });

    req.flash("success", `Reservation sent! Total: ₹${finalCalculatedTotal.toLocaleString("en-IN")}`);
    res.redirect(`/listings/${id}`);
}));

// / ================= HELP SECTION =================
app.get("/help", (req, res) => {
    res.render("helpPages/help", { title: "Help Centre | airHost" });
});

// Route to display the Host Guidance Page
app.get("/host/guidance", (req, res) => {
    res.render("helpPages/guidance", { title: "Host Guidance | airHost" });
});
app.get("/info/webAppCreater",(req, res) => {
    res.render("helpPages/webOwner", { title: "Web App Creators | airHost" });
});


// ================= ERROR HANDLING =================

// FIX: Use a Regex literal to bypass path-to-regexp string parsing crash
// ================= FINAL ERROR HANDLING =================

app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;

    // SAFETY NET: If any route hits a Mongoose Validation error 
    // and you didn't catch it locally, this catches it here.
    if (err.name === "ValidationError") {
        const flashMsg = Object.values(err.errors).map(el => el.message).join(", ");
        req.flash("error", flashMsg);
        return res.redirect("back"); // Keeps user on the form!
    }

    // Only actual 404s or serious Server Crashes show the error page
    res.status(statusCode).render("error/error", { 
        err, 
        message, 
        title: "Error", 
        searchData: {} 
    });
}); 

app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 airHost Server running on http://localhost:${PORT}`);
});