import {researchSchema} from "./research";
import {z} from "zod";
export const assetSchema=z.object({id:z.string().uuid(),title:z.string().max(500),source:z.string().max(2000),credit:z.string().max(2000),license:z.string().max(200),licenseUrl:z.string().max(2000)});
export const sceneSchema=z.object({seconds:z.number().int().min(1).max(15),visual:z.string().min(1).max(600),narration:z.string().min(1).max(500),reaction:z.string().max(150),headline:z.string().max(60).optional(),caption:z.string().max(180).optional(),imageQuery:z.string().max(200).optional(),layout:z.enum(['photo','text']).optional(),fit:z.enum(['contain','cover']).optional(),asset:assetSchema.nullable().optional()});
export const scriptSchema=z.object({scenes:z.array(sceneSchema).min(3).max(12)});
export type Scene=z.infer<typeof sceneSchema>;
export type Project={id:string;title:string;source:string;notes:string;script:string;scenes:string;status:string;revision:number;board:string|null;updated:number;lock:string|null;research?:string};
export const createSchema=z.object({title:z.string().trim().min(1).max(200),source:z.string().url().max(2000).refine(v=>/^https?:\/\//.test(v)),notes:z.string().trim().min(20).max(12000),research:researchSchema.optional()});
export const editSchema=z.object({revision:z.number().int().nonnegative(),scenes:z.array(sceneSchema).min(3).max(12)});
export function narration(s:Scene[]){return s.map(x=>x.narration).join("\n\n")}
