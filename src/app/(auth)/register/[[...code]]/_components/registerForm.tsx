"use client";

import { registerAction } from "@/actions";
import { Logo } from "@/components";
import {
  EmailError,
  ErrorType,
  NameError,
  PasswordError,
  RegistrationCodeError,
} from "@/interfaces";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";

interface Props {
  registrationCode?: string;
}

interface FormState {
  email: string;
  password: string;
  repeatpassword: string;
  name: string;
  errorState: {
    email: EmailError;
    password: PasswordError;
    name: NameError;
    registrationCode: RegistrationCodeError;
  };
  success: boolean;
}

const initialFormState: FormState = {
  email: "",
  password: "",
  repeatpassword: "",
  name: "",
  errorState: {
    email: EmailError.None,
    password: PasswordError.None,
    name: NameError.None,
    registrationCode: RegistrationCodeError.None,
  },
  success: false,
};

export const RegisterForm = ({ registrationCode }: Props) => {
  const router = useRouter();
  const [livePasswordError, setLivePasswordError] = useState<PasswordError>(
    PasswordError.None,
  );
  const passwordRef = useRef<HTMLInputElement>(null);
  const repeatPasswordRef = useRef<HTMLInputElement>(null);

  const registerFormAction = async (
    _prevState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    let nextState: FormState = {
      ...initialFormState,
      email: formData.get("email")?.toString() ?? "",
      password: formData.get("password")?.toString() ?? "",
      repeatpassword: formData.get("repeatpassword")?.toString() ?? "",
      name: formData.get("name")?.toString() ?? "",
    };

    if (
      !nextState.email ||
      !nextState.name ||
      !nextState.password ||
      !nextState.repeatpassword
    ) {
      if (!nextState.email) {
        nextState.errorState.email = EmailError.Empty;
      }

      if (!nextState.password) {
        nextState.errorState.password = PasswordError.Empty;
      }

      if (!nextState.repeatpassword) {
        nextState.errorState.password = PasswordError.EmptyPasswordRepeat;
      }

      if (!nextState.name) {
        nextState.errorState.name = NameError.Empty;
      }

      return nextState;
    }

    if (nextState.password !== nextState.repeatpassword) {
      nextState.errorState.password = PasswordError.NotEqual;
      return nextState;
    }

    const response = await registerAction(
      nextState.email,
      nextState.password,
      nextState.name,
      registrationCode,
    );

    if (!response.ok) {
      nextState = {
        ...nextState,
        errorState: {
          email: EmailError.None,
          password: PasswordError.None,
          name: NameError.None,
          registrationCode: RegistrationCodeError.None,
        },
      };

      if (response.errorType === ErrorType.Email) {
        nextState.errorState.email = response.message as EmailError;
      } else if (response.errorType === ErrorType.Password) {
        nextState.errorState.password = response.message as PasswordError;
      } else if (response.errorType === ErrorType.Name) {
        nextState.errorState.name = response.message as NameError;
      } else if (response.errorType === ErrorType.RegistrationCode) {
        nextState.errorState.registrationCode =
          response.message as RegistrationCodeError;
      }

      return nextState;
    }

    return { ...nextState, success: true };
  };

  const [state, formAction, isPending] = useActionState(
    registerFormAction,
    initialFormState,
  );

  const validatePassword = () => {
    const password = passwordRef.current?.value ?? "";
    const repeatpassword = repeatPasswordRef.current?.value ?? "";

    if (!password && !repeatpassword) {
      setLivePasswordError(PasswordError.None);
      return;
    }

    if (password && repeatpassword && password !== repeatpassword) {
      setLivePasswordError(PasswordError.NotEqual);
    } else {
      setLivePasswordError(PasswordError.None);
    }
  };

  useEffect(() => {
    if (state.success) {
      router.replace("/user");
    }
  }, [router, state.success]);

  useEffect(() => {
    if (isPending) {
      setLivePasswordError(PasswordError.None);
    }
  }, [isPending]);

  return (
    <>
      <div>
        <div className={"sm:mx-auto sm:w-full sm:max-w-sm"}>
          <Logo />
          <h2
            className={
              "mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 dark:text-gray-100"
            }
          >
            Create your account
          </h2>
        </div>
        <div className={"mt-10 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <form className={"space-y-6"} action={formAction}>
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
                    {!isPending &&
                      state.errorState.name !== NameError.None &&
                      state.errorState.name.toString()}
                    {!isPending &&
                      state.errorState.registrationCode !==
                        RegistrationCodeError.None &&
                      state.errorState.registrationCode.toString()}
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
                  defaultValue={state.name}
                  className={
                    "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
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
                    {!isPending &&
                      state.errorState.email !== EmailError.None &&
                      state.errorState.email}
                  </span>
                </div>
              </div>
              <div className={"mt-2"}>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  defaultValue={state.email}
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
                  htmlFor="password"
                  className={
                    "block text-sm font-medium leading-6 text-gray-900 dark:text-gray-100"
                  }
                >
                  Password
                </label>
                <div className={"text-sm"}>
                  <span className={"font-semibold text-red-500"}>
                    {livePasswordError !== PasswordError.None
                      ? livePasswordError
                      : !isPending &&
                          state.errorState.password !== PasswordError.None
                        ? state.errorState.password
                        : ""}
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
                  onBlur={validatePassword}
                  defaultValue={state.password}
                  ref={passwordRef}
                  autoComplete="current-password"
                  required
                  className={
                    "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
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
                  onBlur={validatePassword}
                  defaultValue={state.repeatpassword}
                  ref={repeatPasswordRef}
                  required
                  className={
                    "block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6"
                  }
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isPending || state.success}
                className={
                  "cursor-pointer disabled:cursor-default disabled:bg-primary-700 flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
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
};
