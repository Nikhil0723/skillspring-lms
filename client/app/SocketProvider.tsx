"use client";
import { socket } from "@/lib/socket";
import React, { useEffect } from "react";

export default function SocketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    socket.connect();
  }, []);
  return children;
}
