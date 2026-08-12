import { z } from "zod";
const schema = z.object({ category: z.string(), amount: z.number() });
const schemaWithJSON = schema; // Zod 4 schemas have ~standard
console.log(JSON.stringify(schemaWithJSON['~standard'].jsonSchema.input({ target: "draft-07" }), null, 2));
