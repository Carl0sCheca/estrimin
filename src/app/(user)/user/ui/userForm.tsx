"use client";

import { createChannel, updateUser } from "@/actions";
import { LogoutButton, ThemeSwitch, Tooltip, useTooltip } from "@/components";
import { UserUpdateDataRequest, UserUpdateResponse } from "@/interfaces";
import { changePassword } from "@/lib/auth-client";
import { User } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { ChangeEvent, FormEvent, MouseEvent, useRef, useState } from "react";
import { VscDebugRestart } from "react-icons/vsc";

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
}

interface Props {
  user: User;
  streamKey: string;
  settings: {
    streamUrl: string | undefined;
  };
}

export default function UserForm({ user, streamKey, settings }: Props) {
  const [formState, setFormState] = useState({
    name: user.name,
    email: user.email,
    token: streamKey,
  });

  const [formPasswordState, setFormPasswordState] = useState({
    password: "",
    newpassword: "",
  });

  const [button, setButton] = useState(false);

  const [tooltip, setTooltip] = useState({
    x: 0,
    y: 0,
    visible: false,
  });

  const [errorState, setErrorState] = useState({
    name: FormNameError.None,
    email: FormEmailError.None,
    password: FormPasswordError.None,
  });

  const tooltipRef = useRef(null);
  const { tooltipState, tooltipMouseEnter, tooltipMouseLeave } =
    useTooltip(tooltipRef);

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

  return (
    <>
      <Tooltip state={tooltipState} tooltipRef={tooltipRef} />
      <div>
        <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
          <Image
            className={"mx-auto h-20 w-auto"}
            width={256}
            height={256}
            priority={true}
            alt="Logo"
            src="/logo.png"
          />
          <div className="flex justify-center">
            <LogoutButton user={user} />
          </div>
          <h2
            className={
              "mt-6 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
            }
          >
            User settings:{" "}
            <span className="text-primary-500 hover:text-primary-600">
              <Link title="Go to channel" href={`/${user.name}`}>
                {user.name}
              </Link>
            </span>
          </h2>
          <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700 hover:text-primary-600">
            <Link href="/channel">Channel settings</Link>
          </div>
          {user.role === "ADMIN" && (
            <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700 hover:text-primary-600">
              <Link href="/admin">Admin dashboard</Link>
            </div>
          )}
          <div className="mt-0 text-center text-sm font-bold leading-9 tracking-tight text-primary-700 hover:text-primary-600">
            <ThemeSwitch />
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

                const updateUserResponse: UserUpdateResponse = await updateUser(
                  request
                );

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
                } else {
                  user.name = updateUserResponse.data?.name ?? user.name;
                  user.email = updateUserResponse.data?.email ?? user.email;
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
              action={async (formData: FormData) => {
                const currentPassword =
                  formData.get("password")?.toString() ?? "";
                const newPassword =
                  formData.get("newpassword")?.toString() ?? "";

                const { error } = await changePassword({
                  newPassword,
                  currentPassword: currentPassword,
                  revokeOtherSessions: true,
                });

                if (error) {
                  if (error.message === "Incorrect password") {
                    setErrorState({
                      ...errorState,
                      password: FormPasswordError.WrongPassword,
                    });
                  } else if (error.message === "Password is too short") {
                    setErrorState({
                      ...errorState,
                      password: FormPasswordError.InsufficientChars,
                    });
                  }
                } else {
                  setFormPasswordState({ password: "", newpassword: "" });
                }
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
                        "Must contain 8 or more characters"
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
                        "Must contain 8 or more characters"
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
          <div className="mt-6">
            <div className={"flex items-center justify-between"}>
              <label
                htmlFor="obstoken"
                className={
                  "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                }
              >
                Stream key
              </label>
            </div>
            <div className={"mt-2"}>
              <div className="flex">
                <input
                  id="token"
                  name="token"
                  type="text"
                  readOnly
                  value={formState.token}
                  onChange={handleChange}
                  className={
                    "w-4/5 rounded-l-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  }
                />

                <button
                  onMouseEnter={(e) => tooltipMouseEnter(e, "Regenerate token")}
                  onMouseLeave={tooltipMouseLeave}
                  onClick={async () => {
                    const tokenResponse = await createChannel();

                    if (tokenResponse.ok && tokenResponse.data) {
                      setFormState({
                        ...formState,
                        token: tokenResponse.data,
                      });
                    }
                  }}
                  className="flex justify-center items-center p-2 w-1/5 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-700 disabled:cursor-progress rounded-r-md text-white shadow-xs ring-0 ring-inset ring-gray-300 sm:text-sm sm:leading-6"
                >
                  <div className={"relative flex text-center justify-center"}>
                    <VscDebugRestart />
                  </div>
                </button>
              </div>
            </div>
            <div className={"items-center justify-between"}>
              <label
                htmlFor="obstoken"
                className={
                  "algo mt-2 block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                }
              >
                Stream URL:
                <div className="flex w-full">
                  <div
                    className="text-primary-600 cursor-pointer h-12 overflow-x-auto whitespace-nowrap"
                    onClick={() => {
                      if (formState.token) {
                        const url = `${
                          settings.streamUrl
                        }/${user.name.toLowerCase()}/whip?token=${
                          formState.token
                        }`;
                        navigator.clipboard.writeText(url);
                      }
                    }}
                  >
                    <div
                      className="flex h-full"
                      onMouseEnter={(e: MouseEvent) => {
                        setTooltip({
                          ...tooltip,
                          visible: true,
                          x: e.pageX - 20,
                          y: e.pageY + 20,
                        });
                      }}
                      onMouseLeave={() => {
                        setTooltip({
                          ...tooltip,
                          visible: false,
                        });
                      }}
                      onMouseMove={(e: MouseEvent) => {
                        setTooltip({
                          ...tooltip,
                          visible: true,
                          x: e.pageX - 20,
                          y: e.pageY + 20,
                        });
                      }}
                    >
                      {`${
                        settings.streamUrl
                      }/${user.name.toLowerCase()}/whip?token=${
                        formState.token
                      }`}
                    </div>
                  </div>
                  <span
                    style={{ left: tooltip.x, top: tooltip.y }}
                    className={`${
                      tooltip.visible
                        ? "opacity-100 visible"
                        : "opacity-0 invisible"
                    } transition-opacity select-none p-2 duration-1000 bg-gray-800 px-1 text-sm text-gray-100 min-w-20 rounded-md absolute -translate-x-0 -translate-y-1/2 m-4 mx-auto`}
                  >
                    Copy URL
                  </span>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
