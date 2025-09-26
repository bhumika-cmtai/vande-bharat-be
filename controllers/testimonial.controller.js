import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Testimonial } from "../models/testimonial.model.js";
import { uploadOnS3, deleteFromS3, getObjectKeyFromUrl } from "../config/s3.js";

// --- CREATE a new Testimonial ---
const createTestimonial = asyncHandler(async (req, res) => {
    const { name, location, productName } = req.body;

    // 1. Validate text fields
    if ([name, location, productName].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields (name, location, productName) are required.");
    }

    // 2. Validate file uploads
    const videoLocalPath = req.files?.video?.[0]?.path;
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    if (!videoLocalPath) {
        throw new ApiError(400, "Testimonial video file is required.");
    }
    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Video thumbnail file is required.");
    }

    // 3. Upload files to S3
    const videoUploadResult = await uploadOnS3(videoLocalPath, "testimonials/videos");
    const thumbnailUploadResult = await uploadOnS3(thumbnailLocalPath, "testimonials/thumbnails");

    if (!videoUploadResult?.url) {
        throw new ApiError(500, "Failed to upload video to S3.");
    }
    if (!thumbnailUploadResult?.url) {
        // Agar thumbnail fail hota hai to video bhi S3 se delete kardo
        await deleteFromS3(videoUploadResult.key);
        throw new ApiError(500, "Failed to upload thumbnail to S3.");
    }

    // 4. Create document in DB
    const testimonial = await Testimonial.create({
        name,
        location,
        productName,
        videoUrl: videoUploadResult.url,
        thumbnailUrl: thumbnailUploadResult.url,
    });

    if (!testimonial) {
        throw new ApiError(500, "Something went wrong while creating the testimonial.");
    }

    // 5. Return response
    return res.status(201).json(
        new ApiResponse(201, testimonial, "Testimonial created successfully.")
    );
});

// --- GET All Testimonials ---
const getAllTestimonials = asyncHandler(async (req, res) => {
    const testimonials = await Testimonial.find({}).sort({ createdAt: -1 });
    // console.log(testimonials)

    return res.status(200).json(
        new ApiResponse(200, testimonials, "Testimonials fetched successfully.")
    );
});


// --- GET a Single Testimonial by ID ---
const getTestimonialById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const testimonial = await Testimonial.findById(id);

    if (!testimonial) {
        throw new ApiError(404, "Testimonial not found.");
    }

    return res.status(200).json(
        new ApiResponse(200, testimonial, "Testimonial fetched successfully.")
    );
});


// --- UPDATE a Testimonial ---
// Note: This is a bit complex as it handles optional file updates.
const updateTestimonial = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, location, productName } = req.body;

    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
        throw new ApiError(404, "Testimonial not found.");
    }

    // Check for new files
    const newVideoLocalPath = req.files?.video?.[0]?.path;
    const newThumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

    let newVideoUrl = testimonial.videoUrl;
    let newThumbnailUrl = testimonial.thumbnailUrl;

    // If new video is uploaded, replace the old one on S3
    if (newVideoLocalPath) {
        const oldVideoKey = getObjectKeyFromUrl(testimonial.videoUrl);
        const newVideoUploadResult = await uploadOnS3(newVideoLocalPath, "testimonials/videos");
        if (!newVideoUploadResult?.url) throw new ApiError(500, "Failed to upload new video.");
        newVideoUrl = newVideoUploadResult.url;
        await deleteFromS3(oldVideoKey); // Delete old one after new one is uploaded
    }
    
    // If new thumbnail is uploaded, replace the old one on S3
    if (newThumbnailLocalPath) {
        const oldThumbnailKey = getObjectKeyFromUrl(testimonial.thumbnailUrl);
        const newThumbnailUploadResult = await uploadOnS3(newThumbnailLocalPath, "testimonials/thumbnails");
        if (!newThumbnailUploadResult?.url) throw new ApiError(500, "Failed to upload new thumbnail.");
        newThumbnailUrl = newThumbnailUploadResult.url;
        await deleteFromS3(oldThumbnailKey);
    }
    
    // Update the fields in the document
    testimonial.name = name || testimonial.name;
    testimonial.location = location || testimonial.location;
    testimonial.productName = productName || testimonial.productName;
    testimonial.videoUrl = newVideoUrl;
    testimonial.thumbnailUrl = newThumbnailUrl;

    const updatedTestimonial = await testimonial.save({ validateBeforeSave: false });

    return res.status(200).json(
        new ApiResponse(200, updatedTestimonial, "Testimonial updated successfully.")
    );
});

// --- DELETE a Testimonial ---
const deleteTestimonial = asyncHandler(async (req, res) => {
    const { id } = req.params;
    
    // 1. Find the testimonial in DB to get file URLs
    const testimonial = await Testimonial.findById(id);
    if (!testimonial) {
        throw new ApiError(404, "Testimonial not found.");
    }

    // 2. Get S3 object keys from URLs
    const videoKey = getObjectKeyFromUrl(testimonial.videoUrl);
    const thumbnailKey = getObjectKeyFromUrl(testimonial.thumbnailUrl);

    // 3. Delete files from S3
    await Promise.all([
        deleteFromS3(videoKey),
        deleteFromS3(thumbnailKey)
    ]);

    // 4. Delete the document from DB
    await Testimonial.findByIdAndDelete(id);

    return res.status(200).json(
        new ApiResponse(200, {}, "Testimonial deleted successfully.")
    );
});


export {
    createTestimonial,
    getAllTestimonials,
    getTestimonialById,
    updateTestimonial,
    deleteTestimonial,
};