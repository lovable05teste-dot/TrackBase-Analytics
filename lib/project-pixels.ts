import { eq } from "drizzle-orm";
import type { getDb } from "@/db";
import { projectPixels, projects } from "@/db/schema";

export function uniquePixels<T extends {pixelId:string}>(pixels:T[]):T[] {
  const unique=new Map<string,T>();
  for(const pixel of pixels)if(/^\d{6,25}$/.test(pixel.pixelId)&&!unique.has(pixel.pixelId))unique.set(pixel.pixelId,pixel);
  return [...unique.values()];
}
export async function metaDestinations(db:ReturnType<typeof getDb>, projectId:string) {
  const [project]=await db.select().from(projects).where(eq(projects.id,projectId)).limit(1);
  if(!project)return [];
  const extra=await db.select().from(projectPixels).where(eq(projectPixels.projectId,projectId));
  return uniquePixels([
    ...(project.pixelId&&project.metaTokenCipher&&project.metaTokenIv?[{pixelId:project.pixelId,cipher:project.metaTokenCipher,iv:project.metaTokenIv,testCode:project.metaTestCode}]:[]),
    ...extra,
  ]);
}
