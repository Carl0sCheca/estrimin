-- CreateTable
CREATE TABLE "registrationLink" (
    "id" TEXT NOT NULL,
    "used" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "expirationDate" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registrationLink_pkey" PRIMARY KEY ("id")
);
