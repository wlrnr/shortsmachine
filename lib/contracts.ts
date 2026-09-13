import {z} from "zod";
export const sceneSchema=z.object({seconds:z.number().int().min(1).max(15),visual:z.string().min(1).max(600),narration:z.string().min(1).max(500),reaction:z.string().min(1).max(150)});
export const scriptSchema=z.object({scenes:z.array(sceneSchema).length(8)});
export type Scene=z.infer<typeof sceneSchema>;
export type Project={id:string;title:string;source:string;notes:string;script:string;scenes:string;status:string;revision:number;board:string|null;updated:number;lock:string|null};
export const createSchema=z.object({title:z.string().trim().min(1).max(200),source:z.string().url().max(2000).refine(v=>/^https?:\/\//.test(v)),notes:z.string().trim().min(20).max(12000)});
export const editSchema=z.object({revision:z.number().int().nonnegative(),scenes:z.array(sceneSchema).length(8)});
export function narration(s:Scene[]){return s.map(x=>x.narration).join("\n\n")}
