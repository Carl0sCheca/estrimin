import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Not found",
};

export default function NotFound() {
  return (
    <section>
      <div className={"py-8 px-4 mx-auto max-w-(--breakpoint-xl) lg:py-16 lg:px-6"}>
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
            Something&apos;s missing.
          </p>
          <p
            className={
              "mb-4 text-lg font-light text-gray-500 dark:text-gray-300"
            }
          >
            Sorry, we can&apos;t find that user.
          </p>
          {/* <Link
            href="/"
            className={
              "inline-flex text-white bg-blue-600 hover:bg-blue-800 focus:ring-4 focus:outline-hidden focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center my-4"
            }
          >
            Back to Homepage
          </Link> */}
        </div>
      </div>
    </section>
  );
}
