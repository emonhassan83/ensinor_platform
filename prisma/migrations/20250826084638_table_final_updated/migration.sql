/*
  Warnings:

  - You are about to drop the column `avgGradeId` on the `assign_courses` table. All the data in the column will be lost.
  - The `courseMark` column on the `assign_courses` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to alter the column `learningTime` on the `assign_courses` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `city` on the `business_instructors` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `business_instructors` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `business_instructors` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `business_instructors` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `business_instructors` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `business_instructors` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `business_instructors` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `company_admins` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `company_admins` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `company_admins` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `company_admins` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `company_admins` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `company_admins` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `company_admins` table. All the data in the column will be lost.
  - You are about to drop the column `fullName` on the `company_requests` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `course_bundles` table. All the data in the column will be lost.
  - You are about to alter the column `price` on the `course_bundles` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to drop the column `city` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `avgGradeId` on the `enrolled_courses` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `grading_systems` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `instructors` table. All the data in the column will be lost.
  - You are about to drop the column `firstName` on the `invitations` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `invitations` table. All the data in the column will be lost.
  - You are about to drop the column `bio` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `students` table. All the data in the column will be lost.
  - You are about to drop the column `city` on the `super_admin` table. All the data in the column will be lost.
  - You are about to drop the column `contactNo` on the `super_admin` table. All the data in the column will be lost.
  - You are about to drop the column `country` on the `super_admin` table. All the data in the column will be lost.
  - You are about to drop the column `dateOfBirth` on the `super_admin` table. All the data in the column will be lost.
  - You are about to drop the column `email` on the `super_admin` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `super_admin` table. All the data in the column will be lost.
  - You are about to drop the column `photoUrl` on the `super_admin` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `CV` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CVCertificate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Education` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Experience` table. If the table is not empty, all the data it contains will be lost.
  - Changed the type of `type` on the `chats` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `name` to the `company_requests` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `course_bundles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `course_bundles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `course_bundles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `invitations` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `modelType` on the `resources` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `modelType` on the `wishlists` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('private', 'group');

-- CreateEnum
CREATE TYPE "WishListModelType" AS ENUM ('course', 'book');

-- CreateEnum
CREATE TYPE "ResourceModelType" AS ENUM ('course', 'event', 'article', 'book');

-- DropForeignKey
ALTER TABLE "CVCertificate" DROP CONSTRAINT "CVCertificate_cvId_fkey";

-- DropForeignKey
ALTER TABLE "Education" DROP CONSTRAINT "Education_cvId_fkey";

-- DropForeignKey
ALTER TABLE "Experience" DROP CONSTRAINT "Experience_cvId_fkey";

-- DropForeignKey
ALTER TABLE "grading_systems" DROP CONSTRAINT "grading_systems_authorId_fkey";

-- DropForeignKey
ALTER TABLE "grading_systems" DROP CONSTRAINT "grading_systems_courseId_fkey";

-- DropIndex
DROP INDEX "business_instructors_email_key";

-- DropIndex
DROP INDEX "company_admins_email_key";

-- DropIndex
DROP INDEX "employees_email_key";

-- DropIndex
DROP INDEX "instructors_email_key";

-- DropIndex
DROP INDEX "students_email_key";

-- DropIndex
DROP INDEX "super_admin_email_key";

-- AlterTable
ALTER TABLE "assign_courses" DROP COLUMN "avgGradeId",
DROP COLUMN "courseMark",
ADD COLUMN     "courseMark" INTEGER,
ALTER COLUMN "learningTime" SET DEFAULT 0,
ALTER COLUMN "learningTime" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "business_instructors" DROP COLUMN "city",
DROP COLUMN "contactNo",
DROP COLUMN "country",
DROP COLUMN "dateOfBirth",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "photoUrl";

-- AlterTable
ALTER TABLE "chats" DROP COLUMN "type",
ADD COLUMN     "type" "ChatType" NOT NULL;

-- AlterTable
ALTER TABLE "company_admins" DROP COLUMN "city",
DROP COLUMN "contactNo",
DROP COLUMN "country",
DROP COLUMN "dateOfBirth",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "photoUrl";

-- AlterTable
ALTER TABLE "company_requests" DROP COLUMN "fullName",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "course_bundles" DROP COLUMN "description",
ADD COLUMN     "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
ADD COLUMN     "category" TEXT NOT NULL,
ADD COLUMN     "popularity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "thumbnail" TEXT,
ADD COLUMN     "title" TEXT NOT NULL,
ADD COLUMN     "totalCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "userId" TEXT NOT NULL,
ALTER COLUMN "price" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "employees" DROP COLUMN "city",
DROP COLUMN "contactNo",
DROP COLUMN "country",
DROP COLUMN "dateOfBirth",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "photoUrl";

-- AlterTable
ALTER TABLE "enrolled_courses" DROP COLUMN "avgGradeId";

-- AlterTable
ALTER TABLE "grading_systems" DROP COLUMN "name",
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "courseId" DROP NOT NULL,
ALTER COLUMN "authorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "instructors" DROP COLUMN "bio",
DROP COLUMN "city",
DROP COLUMN "contactNo",
DROP COLUMN "country",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "photoUrl";

-- AlterTable
ALTER TABLE "invitations" DROP COLUMN "firstName",
DROP COLUMN "lastName",
ADD COLUMN     "name" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "resources" DROP COLUMN "modelType",
ADD COLUMN     "modelType" "ResourceModelType" NOT NULL;

-- AlterTable
ALTER TABLE "students" DROP COLUMN "bio",
DROP COLUMN "city",
DROP COLUMN "contactNo",
DROP COLUMN "country",
DROP COLUMN "dateOfBirth",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "photoUrl";

-- AlterTable
ALTER TABLE "super_admin" DROP COLUMN "city",
DROP COLUMN "contactNo",
DROP COLUMN "country",
DROP COLUMN "dateOfBirth",
DROP COLUMN "email",
DROP COLUMN "name",
DROP COLUMN "photoUrl";

-- AlterTable
ALTER TABLE "supports" ADD COLUMN     "isResponse" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "status",
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactNo" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "dateOfBirth" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "photoUrl" TEXT;

-- AlterTable
ALTER TABLE "wishlists" DROP COLUMN "modelType",
ADD COLUMN     "modelType" "WishListModelType" NOT NULL;

-- DropTable
DROP TABLE "CV";

-- DropTable
DROP TABLE "CVCertificate";

-- DropTable
DROP TABLE "Education";

-- DropTable
DROP TABLE "Experience";

-- CreateTable
CREATE TABLE "course_bundle_courses" (
    "bundleId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,

    CONSTRAINT "course_bundle_courses_pkey" PRIMARY KEY ("bundleId","courseId")
);

-- CreateTable
CREATE TABLE "cvs" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "linkedin" TEXT NOT NULL,
    "website" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "aboutMe" TEXT NOT NULL,
    "skills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cvs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "educations" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "educations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cv_certificates" (
    "id" TEXT NOT NULL,
    "cvId" TEXT NOT NULL,
    "instituteName" TEXT NOT NULL,
    "degree" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "file" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cv_certificates_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "course_bundles" ADD CONSTRAINT "course_bundles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_bundle_courses" ADD CONSTRAINT "course_bundle_courses_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "course_bundles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "course_bundle_courses" ADD CONSTRAINT "course_bundle_courses_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "educations" ADD CONSTRAINT "educations_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cv_certificates" ADD CONSTRAINT "cv_certificates_cvId_fkey" FOREIGN KEY ("cvId") REFERENCES "cvs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_systems" ADD CONSTRAINT "grading_systems_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grading_systems" ADD CONSTRAINT "grading_systems_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
