import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkRegions() {
  try {
    const regions = await prisma.region.findMany({
      select: {
        id: true,
        regionId: true,
        name: true,
      },
      orderBy: {
        regionId: 'asc'
      },
      take: 10
    });

    console.log(`\n📊 Found ${regions.length} regions in database (showing first 10):\n`);
    
    if (regions.length === 0) {
      console.log('⚠️  No regions found in database! Need to run seed script.\n');
    } else {
      regions.forEach(region => {
        console.log(`  ${region.regionId}: ${region.name || '(no name)'}`);
      });
      console.log();
    }

    const totalCount = await prisma.region.count();
    console.log(`Total regions in database: ${totalCount}\n`);

  } catch (error) {
    console.error('Error checking regions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRegions();
