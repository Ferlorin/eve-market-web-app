-- CreateTable
CREATE TABLE "regions" (
    "id" SERIAL NOT NULL,
    "regionId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_orders" (
    "id" SERIAL NOT NULL,
    "regionId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "orderId" BIGINT NOT NULL,
    "price" DECIMAL(20,2) NOT NULL,
    "volumeRemain" INTEGER NOT NULL,
    "locationId" BIGINT NOT NULL,
    "isBuyOrder" BOOLEAN NOT NULL,
    "issued" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "market_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "regions_regionId_key" ON "regions"("regionId");

-- CreateIndex
CREATE UNIQUE INDEX "market_orders_orderId_key" ON "market_orders"("orderId");

-- CreateIndex
CREATE INDEX "market_orders_regionId_typeId_idx" ON "market_orders"("regionId", "typeId");
