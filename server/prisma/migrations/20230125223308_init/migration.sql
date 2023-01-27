-- CreateEnum
CREATE TYPE "LogType" AS ENUM ('UnknownFob', 'DisabledFob', 'IncorrectPin', 'PinTimeout', 'DoorOpened');

-- CreateTable
CREATE TABLE "KeyFob" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "KeyFob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" SERIAL NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "LogType" NOT NULL,
    "fob" TEXT,
    "pin" TEXT,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);
