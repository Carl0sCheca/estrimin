"use client";

import Link from "next/link";
import { FaUser } from "react-icons/fa";

export const UserVideoButton = () => {
  return (
    <div className={`right-0 w-16 h-16 absolute`}>
      <Link
        href="/user"
        className="w-full h-full flex items-center justify-center"
      >
        <FaUser className="w-4/5 h-4/5 cursor-pointer text-white hover:text-primary-500" />
      </Link>
    </div>
  );
};
