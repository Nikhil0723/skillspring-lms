"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, Search } from "lucide-react";

import MobileMenu from "./MobileMenu";

import { Button } from "../ui/button";
import { usePathname } from "next/navigation";
import UserMenu from "./UserMenu";
import { useAppDispatch } from "@/redux/hooks";
import { openLoginModal } from "@/redux/features/ui/uiSlice";
import Brand from "./Brand";

type Props = {
  isCoursesPage?: boolean;
  setSearchOpen?: (searchOpen: boolean) => void;
};
export default function Header({ isCoursesPage, setSearchOpen }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dispatch = useAppDispatch();
  const pathname = usePathname();
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Courses", href: "/courses" },
    { label: "About", href: "/about" },
    { label: "Policy", href: "/policy" },
    { label: "FAQ", href: "/faq" },
    { label: "Support", href: "/support/create-ticket" },
  ];

  useEffect(() => {
    if (pathname === "/verification") {
      setIsOpen(false);
    }
  }, [pathname]);
  return (
    <>
      <header
        className="
          sticky
          top-0
          z-40
          w-full
          bg-background/80
          backdrop-blur-xl
        ">
        <div
          className="
            mx-auto
            flex
            h-16
            container
            items-center
            justify-between
            px-4
            md:px-6
          ">

          <Link href="/" className="flex items-center gap-3">
            <Brand showTagline />
          </Link>


          <div className="hidden items-center gap-4 md:flex">
            {isCoursesPage && (
              <button
                type="button"
                onClick={() => {
                  if (!setSearchOpen) return;
                  setSearchOpen(true);
                }}
                aria-label="Search"
                className="
    inline-flex
    size-9
    cursor-pointer
    items-center
    justify-center
    rounded-full
    border
    border-border
    bg-muted
    text-foreground
    shadow-sm
    transition-colors
    hover:bg-accent
  ">
                <Search className="size-4.5" />
              </button>
            )}
            <nav className="flex items-center gap-2">
              {navItems.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);

                return (
                  <Link key={item.label} href={item.href}>
                    <Button
                      variant="ghost"
                      className={
                        isActive ? "bg-accent text-accent-foreground" : ""
                      }>
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <UserMenu />
          </div>


          <div className="flex items-center gap-2 md:hidden">
            <Button
              className="bg-accent text-accent-foreground"
              variant="ghost"
              onClick={() => dispatch(openLoginModal())}>
              Login
            </Button>

            <Button size="icon" variant="ghost" onClick={() => setIsOpen(true)}>
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </header>

      <MobileMenu isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
