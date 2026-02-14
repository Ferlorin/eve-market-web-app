import { prisma } from './db';
import { esiClient } from './esi-client';

export class ItemTypeService {
  async getTypeNames(typeIds: number[]): Promise<Map<number, string>> {
    const result = new Map<number, string>();

    const cached = await prisma.itemType.findMany({
      where: {
        typeId: { in: typeIds },
      },
    });

    cached.forEach((item) => {
      result.set(item.typeId, item.name);
    });

    const missing = typeIds.filter((id) => !result.has(id));

    if (missing.length > 0) {
      const BATCH_SIZE = 50;
      for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);
        const promises = batch.map((id) => esiClient.getTypeName(id));
        const fetched = await Promise.all(promises);

        const toCreate: { typeId: number; name: string }[] = [];

        fetched.forEach((name, index) => {
          const id = batch[index];
          if (name) {
            result.set(id, name);
            toCreate.push({ typeId: id, name });
          } else {
            result.set(id, `Type ${id}`);
          }
        });

        if (toCreate.length > 0) {
          await prisma.itemType.createMany({
            data: toCreate,
            skipDuplicates: true,
          });
        }
      }
    }

    return result;
  }
}

export const itemTypeService = new ItemTypeService();
