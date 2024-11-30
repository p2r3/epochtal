# Migration directory

This directory is where database migrations will be stored. A migration is a breaking change to the database that needs
to be applied programmatically.

To create a migration boilerplate, run `bun run db:createMigration migration/foo`, swapping out `foo` with a name describing
what the migration does. After you've run this, you can edit the file with the necessary migration steps.

To apply migrations, run `bun run db:runMigrations`.

Relevant TypeORM documentation: https://typeorm.io/migrations
