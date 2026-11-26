import "dotenv/config";
import mongoose from "mongoose";
import CourseModel from "../models/course.model";
import redis from "../utils/redis";
import { calcCourseTotalHours } from "../utils/helper";
import { invalidateCourseCaches } from "../utils/courseCache";
import { getVideoStatus } from "../services/vdoCipher.service";

const LEGACY_VIDEO_IDS = new Set([
  "4574067e9bdb4423ad82edba960dc822",
  "82b2350d035bca04a2806467f53b6b51",
  "3eb2d7b0f8224620bdfb76cf174f36aa",
  "1baa2441413d4d8da3da8040309e95d2",
]);

const run = async () => {
  const replacementId = (process.env.DEMO_VDOCIPHER_VIDEO_IDS || "")
    .split(",")[0]
    ?.trim();
  if (!replacementId) throw new Error("Set DEMO_VDOCIPHER_VIDEO_IDS in server/.env");

  const video = await getVideoStatus(replacementId);
  if (video.state !== "ready") {
    throw new Error(`VdoCipher video ${replacementId} is ${video.status}; wait until it is ready`);
  }
  if (video.lengthSeconds <= 0) throw new Error(`VdoCipher video ${replacementId} has no duration yet`);
  const durationMinutes = Number((video.lengthSeconds / 60).toFixed(4));
  await mongoose.connect(process.env.DB_URL as string);

  const courses = await CourseModel.find({ tags: /seed:catalog/ });
  let affectedCourses = 0;
  let affectedLectures = 0;
  const apply = process.argv.includes("--apply") || process.argv.includes("--yes");

  for (const course of courses) {
    let changed = false;
    for (const lecture of course.courseData) {
      if (!LEGACY_VIDEO_IDS.has(lecture.videoUrl) && lecture.videoUrl !== replacementId) continue;
      if (lecture.videoUrl === replacementId && lecture.videoLength === durationMinutes) continue;
      lecture.videoUrl = replacementId;
      lecture.videoLength = durationMinutes;
      affectedLectures += 1;
      changed = true;
    }
    if (LEGACY_VIDEO_IDS.has(course.demoUrl)) {
      course.demoUrl = replacementId;
      changed = true;
    }
    if (!changed) continue;
    affectedCourses += 1;
    if (!apply) continue;
    course.totalHours = calcCourseTotalHours(course.courseData);
    await course.save({ validateBeforeSave: false });
    await invalidateCourseCaches(String(course._id), String(course.organization));
  }

  console.log(`${apply ? "Updated" : "Would update"} ${affectedCourses} seeded courses and ${affectedLectures} lectures`);
  if (!apply) console.log("Run with --apply to apply the repair");
};

run()
  .catch((error) => { console.error(error.message); process.exitCode = 1; })
  .finally(async () => {
    await mongoose.disconnect();
    redis.disconnect();
  });
