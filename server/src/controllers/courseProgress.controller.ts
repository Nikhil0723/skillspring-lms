import { NextFunction, Request, Response } from "express";
import {
  completeLectureService,
  getCourseProgressService,
  getUserCoursesProgressService,
  updateCurrentLectureService,
} from "../services/courseProgress.service";
import AppError from "../utils/AppError";
import { captureServerEvent } from "../utils/analytics";

export const getCourseProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const progress = await getCourseProgressService(
      user?._id.toString(),
      req.params.courseId as string,
    );

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCurrentLecture = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { courseId } = req.params;
    const { lectureId } = req.body;
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const progress = await updateCurrentLectureService(
      user._id.toString(),
      courseId as string,
      lectureId,
    );

    return res.status(200).json({
      success: true,
      message: "Course progress updated successfully",
      progress,
    });
  } catch (error) {
    next(error);
  }
};

export const completeLecture = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { courseId } = req.params;
    const { lectureId } = req.body;

    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }
    const completion = await completeLectureService(
      user._id.toString(),
      courseId as string,
      lectureId,
    );

    const progress = await getCourseProgressService(user._id.toString() ,courseId as string )
    if (completion.wasNew) {
      captureServerEvent(String(user._id), "lecture completed", {
        course_id: String(courseId),
        lecture_id: String(lectureId),
        progress_percentage: progress.progressPercentage,
      });
      if (progress.progressPercentage === 100) {
        captureServerEvent(String(user._id), "course completed", {
          course_id: String(courseId),
          total_lectures: progress.totalLectures,
        });
      }
    }
    return res.status(200).json({
      success: true,
      message: "Lecture completed successfully",
      progress,
    });
  } catch (error) {
    next(error);
  }
};

export const getUserCoursesProgress = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const user = req.user;

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const userId = user._id.toString();

    const progress = await getUserCoursesProgressService(userId);

    return res.status(200).json({
      success: true,
      progress,
    });
  } catch (error) {
    next(error);
  }
};
