import { prisma } from '@/lib/db';

export interface Region {
  id: number;
  regionId: number;
  name: string;
}

export async function getAllRegions(): Promise<Region[]> {
  const regions = await prisma.region.findMany({
    select: {
      id: true,
      regionId: true,
      name: true
    },
    orderBy: {
      name: 'asc'
    }
  });
  
  return regions;
}

export async function getRegionById(regionId: number): Promise<Region | null> {
  return await prisma.region.findUnique({
    where: { regionId },
    select: {
      id: true,
      regionId: true,
      name: true
    }
  });
}

export async function getRegionByName(name: string): Promise<Region | null> {
  return await prisma.region.findFirst({
    where: {
      name: {
        equals: name,
        mode: 'insensitive' // Case-insensitive search
      }
    },
    select: {
      id: true,
      regionId: true,
      name: true
    }
  });
}
