"use client";

import { signOut } from "@/lib/auth-client";
import { User } from "@/generated/browser";
import { useRouter } from "next/navigation";

export function LogoutButton({ user }: { user: User | undefined }) {
  const router = useRouter();

  return (
    <>
      {user && (
        <button
          className={
            "cursor-pointer flex mt-4 w-1/2 justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
          }
          onClick={async () => {
            await signOut();
            router.refresh();
          }}
        >
          Log out
        </button>
      )}
    </>
  );
}
