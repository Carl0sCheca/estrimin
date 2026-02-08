"use client";

import { changePasswordAction, updateUser } from "@/actions";
import {
  Logo,
  LogoutButton,
  Notification,
  ThemeSwitch,
  useAlertNotification,
} from "@/components";
import { UserUpdateDataRequest, UserUpdateResponse } from "@/interfaces";
import { User } from "@/generated/browser";
import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import { flushSync } from "react-dom";

enum FormNameError {
  None = "",
  InUse = "Username already in use",
}

enum FormEmailError {
  None = "",
  InUse = "Email already in use",
  Invalid = "Invalid email",
}

enum FormPasswordError {
  None = "",
  WrongPassword = "Wrong current password",
  InsufficientChars = "Password must be at least 8 chars",
  Unexpected = "Unexpected error",
}

interface Props {
  userInit: User;
}

export const UserForm = ({ userInit }: Props) => {
  const [user, setUser] = useState(userInit);

  const [formState, setFormState] = useState({
    name: user.name,
    email: user.email,
  });

  const [formPasswordState, setFormPasswordState] = useState({
    password: "",
    newpassword: "",
  });

  const [button, setButton] = useState(false);

  const [errorState, setErrorState] = useState({
    name: FormNameError.None,
    email: FormEmailError.None,
    password: FormPasswordError.None,
  });

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFormState({
      ...formState,
      [event.target.name]: event.target.value,
    });
  };

  const handleChangePassword = (event: ChangeEvent<HTMLInputElement>) => {
    setFormPasswordState({
      ...formPasswordState,
      [event.target.name]: event.target.value,
    });
  };

  const { alertNotification, showAlert } = useAlertNotification();

  return (
    <>
      <Notification state={alertNotification} />
      <div>
        <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
          <Logo />
          <div className="flex justify-center">
            <LogoutButton user={user} />
          </div>
          <h2
            className={
              "mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
            }
          >
            Channel:{" "}
            <span className="text-primary-500 hover:text-primary-600">
              <Link title="Go to channel" href={`/${user.name}`}>
                {user.name}
              </Link>
            </span>
          </h2>
          <Link
            href="/following"
            className={
              "cursor-default flex mt-4 mx-auto w-1/4 mb-2 justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
            }
          >
            Following
          </Link>
          <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700">
            <Link href="/channel" className="hover:text-primary-600">
              Channel dashboard
            </Link>
          </div>
          {user.role === "ADMIN" && (
            <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700">
              <Link href="/admin" className="hover:text-primary-600">
                Admin dashboard
              </Link>
            </div>
          )}
          <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700">
            <ThemeSwitch className="hover:text-primary-600 cursor-pointer" />
          </div>
        </div>
        <div className={"mt-6 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <div>
            <form
              className="space-y-6"
              onSubmit={async (formEvent: FormEvent<HTMLFormElement>) => {
                formEvent.preventDefault();

                setButton(true);
                setErrorState({
                  name: FormNameError.None,
                  email: FormEmailError.None,
                  password: FormPasswordError.None,
                });

                const formData = new FormData(formEvent.currentTarget);

                const email = formData.get("email")?.toString();
                const name = formData.get("name")?.toString();

                const request: UserUpdateDataRequest = {};

                if (name !== user.name) {
                  request.name = name;
                }

                if (email !== user.email) {
                  request.email = email;
                }

                if (Object.keys(request).length === 0) {
                  setButton(false);
                  return;
                }

                const updateUserResponse: UserUpdateResponse =
                  await updateUser(request);

                if (!updateUserResponse.ok) {
                  if (updateUserResponse.message === "Invalid email") {
                    setErrorState({
                      ...errorState,
                      email: FormEmailError.Invalid,
                    });
                  } else if (
                    updateUserResponse.message === "Username already exists"
                  ) {
                    setErrorState({
                      ...errorState,
                      name: FormNameError.InUse,
                    });
                  } else if (
                    updateUserResponse.message === "Email already exists"
                  ) {
                    setErrorState({
                      ...errorState,
                      email: FormEmailError.InUse,
                    });
                  }

                  showAlert("Failed to save changes", true);
                } else {
                  const updatedUser = {
                    ...user,
                    name: updateUserResponse.data?.name ?? user.name,
                    email: updateUserResponse.data?.email ?? user.email,
                  };

                  setUser(updatedUser);

                  showAlert("Your changes have been saved");
                }

                setButton(false);
              }}
            >
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
                      {errorState.email.toString()}
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
                    className={
                      "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />
                </div>
              </div>
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
                </div>
                <div className={"mt-2"}>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    onChange={handleChange}
                    value={formState.name}
                    required
                    className={
                      "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={button}
                className={
                  "disabled:bg-primary-700 flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                }
              >
                Save
              </button>
            </form>
          </div>
          <div className={"mt-6"}>
            <form
              className="space-y-6"
              onSubmit={async (event: React.FormEvent<HTMLFormElement>) => {
                event?.preventDefault();

                flushSync(() => {
                  setButton(true);
                });

                const formData = new FormData(event.currentTarget);

                const currentPassword =
                  formData.get("password")?.toString() ?? "";
                const newPassword =
                  formData.get("newpassword")?.toString() ?? "";

                const { ok, error } = await changePasswordAction({
                  newPassword,
                  currentPassword: currentPassword,
                });

                if (!ok) {
                  if (error === "INVALID_PASSWORD") {
                    setErrorState({
                      ...errorState,
                      password: FormPasswordError.WrongPassword,
                    });
                  } else if (error === "PASSWORD_TOO_SHORT") {
                    setErrorState({
                      ...errorState,
                      password: FormPasswordError.InsufficientChars,
                    });
                  } else {
                    setErrorState({
                      ...errorState,
                      password: FormPasswordError.Unexpected,
                    });
                  }

                  showAlert(
                    "An error occurred while changing your password",
                    true,
                  );
                } else {
                  setFormPasswordState({ password: "", newpassword: "" });
                  setErrorState((prevState) => {
                    return { ...prevState, password: FormPasswordError.None };
                  });

                  showAlert("Password changed successfully");
                }

                setButton(false);
              }}
            >
              <div>
                <div className={"flex items-center justify-between"}>
                  <label
                    htmlFor="password"
                    className={
                      "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                    }
                  >
                    Current password
                  </label>
                  <div className={"text-sm"}>
                    <span className={"font-semibold text-red-500"}>
                      {errorState.password.toString()}
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
                        "Must contain 8 or more characters",
                      )
                    }
                    onInput={(e) =>
                      (e.target as HTMLObjectElement).setCustomValidity("")
                    }
                    value={formPasswordState.password}
                    onChange={handleChangePassword}
                    autoComplete="current-password"
                    required
                    className={
                      "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />
                </div>
              </div>
              <div>
                <div className={"flex items-center justify-between"}>
                  <label
                    htmlFor="newpassword"
                    className={
                      "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                    }
                  >
                    New password
                  </label>
                </div>
                <div className={"mt-2"}>
                  <input
                    id="newpassword"
                    name="newpassword"
                    type="password"
                    pattern=".{8,}"
                    value={formPasswordState.newpassword}
                    onChange={handleChangePassword}
                    onInvalid={(e) =>
                      (e.target as HTMLObjectElement).setCustomValidity(
                        "Must contain 8 or more characters",
                      )
                    }
                    onInput={(e) =>
                      (e.target as HTMLObjectElement).setCustomValidity("")
                    }
                    autoComplete="new-password"
                    required
                    className={
                      "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={button}
                className={
                  "disabled:bg-primary-700 flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                }
              >
                Change password
              </button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};
