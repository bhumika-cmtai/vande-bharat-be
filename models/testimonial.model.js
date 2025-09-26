import mongoose, { Schema } from "mongoose";

const testimonialSchema = new Schema(
    {
        name: {
            type: String,
            // required: [true, "Name is required"],
            trim: true,
        },
        location: { // "where they from"
            type: String,
            // required: [true, "Location is required"],
            trim: true,
        },
        productName: { // "reviewing which product"
            type: String,
            // required: [true, "Product name is required"],
            trim: true,
        },
        videoUrl: {
            type: String, // URL from S3
            // required: [true, "Video URL is required"],
        },
        thumbnailUrl: {
            type: String, // URL from S3
            // required: [true, "Thumbnail URL is required"],
        },
    },
    {
        timestamps: true,
    }
);

export const Testimonial = mongoose.model("Testimonial", testimonialSchema);