"use client";

import Link from "next/link";
import { FaUser } from "react-icons/fa";
import { IoLogInOutline } from "react-icons/io5";

interface Props {
  isVisible: boolean;
  isLogged: boolean;
}

export const UserVideoButton = ({ isVisible, isLogged }: Props) => {
  return (
    <div className={`right-0 w-16 h-16 absolute`}>
      <Link
        href="/user"
        className={`w-full h-full flex items-center justify-center ${
          isVisible ? "" : "pointer-events-none"
        }`}
      >
        {!isLogged && (
          <IoLogInOutline
            size={42}
            className="cursor-pointer text-white hover:text-primary-500"
          />
        )}

        {isLogged && (
          <FaUser
            size={42}
            className="cursor-pointer text-white hover:text-primary-500"
          />
        )}
      </Link>
    </div>
  );
};
