import Image from "next/image";

export const Logo = () => {
  return (
    <Image
      className={"mx-auto h-20 w-auto pointer-events-none"}
      width={256}
      height={256}
      priority={true}
      alt="Logo"
      src="/logo.png"
    />
  );
};
