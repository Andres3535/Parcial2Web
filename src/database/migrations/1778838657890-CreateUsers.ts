import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1778838657890 implements MigrationInterface {
  name = 'CreateUsers1778838657890';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"user_role_enum\" AS ENUM('admin', 'librarian', 'member')",
    );
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "email" character varying(255) NOT NULL,
        "passwordHash" character varying(255) NOT NULL,
        "firstName" character varying(100) NOT NULL,
        "lastName" character varying(100) NOT NULL,
        "role" "public"."user_role_enum" NOT NULL DEFAULT 'member',
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_users_email"');
    await queryRunner.query('DROP TABLE "users"');
    await queryRunner.query('DROP TYPE "public"."user_role_enum"');
  }
}
