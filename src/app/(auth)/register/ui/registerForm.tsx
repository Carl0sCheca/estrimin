"use client";

import { registerAction } from "@/actions";
import { EmailError, ErrorType, NameError, PasswordError } from "@/interfaces";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useState } from "react";

export default function RegisterForm() {
  const [formState, setFormState] = useState({
    email: "",
    password: "",
    repeatpassword: "",
    name: "",
  });

  const [errorState, setErrorState] = useState({
    email: EmailError.None,
    password: PasswordError.None,
    name: NameError.None,
  });

  const [buttonDisabled, setButtonDisabled] = useState(false);

  const router = useRouter();

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      [event.target.name]: event.target.value,
    });
  };

  return (
    <>
      <div>
        <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
          <Image
            className={"mx-auto h-20 w-auto"}
            width={256}
            height={256}
            alt="Logo"
            src="/logo.png"
          />
          <h2
            className={
              "mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
            }
          >
            Create your account
          </h2>
        </div>
        <div className={"mt-10 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <form
            className={"space-y-6"}
            onSubmit={async (formEvent: FormEvent<HTMLFormElement>) => {
              formEvent.preventDefault();

              if (buttonDisabled) {
                return;
              }

              setButtonDisabled(true);

              const formData = new FormData(formEvent.currentTarget);

              setErrorState({
                email: EmailError.None,
                password: PasswordError.None,
                name: NameError.None,
              });

              const email = formData.get("email")?.toString();
              const password = formData.get("password")?.toString();
              const repeatpassword = formData.get("repeatpassword")?.toString();
              const name = formData.get("name")?.toString();

              if (!email || !password || !name) {
                if (!email) {
                  setErrorState((prevState) => ({
                    ...prevState,
                    email: EmailError.Empty,
                  }));
                }

                if (!password) {
                  setErrorState((prevState) => ({
                    ...prevState,
                    password: PasswordError.Empty,
                  }));
                }

                if (!name) {
                  setErrorState((prevState) => ({
                    ...prevState,
                    name: NameError.Empty,
                  }));
                }

                setButtonDisabled(false);
                return;
              }

              if (password !== repeatpassword) {
                setErrorState((prevState) => ({
                  ...prevState,
                  password: PasswordError.NotEqual,
                }));

                setButtonDisabled(false);
                return;
              }

              const response = await registerAction(email, password, name);

              if (!response.ok) {
                if (response.errorType === ErrorType.Email) {
                  setErrorState((prevState) => ({
                    ...prevState,
                    email: response.message as EmailError,
                  }));
                } else if (response.errorType === ErrorType.Password) {
                  setErrorState((prevState) => ({
                    ...prevState,
                    password: response.message as PasswordError,
                  }));
                } else if (response.errorType === ErrorType.Name) {
                  setErrorState((prevState) => ({
                    ...prevState,
                    name: response.message as NameError,
                  }));
                }

                setButtonDisabled(false);
              }

              if (response.ok) {
                router.replace("/user");
              }
            }}
          >
            <div>
              <div className={"flex items-center justify-between"}>
                <label
                  htmlFor="username"
                  className={
                    "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                  }
                >
                  Username
                </label>
                <div className={"text-sm"}>
                  <span className={"font-semibold text-red-500"}>
                    {errorState.name.toString()}
                  </span>
                </div>
              </div>
              <div className={"mt-2"}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="username"
                  required
                  onChange={handleChange}
                  value={formState.name}
                  className={
                    "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  }
                />
              </div>
            </div>

            <div>
              <div className={"flex items-center justify-between"}>
                <label
                  htmlFor="email"
                  className={
                    "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                  }
                >
                  Email
                </label>
                <div className={"text-sm"}>
                  <span className={"font-semibold text-red-500"}>
                    {errorState.email}
                  </span>
                </div>
              </div>
              <div className={"mt-2"}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  onChange={handleChange}
                  value={formState.email}
                  required
                  className={
                    "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  }
                />
              </div>
            </div>

            <div>
              <div className={"flex items-center justify-between"}>
                <label
                  htmlFor="password"
                  className={
                    "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                  }
                >
                  Password
                </label>
                <div className={"text-sm"}>
                  <span className={"font-semibold text-red-500"}>
                    {errorState.password}
                  </span>
                </div>
              </div>
              <div className={"mt-2"}>
                <input
                  id="password"
                  name="password"
                  type="password"
                  pattern=".{8,}"
                  onInvalid={(e) =>
                    (e.target as HTMLObjectElement).setCustomValidity(
                      "Must contain 8 or more characters"
                    )
                  }
                  onInput={(e) =>
                    (e.target as HTMLObjectElement).setCustomValidity("")
                  }
                  onChange={handleChange}
                  value={formState.password}
                  autoComplete="current-password"
                  required
                  className={
                    "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  }
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="repeatpassword"
                className={
                  "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                }
              >
                Repeat password
              </label>
              <div className={"mt-2"}>
                <input
                  id="repeatpassword"
                  name="repeatpassword"
                  type="password"
                  onChange={handleChange}
                  value={formState.repeatpassword}
                  required
                  className={
                    "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  }
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={buttonDisabled}
                className={
                  "disabled:bg-primary-700 flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-primary-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                }
              >
                Sign up
              </button>
            </div>
          </form>
          <p
            className={
              "mt-10 text-center text-sm text-gray-500 dark:text-gray-300"
            }
          >
            Already have an account?{" "}
            <Link
              href="/login"
              className={
                "font-semibold leading-6 text-primary-600 hover:text-primary-500"
              }
            >
              Log in
            </Link>
          </p>
        </div>
      </div>
    </>
  );
}
