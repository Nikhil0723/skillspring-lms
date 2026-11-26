import { NextFunction, Request, Response } from "express";
import {
  getVideoStatus,
  getVideoUploadCredentials,
} from "../services/vdoCipher.service";
import VideoAsset from "../models/videoAsset.model";
import CourseModel from "../models/course.model";

export const getUploadCredentials = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { title } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Video title is required",
      });
    }

    const data = await getVideoUploadCredentials(title.trim());
    await VideoAsset.updateOne(
      { videoId: data.videoId },
      { $setOnInsert: { videoId: data.videoId, uploadedBy: req.user!._id } },
      { upsert: true },
    );

    return res.status(200).json({
      success: true,
      data: {
        videoId: data.videoId,
        clientPayload: data.clientPayload,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getVideoStatusHandler = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { videoId } = req.body;

    if (!videoId?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Video id is required",
      });
    }

    if (req.user!.role !== "admin") {
      const ownsVideo = await VideoAsset.exists({ videoId: videoId.trim(), uploadedBy: req.user!._id });
      const ownsCourse = await CourseModel.exists({
        instructor: req.user!._id,
        $or: [{ demoUrl: videoId.trim() }, { "courseData.videoUrl": videoId.trim() }],
      });
      if (!ownsVideo && !ownsCourse) {
        return res.status(403).json({ success: false, message: "You do not have access to this video" });
      }
    }

    const data = await getVideoStatus(videoId.trim());

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};
