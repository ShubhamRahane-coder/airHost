import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

// Configure this specific instance RIGHT NOW
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary, // This instance now carries the keys
    params: {
        folder: 'AirHost_Listings',
        allowedFormats: ["png", "jpg", "jpeg"]
    },
});

export { cloudinary, storage };