/*
  Warnings:

  - The primary key for the `item_types` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `item_types` table. All the data in the column will be lost.
  - The primary key for the `locations` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `locations` table. All the data in the column will be lost.
  - The primary key for the `market_orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `market_orders` table. All the data in the column will be lost.
  - The primary key for the `regions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `id` on the `regions` table. All the data in the column will be lost.

*/
-- AlterTable: market_orders
-- Drop existing primary key and unique constraint on orderId
ALTER TABLE "market_orders" DROP CONSTRAINT "market_orders_pkey";
ALTER TABLE "market_orders" DROP CONSTRAINT "market_orders_orderId_key";

-- Drop the redundant id column
ALTER TABLE "market_orders" DROP COLUMN "id";

-- Make orderId the primary key
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_pkey" PRIMARY KEY ("orderId");

-- AlterTable: locations
ALTER TABLE "locations" DROP CONSTRAINT "locations_pkey";
ALTER TABLE "locations" DROP CONSTRAINT "locations_locationId_key";
ALTER TABLE "locations" DROP COLUMN "id";
ALTER TABLE "locations" ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("locationId");

-- AlterTable: item_types
ALTER TABLE "item_types" DROP CONSTRAINT "item_types_pkey";
ALTER TABLE "item_types" DROP CONSTRAINT "item_types_typeId_key";
ALTER TABLE "item_types" DROP COLUMN "id";
ALTER TABLE "item_types" ADD CONSTRAINT "item_types_pkey" PRIMARY KEY ("typeId");

-- AlterTable: regions
ALTER TABLE "regions" DROP CONSTRAINT "regions_pkey";
ALTER TABLE "regions" DROP CONSTRAINT "regions_regionId_key";
ALTER TABLE "regions" DROP COLUMN "id";
ALTER TABLE "regions" ADD CONSTRAINT "regions_pkey" PRIMARY KEY ("regionId");
