import { Router } from "express";
import {
    createTestimonial,
    getAllTestimonials,
    getTestimonialById,
    updateTestimonial,
    deleteTestimonial,
} from "../controllers/testimonial.controller.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

router.route("/").get(getAllTestimonials);
router.route("/:id").get(getTestimonialById);

router.route("/").post(
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    createTestimonial
);

router.route("/:id").patch(
    upload.fields([
        { name: "video", maxCount: 1 },
        { name: "thumbnail", maxCount: 1 },
    ]),
    updateTestimonial
);

router.route("/:id").delete(deleteTestimonial);


export default router;