"use client";

import CoursePlayerSkeleton from "@/components/skeleton/CoursePlayerSkeleton";
import { generateVdoOtp } from "@/lib/api/generateVdoOtp";
import { useMutation } from "@tanstack/react-query";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

type Props = {
  videoUrl: string | undefined;
  title: string | undefined;
  onVideoEnded?: () => void;
};

export default function CoursePlayer({ title, videoUrl, onVideoEnded }: Props) {
  const [videoData, setVideoData] = useState({
    otp: "",
    playbackInfo: "",
  });

  const [isPlayerLoading, setIsPlayerLoading] = useState(true);
  const [isVdoApiReady, setIsVdoApiReady] = useState(false);
  const [isIframeReady, setIsIframeReady] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const onVideoEndedRef = useRef(onVideoEnded);

  useEffect(() => {
    onVideoEndedRef.current = onVideoEnded;
  }, [onVideoEnded]);

   const { mutate: requestOtp, isError: isOtpError, error: otpError } = useMutation({
    mutationFn: generateVdoOtp,

    onSuccess: (data) => {
      setVideoData({
        otp: data.otp,
        playbackInfo: data.playbackInfo,
      });
    },

    onError: () => {
      setIsPlayerLoading(false);
    },
  });


  
    // Get OTP every change video url
   
  useEffect(() => {
    if (!videoUrl) {
      return;
    }

    setVideoData({
      otp: "",
      playbackInfo: "",
    });

    setIsIframeReady(false);
    setIsPlayerLoading(true);

    requestOtp({
      videoId: videoUrl,
    });

  }, [videoUrl, requestOtp]);

  
   // Setup VdoCipher player
   
  useEffect(() => {
    if (!isVdoApiReady || !isIframeReady || !iframeRef.current) return;
    const player = (window as any).VdoPlayer?.getInstance(iframeRef.current);
    if (!player?.video) return;
    const handleVideoEnded = () => onVideoEndedRef.current?.();
    player.video.addEventListener("ended", handleVideoEnded);
    return () => player.video.removeEventListener("ended", handleVideoEnded);
  }, [isVdoApiReady, isIframeReady, videoData.playbackInfo]);

  const hasVideoData =
    Boolean(videoData.otp) && Boolean(videoData.playbackInfo);

  return (
    <div className="relative w-full">
      <Script
        src="https://player.vdocipher.com/v2/api.js"
        strategy="afterInteractive"
        onReady={() => setIsVdoApiReady(Boolean((window as any).VdoPlayer))}
        onError={(error) => {
          console.error("VdoCipher API script failed to load:", error);
        }}
      />

      {isPlayerLoading && (
        <div className="aspect-video w-full">
          <CoursePlayerSkeleton />
        </div>
      )}

      {isOtpError && (
        <div className="flex aspect-video w-full items-center justify-center bg-muted/40">
          <div className="text-center">
            <p className="text-sm font-medium text-destructive">
              Failed to load video
            </p>

            <p className="mt-1 text-xs text-muted-foreground">
              {otpError.message}
            </p>
          </div>
        </div>
      )}

      {hasVideoData && (
        <div
          className={`aspect-video w-full overflow-hidden transition-opacity duration-300 ${
            isPlayerLoading
              ? "absolute inset-0 opacity-0"
              : "relative opacity-100"
          }`}>
          <iframe
            key={videoData.playbackInfo}
            ref={iframeRef}
            title={title || "Course video"}
            src={`https://player.vdocipher.com/v2/?otp=${encodeURIComponent(
              videoData.otp,
            )}&playbackInfo=${encodeURIComponent(videoData.playbackInfo)}`}
            className="block h-full w-full border-0"
            allow="encrypted-media; fullscreen"
            allowFullScreen
            onLoad={() => {
              setIsIframeReady(true);
              setIsPlayerLoading(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
