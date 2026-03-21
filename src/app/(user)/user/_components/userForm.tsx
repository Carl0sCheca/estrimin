"use client";

import {
  changePasswordAction as changePasswordServerAction,
  updateUser,
} from "@/actions";
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
import { useActionState, useEffect, useRef, useState } from "react";

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
  NotSamePassword = "Passwords are not the same",
  SamePassword = "Use a different password",
  Unexpected = "Unexpected error",
}

interface UpdateUserFormState {
  name: string;
  email: string;
  errorState: {
    name: FormNameError;
    email: FormEmailError;
  };
}

interface ChangePasswordFormState {
  password: string;
  newpassword: string;
  repeatnewpassword: string;
  errorState: {
    password: FormPasswordError;
  };
}

const initialUpdateUserFormState: UpdateUserFormState = {
  name: "",
  email: "",
  errorState: {
    name: FormNameError.None,
    email: FormEmailError.None,
  },
};

const initialChangePasswordFormState: ChangePasswordFormState = {
  password: "",
  newpassword: "",
  repeatnewpassword: "",
  errorState: {
    password: FormPasswordError.None,
  },
};

interface Props {
  userInit: User;
}

export const UserForm = ({ userInit }: Props) => {
  const [user, setUser] = useState(userInit);
  const [livePasswordError, setLivePasswordError] = useState<FormPasswordError>(
    FormPasswordError.None,
  );
  const newPasswordRef = useRef<HTMLInputElement>(null);
  const repeatPasswordRef = useRef<HTMLInputElement>(null);

  const { alertNotification, showAlert } = useAlertNotification();

  const updateUserAction = async (
    _prevState: UpdateUserFormState,
    formData: FormData,
  ): Promise<UpdateUserFormState> => {
    const nextState: UpdateUserFormState = {
      ...initialUpdateUserFormState,
      name: formData.get("name")?.toString() ?? user.name,
      email: formData.get("email")?.toString() ?? user.email,
    };

    const request: UserUpdateDataRequest = {};

    if (nextState.name !== user.name) {
      request.name = nextState.name;
    }

    if (nextState.email !== user.email) {
      request.email = nextState.email;
    }

    if (Object.keys(request).length === 0) {
      return nextState;
    }

    const updateUserResponse: UserUpdateResponse = await updateUser(request);

    if (!updateUserResponse.ok) {
      nextState.errorState = {
        name: FormNameError.None,
        email: FormEmailError.None,
      };

      if (updateUserResponse.message === "Invalid email") {
        nextState.errorState.email = FormEmailError.Invalid;
      } else if (updateUserResponse.message === "Username already exists") {
        nextState.errorState.name = FormNameError.InUse;
      } else if (updateUserResponse.message === "Email already exists") {
        nextState.errorState.email = FormEmailError.InUse;
      }

      showAlert(`Failed to save changes: ${updateUserResponse.message}`, true);
      return nextState;
    }

    const updatedUser = {
      ...user,
      name: updateUserResponse.data?.name ?? user.name,
      email: updateUserResponse.data?.email ?? user.email,
    };

    setUser(updatedUser);
    showAlert("Your changes have been saved");

    return {
      ...nextState,
      name: updatedUser.name,
      email: updatedUser.email,
    };
  };

  const changePasswordAction = async (
    _prevState: ChangePasswordFormState,
    formData: FormData,
  ): Promise<ChangePasswordFormState> => {
    const nextState: ChangePasswordFormState = {
      ...initialChangePasswordFormState,
      password: formData.get("password")?.toString() ?? "",
      newpassword: formData.get("newpassword")?.toString() ?? "",
      repeatnewpassword: formData.get("repeatnewpassword")?.toString() ?? "",
    };

    if (nextState.newpassword !== nextState.repeatnewpassword) {
      nextState.errorState.password = FormPasswordError.NotSamePassword;
      return nextState;
    }

    const { ok, error } = await changePasswordServerAction({
      newPassword: nextState.newpassword,
      repeatNewPassword: nextState.repeatnewpassword,
      currentPassword: nextState.password,
    });

    if (!ok) {
      nextState.errorState = {
        password: FormPasswordError.None,
      };

      if (error === "INVALID_PASSWORD") {
        nextState.errorState.password = FormPasswordError.WrongPassword;
      } else if (error === "NEWPASSWORD_NOT_EQUAL") {
        nextState.errorState.password = FormPasswordError.NotSamePassword;
      } else if (error === "SAME_OLD_PASSWORD") {
        nextState.errorState.password = FormPasswordError.SamePassword;
      } else if (error === "PASSWORD_TOO_SHORT") {
        nextState.errorState.password = FormPasswordError.InsufficientChars;
      } else {
        nextState.errorState.password = FormPasswordError.Unexpected;
      }

      showAlert("An error occurred while changing your password", true);
      return nextState;
    }

    showAlert("Password changed successfully");
    return {
      ...nextState,
      password: "",
      newpassword: "",
      repeatnewpassword: "",
      errorState: {
        password: FormPasswordError.None,
      },
    };
  };

  const [updateUserState, updateUserFormAction, isUpdateUserPending] =
    useActionState(updateUserAction, {
      ...initialUpdateUserFormState,
      name: user.name,
      email: user.email,
    });

  const [
    changePasswordState,
    changePasswordFormAction,
    isChangePasswordPending,
  ] = useActionState(changePasswordAction, initialChangePasswordFormState);

  const validatePassword = () => {
    const newpassword = newPasswordRef.current?.value ?? "";
    const repeatnewpassword = repeatPasswordRef.current?.value ?? "";

    if (!newpassword && !repeatnewpassword) {
      setLivePasswordError(FormPasswordError.None);
      return;
    }

    if (newpassword && repeatnewpassword && newpassword !== repeatnewpassword) {
      setLivePasswordError(FormPasswordError.NotSamePassword);
    } else {
      setLivePasswordError(FormPasswordError.None);
    }
  };

  useEffect(() => {
    if (isChangePasswordPending) {
      setLivePasswordError(FormPasswordError.None);
    }
  }, [isChangePasswordPending]);

  return (
    <>
      <Notification state={alertNotification} />
      <div>
        <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
          <Logo />
          <div className="flex justify-center mt-2">
            <LogoutButton user={user} />
          </div>
          <h2
            className={
              "mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
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
              "cursor-pointer flex mt-4 mx-auto w-1/4 mb-2 justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
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
            <form className="space-y-6" action={updateUserFormAction}>
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
                      {!isUpdateUserPending &&
                        updateUserState.errorState.email !==
                          FormEmailError.None &&
                        updateUserState.errorState.email.toString()}
                    </span>
                  </div>
                </div>
                <div className={"mt-2"}>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    defaultValue={updateUserState.email}
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
                    htmlFor="username"
                    className={
                      "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                    }
                  >
                    Username
                  </label>
                  <div className={"text-sm"}>
                    <span className={"font-semibold text-red-500"}>
                      {!isUpdateUserPending &&
                        updateUserState.errorState.name !==
                          FormNameError.None &&
                        updateUserState.errorState.name.toString()}
                    </span>
                  </div>
                </div>
                <div className={"mt-2"}>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    defaultValue={updateUserState.name}
                    required
                    className={
                      "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isUpdateUserPending}
                className={
                  "cursor-pointer disabled:cursor-default disabled:bg-primary-700 flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                }
              >
                Save
              </button>
            </form>
          </div>
          <div className={"mt-6"}>
            <form className="space-y-6" action={changePasswordFormAction}>
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
                      {!isChangePasswordPending &&
                        changePasswordState.errorState.password !==
                          FormPasswordError.None &&
                        changePasswordState.errorState.password.toString()}
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
                    defaultValue={changePasswordState.password}
                    autoComplete="password"
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
                    defaultValue={changePasswordState.newpassword}
                    onBlur={validatePassword}
                    ref={newPasswordRef}
                    onInvalid={(e) =>
                      (e.target as HTMLObjectElement).setCustomValidity(
                        "Must contain 8 or more characters",
                      )
                    }
                    onInput={(e) =>
                      (e.target as HTMLObjectElement).setCustomValidity("")
                    }
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
                    htmlFor="repeatnewpassword"
                    className={
                      "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                    }
                  >
                    Repeat new password
                  </label>
                  <div className={"text-sm"}>
                    <span className={"font-semibold text-red-500"}>
                      {livePasswordError !== FormPasswordError.None
                        ? livePasswordError
                        : !isChangePasswordPending &&
                            changePasswordState.errorState.password ===
                              FormPasswordError.NotSamePassword
                          ? changePasswordState.errorState.password
                          : ""}
                    </span>
                  </div>
                </div>
                <div className={"mt-2"}>
                  <input
                    id="repeatnewpassword"
                    name="repeatnewpassword"
                    type="password"
                    pattern=".{8,}"
                    defaultValue={changePasswordState.repeatnewpassword}
                    onBlur={validatePassword}
                    ref={repeatPasswordRef}
                    onInvalid={(e) =>
                      (e.target as HTMLObjectElement).setCustomValidity(
                        "Must contain 8 or more characters",
                      )
                    }
                    onInput={(e) =>
                      (e.target as HTMLObjectElement).setCustomValidity("")
                    }
                    required
                    className={
                      "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                    }
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={isChangePasswordPending}
                className={
                  "cursor-pointer disabled:cursor-default disabled:bg-primary-700 flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
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
