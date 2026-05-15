import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateLoans1778839656689 implements MigrationInterface {
  name = 'CreateLoans1778839656689';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query(
      "CREATE TYPE \"public\".\"loan_status_enum\" AS ENUM('active', 'returned', 'overdue', 'lost')",
    );
    await queryRunner.query(`
      CREATE TABLE "loans" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "itemId" uuid NOT NULL,
        "loanedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "dueAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "returnedAt" TIMESTAMP WITH TIME ZONE,
        "status" "public"."loan_status_enum" NOT NULL DEFAULT 'active',
        "fineAmount" numeric(10,2) NOT NULL DEFAULT '0.00',
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_loans_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_loans_userId_users_id" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
        CONSTRAINT "FK_loans_itemId_items_id" FOREIGN KEY ("itemId") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
      )
    `);
    await queryRunner.query('CREATE INDEX "IDX_loans_item_status" ON "loans" ("itemId", "status")');
    await queryRunner.query('CREATE INDEX "IDX_loans_user_status" ON "loans" ("userId", "status")');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "public"."IDX_loans_user_status"');
    await queryRunner.query('DROP INDEX "public"."IDX_loans_item_status"');
    await queryRunner.query('DROP TABLE "loans"');
    await queryRunner.query('DROP TYPE "public"."loan_status_enum"');
  }
}
