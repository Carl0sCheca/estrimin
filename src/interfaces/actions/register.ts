export enum EmailError {
  None = "",
  Invalid = "Invalid email",
  InUse = "Email already in use",
  Empty = "Empty Email",
}

export enum PasswordError {
  None = "",
  NotEqual = "Passwords are not the same",
  InsufficientChars = "Password must have at least 8 characters",
  Empty = "Empty password",
}

export enum NameError {
  None = "",
  InUse = "Username is already in use",
  Empty = "Emtpy username",
  Invalid = "Invalid name",
}

export enum ErrorType {
  Email,
  Name,
  Password,
  Unknown,
}

export interface RegisterResponse {
  ok: boolean;
  errorType?: ErrorType;
  message?: EmailError | PasswordError | NameError;
}
