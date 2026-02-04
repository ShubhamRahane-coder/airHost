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
app.use(asyncWrap(async (req, res, next) => {
    const { userId } = req.session; 
    res.locals.currentUser = userId ? await User.findById(userId).select("username role") : null;
    // req.flash() returns an array; ensure it's available to all EJS templates
    res.locals.success = req.flash("success") || [];
    res.locals.error = req.flash("error") || [];
    next();
}));

// ================= HELPERS =================
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

// ================= DATABASE =================
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/airhost")
    .then(() => console.log("✅ airHost Database Connected"))
    .catch(err => console.error("❌ airHost DB Error:", err));


// ================= AUTH ROUTES =================

app.get("/register", (req, res) => res.render("log/register", { title: "Join airHost" }));

app.post("/register", validateBody(userRegisterSchema), asyncWrap(async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 12);
        const user = new User({ username, email, password: hashedPassword });
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
    req.flash("success", "Welcome back!");
    res.redirect("/");
}));

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

// ================= LISTING ROUTES =================

app.get("/", asyncWrap(async (req, res) => {
    const listings = await Listing.find({}).populate("owner", "username");
    // Passing empty searchData to prevent 'searchData is not defined' in header/navbar
    res.render("listings/index", { listings, searchData: {}, title: "airHost | Vacation Rentals" });
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

app.get("/listings/new", isLoggedIn, (req, res) => res.render("listings/new", { title: "Become an airHost" }));

app.post("/listings/createListing", isLoggedIn, validateBody(listingSchema), asyncWrap(async (req, res) => {
    const newListing = new Listing({ ...req.body.listing, owner: req.session.userId });
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
    res.render("listings/edit", { listing, title: "Edit airHost Listing" });
}));

app.put("/listings/:id", isLoggedIn, validateObjectId, validateBody(listingSchema), asyncWrap(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    const isAdmin = res.locals.currentUser?.role === "admin";
    if (!listing.owner.equals(req.session.userId) && !isAdmin) {
        req.flash("error", "Unauthorized.");
        return res.redirect(`/listings/${req.params.id}`);
    }
    await Listing.findByIdAndUpdate(req.params.id, { ...req.body.listing });
    req.flash("success", "Updated successfully!");
    res.redirect(`/listings/${req.params.id}`);
}));

app.delete("/listings/:id", isLoggedIn, validateObjectId, asyncWrap(async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    const isAdmin = res.locals.currentUser?.role === "admin";
    if (!listing.owner.equals(req.session.userId) && !isAdmin) {
        req.flash("error", "Unauthorized.");
        return res.redirect("/");
    }
    await Listing.findByIdAndDelete(req.params.id);
    req.flash("success", "Listing removed.");
    res.redirect("/");
}));

// ================= REVIEW ROUTES =================

app.post("/listings/:id/reviews", isLoggedIn, validateObjectId, validateBody(reviewSchema), asyncWrap(async (req, res) => {
    // req.body now contains { rating, comment }
    const review = new Review({ 
        ...req.body, 
        author: req.session.userId, 
        listing: req.params.id 
    });
    await review.save();
    await Listing.findByIdAndUpdate(req.params.id, { $push: { reviews: review._id } });
    req.flash("success", "Review added!");
    res.redirect(`/listings/${req.params.id}`);
}));

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
    // You can also fetch specific user listings here to display them
    res.render("user/profile", { title: "My Profile | airHost" });
}));




// / ================= HELP SECTION =================
app.get("/help", (req, res) => {
    res.render("listings/help", { title: "Help Centre | airHost" });
});



// ================= ERROR HANDLING =================

// FIX: Use a Regex literal to bypass path-to-regexp string parsing crash
app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
    let { statusCode = 500, message = "Something went wrong" } = err;
    // Always provide empty searchData to avoid crashes on error pages
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