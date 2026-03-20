import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    console.log("Updating trigger to UPSERT on email conflict...");
    try {
        await prisma.$executeRaw`
            CREATE OR REPLACE FUNCTION public.handle_new_user()
            RETURNS trigger
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $function$
            BEGIN
              INSERT INTO public."User" (id, email, password)
              VALUES (
                NEW.id::text, 
                NEW.email,
                'default_oauth_password'
              )
              ON CONFLICT (email) DO UPDATE SET
                id = EXCLUDED.id,
                password = EXCLUDED.password;
              RETURN NEW;
            EXCEPTION WHEN OTHERS THEN
              INSERT INTO public.user_sync_errors (auth_user_id, error_message, error_detail, payload)
              VALUES (NEW.id, SQLERRM, SQLSTATE, row_to_json(NEW));
              RETURN NEW;
            END;
            $function$;
        `;
        console.log("Successfully updated trigger with UPSERT logic!");
    } catch (e) {
        console.error("Failed to update trigger:", e);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
