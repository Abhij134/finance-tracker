import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log("Applying updated trigger to PostgreSQL database...");

  // This executes the raw SQL directly on Supabase via Prisma 
  await prisma.$executeRawUnsafe(`
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User" (id, email, name, username, "userId", image)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'userId',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;
    `);

  console.log("Trigger successfully updated!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
