"use client";

import { Logo } from "@/components";
import { signIn } from "@/lib/auth-client";
import Link from "next/link";
import { useActionState } from "react";

interface FormState {
  loginState?: LoginState;
  email?: string;
  password?: string;
}

enum LoginState {
  Invalid = "Email or password are not correct",
  Success = "",
}

interface Props {
  isDisabled: boolean;
}

export const LoginForm = ({ isDisabled }: Props) => {
  const loginAction = async (
    _prevState: FormState,
    formData: FormData,
  ): Promise<FormState> => {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();

    if (!email || !password) {
      return {};
    }

    const result = await signIn.email({
      email,
      password,
      rememberMe: true,
      callbackURL: "/",
    });

    if (result.error) {
      return { loginState: LoginState.Invalid, email };
    } else {
      return { loginState: LoginState.Success, email, password };
    }
  };

  const [state, formAction, isPending] = useActionState(loginAction, {});

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
            Sign in to your account
          </h2>
        </div>
        <div className={"mt-10 sm:mx-auto sm:w-full sm:max-w-sm"}>
          <form className={"space-y-6"} action={formAction}>
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
                    {state.loginState === LoginState.Invalid &&
                      state.loginState}
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
              </div>
              <div className={"mt-2"}>
                <input
                  id="password"
                  name="password"
                  defaultValue={state.password}
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
                  autoComplete="current-password"
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
                disabled={isPending || state.loginState === LoginState.Success}
                className={
                  "cursor-pointer disabled:cursor-default disabled:bg-primary-700 flex w-full justify-center rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-xs hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                }
              >
                Sign in
              </button>
            </div>
          </form>
          {!isDisabled && (
            <p
              className={
                "mt-10 text-center text-sm text-gray-500 dark:text-gray-300"
              }
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className={
                  "font-semibold leading-6 text-primary-600 hover:text-primary-500"
                }
              >
                Create account
              </Link>
            </p>
          )}
        </div>
      </div>
    </>
  );
};
