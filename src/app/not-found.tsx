import { GoBackButton } from "@/components";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
};

interface Props {
  message?: string;
  goBack?: boolean;
}

export default function NotFound({ message = "", goBack = false }: Props = {}) {
  return (
    <section>
      <div
        className={"py-8 px-4 mx-auto max-w-(--breakpoint-xl) lg:py-16 lg:px-6"}
      >
        <div className={"mx-auto max-w-(--breakpoint-sm) text-center"}>
          <h1
            className={
              "mb-4 text-7xl tracking-tight font-extrabold lg:text-9xl text-primary-600"
            }
          >
            404
          </h1>
          <p
            className={
              "mb-4 text-3xl tracking-tight font-bold text-gray-900 dark:text-gray-100 md:text-4xl"
            }
          >
            {"Something's missing."}
          </p>
          <p
            className={
              "mb-4 text-lg font-light text-gray-500 dark:text-gray-300"
            }
          >
            {message}
          </p>
          {goBack && <GoBackButton />}
        </div>
      </div>
    </section>
  );
}
