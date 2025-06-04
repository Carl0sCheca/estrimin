"use client";

import Link from "next/link";
import { FaUser } from "react-icons/fa";

interface Props {
  isVisible: boolean;
}

export const UserVideoButton = ({ isVisible }: Props) => {
  return (
    <div className={`right-0 w-16 h-16 absolute`}>
      <Link
        href="/user"
        className={`w-full h-full flex items-center justify-center ${
          isVisible ? "" : "pointer-events-none"
        }`}
      >
        <FaUser
          size={42}
          className="cursor-pointer text-white hover:text-primary-500"
        />
      </Link>
    </div>
  );
};
