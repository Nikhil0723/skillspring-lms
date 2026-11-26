"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { updateAvatar } from "@/lib/api/updateAvatar";
import { updateMe } from "@/lib/api/updateMe";
import { useAppDispatch, useAppSelector } from "@/redux/hooks";
import { setUser } from "@/redux/features/auth/authSlice";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function useMyAccount() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingFileRef = useRef<File | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
  });

  const [preview, setPreview] = useState("/image.png");

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState("");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    if (!user) return;

    setFormData({
      name: user.name,
      email: user.email,
    });

    setPreview(user.avatar?.url || "/image.png");
  }, [user]);

  const handleSelectImage = () => {
    fileInputRef.current?.click();
  };

  const releasePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    pendingFileRef.current = null;

    setPreviewImage(null);
    setPendingFileName("");
    setIsPreviewOpen(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    e.target.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");

      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("Image must be smaller than 5 MB.");

      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const url = URL.createObjectURL(file);

    previewUrlRef.current = url;
    pendingFileRef.current = file;

    setPreviewImage(url);
    setPendingFileName(file.name);
    setIsPreviewOpen(true);
  };

  const uploadAvatarMutation = useMutation({
    mutationFn: updateAvatar,

    onSuccess: (data) => {
      toast.success("Avatar uploaded successfully!");

      dispatch(setUser(data.user));

      releasePreview();
    },

    onError: (error: Error) => {
      toast.error(
        error.message ||
          "Failed to upload avatar. Please try again.",
      );
    },
  });

  const editProfileMutation = useMutation({
    mutationFn: updateMe,

    onSuccess: (data) => {
      toast.success("Profile updated successfully!");

      dispatch(setUser(data.user));
    },

    onError: (error: Error) => {
      toast.error(
        error.message ||
          "Failed to update profile. Please try again.",
      );
    },
  });

  const saveAvatar = () => {
    const file = pendingFileRef.current;

    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      uploadAvatarMutation.mutate(reader.result as string);
    };

    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    e.preventDefault();

    const oldName = user?.name ?? "";

    if (formData.name.trim() === oldName.trim()) {
      toast.error("No changes detected.");
      return;
    }

    editProfileMutation.mutate({
      name: formData.name.trim(),
    });
  };

  return {
    user,

    formData,
    setFormData,

    preview,

    previewImage,
    pendingFileName,
    isPreviewOpen,

    fileInputRef,

    handleSelectImage,
    handleFileChange,
    releasePreview,
    saveAvatar,
    handleUpdateProfile,

    uploadLoading: uploadAvatarMutation.isPending,
    updateLoading: editProfileMutation.isPending,
  };
}
