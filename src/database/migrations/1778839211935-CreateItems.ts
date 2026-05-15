import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateItems1778839211935 implements MigrationInterface {
  name = 'CreateItems1778839211935';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"item_type_enum\" AS ENUM('book', 'magazine', 'equipment')",
    );
    await queryRunner.query(`
      CREATE TABLE "items" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(32) NOT NULL,
        "title" character varying(255) NOT NULL,
        "type" "public"."item_type_enum" NOT NULL,
        "isActive" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_items_id" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query('CREATE UNIQUE INDEX "IDX_items_code" ON "items" ("code")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_items_code"');
    await queryRunner.query('DROP TABLE "items"');
    await queryRunner.query('DROP TYPE "public"."item_type_enum"');
  }
}
